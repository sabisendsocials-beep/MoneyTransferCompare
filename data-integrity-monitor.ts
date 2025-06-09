/**
 * Data Integrity Monitor
 * Prevents regression issues during daily incremental loads
 * Monitors and protects Alpha Vantage datasets from deletion or corruption
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and } from 'drizzle-orm';

// Minimum record counts for protected datasets
const PROTECTED_MINIMUMS = {
  'GBP/NGN': 2400,
  'USD/KES': 2700,
  'GBP/KES': 2700,
  'GBP/PKR': 2700,
  'EUR/KES': 2700,
  'EUR/PKR': 2700,
  'USD/GHS': 2700,
  'USD/NGN': 2400
};

export async function monitorDataIntegrity(): Promise<boolean> {
  console.log('Running data integrity check...');
  
  let integrityIssues = 0;
  
  for (const [pair, minCount] of Object.entries(PROTECTED_MINIMUMS)) {
    const [from, to] = pair.split('/');
    
    const count = await db.execute(sql`
      SELECT COUNT(*) as count FROM rate_trends 
      WHERE from_currency = ${from} AND to_currency = ${to} AND source = 'alpha_vantage'
    `);
    
    const currentCount = count.rows[0].count as number;
    
    if (currentCount < minCount) {
      console.error(`INTEGRITY VIOLATION: ${pair} has ${currentCount} records (expected min: ${minCount})`);
      integrityIssues++;
    } else {
      console.log(`✓ ${pair}: ${currentCount} records (protected)`);
    }
  }
  
  if (integrityIssues > 0) {
    console.error(`CRITICAL: ${integrityIssues} integrity violations detected`);
    return false;
  }
  
  console.log('Data integrity check passed - all protected datasets intact');
  return true;
}

// Pre-update validation function
export async function validateBeforeUpdate(fromCurrency: string, toCurrency: string): Promise<boolean> {
  const pair = `${fromCurrency}/${toCurrency}`;
  
  if (!PROTECTED_MINIMUMS[pair]) {
    return true; // Not a protected pair, allow updates
  }
  
  const count = await db.execute(sql`
    SELECT COUNT(*) as count FROM rate_trends 
    WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency} AND source = 'alpha_vantage'
  `);
  
  const currentCount = count.rows[0].count as number;
  const minCount = PROTECTED_MINIMUMS[pair];
  
  if (currentCount < minCount) {
    console.error(`BLOCKED UPDATE: ${pair} has insufficient protected data (${currentCount} < ${minCount})`);
    return false;
  }
  
  return true;
}

// Daily incremental load protection
export async function protectedIncrementalUpdate(fromCurrency: string, toCurrency: string, newData: any[]): Promise<boolean> {
  // Validate before proceeding
  const isValid = await validateBeforeUpdate(fromCurrency, toCurrency);
  if (!isValid) {
    console.error('Update blocked by data protection system');
    return false;
  }
  
  // Only add new data, never delete existing Alpha Vantage records
  const existingDates = await db.execute(sql`
    SELECT DISTINCT date FROM rate_trends 
    WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
  `);
  
  const existingDateSet = new Set(existingDates.rows.map(row => row.date));
  
  // Filter to only truly new data
  const newRecords = newData.filter(record => !existingDateSet.has(record.date));
  
  if (newRecords.length > 0) {
    await db.insert(rateTrends).values(newRecords);
    console.log(`Added ${newRecords.length} new incremental records for ${fromCurrency}/${toCurrency}`);
  }
  
  return true;
}

// Emergency alert system
export async function alertOnIntegrityViolation(): Promise<void> {
  const isIntact = await monitorDataIntegrity();
  
  if (!isIntact) {
    console.error('🚨 DATA INTEGRITY VIOLATION DETECTED 🚨');
    console.error('Automated emergency restoration may be required');
    
    // Log alert for monitoring systems
    const timestamp = new Date().toISOString();
    console.error(`[ALERT] ${timestamp}: Protected dataset corruption detected`);
  }
}

// Export monitoring functions for use in daily jobs
export { PROTECTED_MINIMUMS };