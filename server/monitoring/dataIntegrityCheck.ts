/**
 * Data Integrity Monitoring System
 * Monitors rate trend data health and alerts on anomalies
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

interface DataHealthReport {
  totalPairs: number;
  healthyPairs: number;
  criticalPairs: string[];
  warnings: string[];
  lastChecked: string;
}

const EXPECTED_CURRENCY_PAIRS = [
  'GBP-NGN', 'EUR-NGN', 'USD-NGN',
  'GBP-GHS', 'EUR-GHS', 'USD-GHS', 
  'GBP-INR', 'EUR-INR', 'USD-INR',
  'GBP-KES', 'EUR-KES', 'USD-KES',
  'GBP-PKR', 'EUR-PKR', 'USD-PKR'
];

export async function checkDataIntegrity(): Promise<DataHealthReport> {
  const report: DataHealthReport = {
    totalPairs: EXPECTED_CURRENCY_PAIRS.length,
    healthyPairs: 0,
    criticalPairs: [],
    warnings: [],
    lastChecked: new Date().toISOString()
  };

  try {
    // Check each currency pair's data health
    for (const pairStr of EXPECTED_CURRENCY_PAIRS) {
      const [from, to] = pairStr.split('-');
      
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_records,
          MIN(date) as earliest_date,
          MAX(date) as latest_date
        FROM rate_trends 
        WHERE from_currency = ${from} AND to_currency = ${to}
      `);
      
      const data = result.rows[0];
      const recordCount = parseInt(String(data.total_records));
      
      if (recordCount === 0) {
        report.criticalPairs.push(`${pairStr}: No data available`);
      } else if (recordCount < 30) {
        report.criticalPairs.push(`${pairStr}: Only ${recordCount} records (insufficient for charts)`);
      } else if (recordCount < 365) {
        report.warnings.push(`${pairStr}: ${recordCount} records (limited historical data)`);
        report.healthyPairs++;
      } else {
        report.healthyPairs++;
      }
    }

    // Log the report
    console.log('=== Data Integrity Report ===');
    console.log(`Healthy pairs: ${report.healthyPairs}/${report.totalPairs}`);
    
    if (report.criticalPairs.length > 0) {
      console.log('CRITICAL ISSUES:');
      report.criticalPairs.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (report.warnings.length > 0) {
      console.log('WARNINGS:');
      report.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

  } catch (error) {
    console.error('Error checking data integrity:', error);
    report.warnings.push(`System error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return report;
}

export async function scheduleDataIntegrityChecks(): Promise<void> {
  // Run check every 6 hours
  setInterval(async () => {
    const report = await checkDataIntegrity();
    
    if (report.criticalPairs.length > 0) {
      console.error('DATA INTEGRITY ALERT: Critical issues detected');
      console.error('Critical pairs:', report.criticalPairs);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  // Run initial check
  console.log('Starting data integrity monitoring...');
  await checkDataIntegrity();
}