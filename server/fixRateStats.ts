/**
 * This script fixes the getRateStats implementation to work with rate_trends
 * rather than exchangeRates
 */

import { db } from './db';
import { sql } from 'drizzle-orm';
import { RateStats } from '@shared/schema';

/**
 * Gets rate statistics directly from the rate_trends table
 */
export async function getStatsFromTrends(fromCurrency: string, toCurrency: string): Promise<RateStats> {
  try {
    console.log(`Calculating stats for ${fromCurrency} to ${toCurrency}...`);
    
    // Get all trend data for this currency pair, ordered by date
    const trends = await db.execute(sql`
      SELECT date, rate
      FROM rate_trends
      WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
      ORDER BY date ASC
    `);
    
    console.log(`Found ${trends.rows.length} data points`);
    
    // Return empty stats if no data
    if (!trends.rows.length) {
      return {
        thirtyDayHigh: null,
        thirtyDayHighDate: null,
        thirtyDayLow: null,
        thirtyDayLowDate: null,
        thirtyDayAverage: null,
        oneMonthChange: null,
        threeMonthChange: null,
        oneYearChange: null,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Map the data for easier use
    const trendData = trends.rows.map(row => ({
      date: row.date as string,
      rate: row.rate as number
    }));
    
    // Get the latest 30 entries for 30-day calculations
    const last30Days = trendData.slice(-30);
    
    // Calculate 30-day high/low/average
    let thirtyDayHigh = -Infinity;
    let thirtyDayHighDate = '';
    let thirtyDayLow = Infinity;
    let thirtyDayLowDate = '';
    let thirtyDaySum = 0;
    
    for (const point of last30Days) {
      if (point.rate > thirtyDayHigh) {
        thirtyDayHigh = point.rate;
        thirtyDayHighDate = point.date;
      }
      if (point.rate < thirtyDayLow) {
        thirtyDayLow = point.rate;
        thirtyDayLowDate = point.date;
      }
      thirtyDaySum += point.rate;
    }
    
    const thirtyDayAverage = last30Days.length > 0 ? thirtyDaySum / last30Days.length : null;
    
    // Calculate changes: compare first and last values
    const currentRate = trendData[trendData.length - 1].rate;
    
    // Get the rate from 30 days ago (or the first available)
    const oneMonthAgoRate = trendData.length > 30 ? trendData[trendData.length - 31].rate : trendData[0].rate;
    
    // Get the rate from 90 days ago (or the first available)
    const threeMonthAgoRate = trendData.length > 90 ? trendData[trendData.length - 91].rate : trendData[0].rate;
    
    // Get the rate from 365 days ago (or the first available)
    const oneYearAgoRate = trendData.length > 365 ? trendData[trendData.length - 366].rate : trendData[0].rate;
    
    // Calculate percentage changes
    const oneMonthChange = ((currentRate - oneMonthAgoRate) / oneMonthAgoRate) * 100;
    const threeMonthChange = ((currentRate - threeMonthAgoRate) / threeMonthAgoRate) * 100;
    const oneYearChange = ((currentRate - oneYearAgoRate) / oneYearAgoRate) * 100;
    
    return {
      thirtyDayHigh: thirtyDayHigh !== -Infinity ? thirtyDayHigh : null,
      thirtyDayHighDate: thirtyDayHighDate || null,
      thirtyDayLow: thirtyDayLow !== Infinity ? thirtyDayLow : null,
      thirtyDayLowDate: thirtyDayLowDate || null,
      thirtyDayAverage,
      oneMonthChange: isFinite(oneMonthChange) ? oneMonthChange : null,
      threeMonthChange: isFinite(threeMonthChange) ? threeMonthChange : null,
      oneYearChange: isFinite(oneYearChange) ? oneYearChange : null,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error calculating stats for ${fromCurrency}-${toCurrency}:`, error);
    
    // Return empty stats on error
    return {
      thirtyDayHigh: null,
      thirtyDayHighDate: null,
      thirtyDayLow: null,
      thirtyDayLowDate: null,
      thirtyDayAverage: null,
      oneMonthChange: null,
      threeMonthChange: null,
      oneYearChange: null,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Test function to run the stats calculation for a currency pair
async function testStats() {
  const pairs = [
    { from: 'GBP', to: 'NGN' },
    { from: 'EUR', to: 'NGN' },
    { from: 'GBP', to: 'GHS' },
    { from: 'EUR', to: 'GHS' }
  ];
  
  console.log('Testing new getRateStats implementation...');
  
  for (const pair of pairs) {
    console.log(`\nTesting ${pair.from} to ${pair.to}...`);
    const stats = await getStatsFromTrends(pair.from, pair.to);
    
    console.log('Results:');
    console.log('  30-day high:', stats.thirtyDayHigh);
    console.log('  30-day high date:', stats.thirtyDayHighDate);
    console.log('  30-day low:', stats.thirtyDayLow);
    console.log('  30-day low date:', stats.thirtyDayLowDate);
    console.log('  30-day average:', stats.thirtyDayAverage);
    console.log('  1-month change:', stats.oneMonthChange, '%');
    console.log('  3-month change:', stats.threeMonthChange, '%');
    console.log('  1-year change:', stats.oneYearChange, '%');
  }
  
  console.log('\nTesting complete');
  return true;
}

// Run the test if executed directly
if (process.argv[1].endsWith('fixRateStats.ts')) {
  testStats()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error running tests:', error);
      process.exit(1);
    });
}