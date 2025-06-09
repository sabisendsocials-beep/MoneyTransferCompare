/**
 * Daily Integrity Protection for Rate Trends
 * Ensures no regression during daily incremental loads
 * Integrates with existing daily update scheduler
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and, isNull } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Protected currency pairs with minimum record counts
const PROTECTED_PAIRS = {
  'GBP/NGN': { min: 2400, from: 'GBP', to: 'NGN' },
  'USD/KES': { min: 2700, from: 'USD', to: 'KES' },
  'GBP/KES': { min: 2700, from: 'GBP', to: 'KES' },
  'GBP/PKR': { min: 2700, from: 'GBP', to: 'PKR' },
  'EUR/KES': { min: 2700, from: 'EUR', to: 'KES' },
  'EUR/PKR': { min: 2700, from: 'EUR', to: 'PKR' },
  'USD/GHS': { min: 2700, from: 'USD', to: 'GHS' },
  'USD/NGN': { min: 2400, from: 'USD', to: 'NGN' }
};

export async function dailyIntegrityCheck(): Promise<boolean> {
  console.log('Daily integrity check starting...');
  
  let violations = 0;
  
  for (const [pairName, config] of Object.entries(PROTECTED_PAIRS)) {
    const count = await db.execute(sql`
      SELECT COUNT(*) as count FROM rate_trends 
      WHERE from_currency = ${config.from} AND to_currency = ${config.to} AND source = 'alpha_vantage'
    `);
    
    const currentCount = count.rows[0].count as number;
    
    if (currentCount < config.min) {
      console.error(`VIOLATION: ${pairName} has ${currentCount} records (expected min: ${config.min})`);
      violations++;
      
      // Auto-restore if Alpha Vantage API is available
      if (ALPHA_VANTAGE_API_KEY) {
        console.log(`Auto-restoring ${pairName}...`);
        await autoRestore(config.from, config.to);
      }
    }
  }
  
  if (violations === 0) {
    console.log('Daily integrity check passed - all protected datasets intact');
  }
  
  return violations === 0;
}

async function autoRestore(fromCurrency: string, toCurrency: string): Promise<void> {
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Time Series FX (Daily)']) {
      // Clear any non-Alpha Vantage data for this pair
      await db.delete(rateTrends).where(
        and(
          eq(rateTrends.from_currency, fromCurrency),
          eq(rateTrends.to_currency, toCurrency),
          isNull(rateTrends.source)
        )
      );
      
      const timeSeries = data['Time Series FX (Daily)'];
      const records = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        date,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: parseFloat(values['4. close']),
        source: 'alpha_vantage'
      }));
      
      // Insert in batches
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(rateTrends).values(batch).onConflictDoNothing();
      }
      
      console.log(`Auto-restored ${records.length} records for ${fromCurrency}/${toCurrency}`);
    }
  } catch (error) {
    console.error(`Auto-restore failed for ${fromCurrency}/${toCurrency}:`, error);
  }
}

// Safe incremental update that preserves Alpha Vantage data
export async function safeIncrementalUpdate(fromCurrency: string, toCurrency: string, newRates: any[]): Promise<boolean> {
  // Check if this is a protected pair
  const pairKey = `${fromCurrency}/${toCurrency}`;
  const isProtected = PROTECTED_PAIRS[pairKey];
  
  if (isProtected) {
    // Verify minimum count before allowing updates
    const count = await db.execute(sql`
      SELECT COUNT(*) as count FROM rate_trends 
      WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency} AND source = 'alpha_vantage'
    `);
    
    const currentCount = count.rows[0].count as number;
    
    if (currentCount < isProtected.min) {
      console.error(`Blocked update for ${pairKey} - insufficient protected data (${currentCount} < ${isProtected.min})`);
      return false;
    }
  }
  
  // Only insert new data, never delete existing Alpha Vantage records
  const filteredRates = newRates.filter(rate => rate.source !== 'alpha_vantage');
  
  if (filteredRates.length > 0) {
    // Get existing dates to avoid duplicates
    const existingDates = await db.execute(sql`
      SELECT DISTINCT date FROM rate_trends 
      WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
    `);
    
    const dateSet = new Set(existingDates.rows.map(row => row.date));
    const newRecords = filteredRates.filter(rate => !dateSet.has(rate.date));
    
    if (newRecords.length > 0) {
      await db.insert(rateTrends).values(newRecords);
      console.log(`Added ${newRecords.length} new incremental records for ${fromCurrency}/${toCurrency}`);
    }
  }
  
  return true;
}

// Integration with daily scheduler
export async function runDailyProtectedUpdate(): Promise<void> {
  console.log('Running daily protected update process...');
  
  // First, check data integrity
  const integrityOk = await dailyIntegrityCheck();
  
  if (!integrityOk) {
    console.error('Integrity violations detected and auto-restored');
  }
  
  // Run the daily Alpha Vantage incremental update
  if (ALPHA_VANTAGE_API_KEY) {
    const { runDailyAlphaVantageUpdate } = await import('./automated-daily-alpha-vantage-updater');
    await runDailyAlphaVantageUpdate();
  }
  
  // Final integrity verification
  await dailyIntegrityCheck();
  
  console.log('Daily protected update completed');
}