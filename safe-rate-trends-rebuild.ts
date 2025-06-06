/**
 * Safe Rate Trends Rebuilder
 * Rebuilds rate trends using existing authentic exchange rate data
 * Ensures daily incremental updates without truncating existing history
 */

import { db } from './server/db';
import { rateTrends, exchangeRates } from './shared/schema';
import { sql, and, eq, gte, desc } from 'drizzle-orm';

/**
 * Check if rate trend data exists for a specific date
 */
async function dateExists(fromCurrency: string, toCurrency: string, date: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1 FROM rate_trends 
    WHERE from_currency = ${fromCurrency} 
    AND to_currency = ${toCurrency} 
    AND date = ${date}
    LIMIT 1
  `);
  
  return result.rows.length > 0;
}

/**
 * Rebuild GBP/NGN rate trends from authentic exchange rate data
 * Uses only verified data that already exists in the database
 */
async function rebuildGbpNgnTrends(): Promise<void> {
  console.log('Starting safe GBP/NGN rate trends rebuild from existing authentic data...');
  
  try {
    // Get daily averages from existing exchange rate data
    const dailyRates = await db.execute(sql`
      SELECT 
        DATE(timestamp) as date,
        from_currency,
        to_currency,
        AVG(rate) as rate,
        COUNT(*) as data_points
      FROM exchange_rates 
      WHERE from_currency = 'GBP' 
      AND to_currency = 'NGN'
      AND rate > 1000 
      AND rate < 5000
      GROUP BY DATE(timestamp), from_currency, to_currency
      HAVING COUNT(*) >= 3
      ORDER BY date ASC
    `);
    
    console.log(`Found ${dailyRates.rows.length} days with authentic rate data`);
    
    if (dailyRates.rows.length === 0) {
      console.error('No suitable exchange rate data found for GBP/NGN');
      return;
    }
    
    let insertedCount = 0;
    
    for (const row of dailyRates.rows) {
      const dateStr = row.date as string;
      const rate = parseFloat(row.rate as string);
      
      // Check if this date already exists
      const exists = await dateExists('GBP', 'NGN', dateStr);
      
      if (!exists && !isNaN(rate) && rate > 0) {
        try {
          await db.insert(rateTrends).values({
            date: dateStr,
            from_currency: 'GBP',
            to_currency: 'NGN',
            rate: rate
          });
          insertedCount++;
          console.log(`Added trend data for ${dateStr}: ${rate.toFixed(4)}`);
        } catch (error) {
          console.error(`Error inserting data for ${dateStr}:`, error);
        }
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} new rate trend data points for GBP/NGN`);
    console.log('Safe rate trends rebuild completed successfully');
    
  } catch (error) {
    console.error('Error rebuilding rate trends:', error);
    throw error;
  }
}

/**
 * Daily incremental update function
 * Adds only new data without affecting existing history
 */
async function dailyIncrementalUpdate(): Promise<void> {
  console.log('Running daily incremental update for rate trends...');
  
  try {
    // Get the latest date in our rate_trends database
    const latestResult = await db.execute(sql`
      SELECT MAX(date) as latest_date 
      FROM rate_trends 
      WHERE from_currency = 'GBP' AND to_currency = 'NGN'
    `);
    
    const latestDate = latestResult.rows[0]?.latest_date as string;
    console.log(`Latest date in rate trends: ${latestDate}`);
    
    // Get new daily rates after the latest date
    const newDailyRates = await db.execute(sql`
      SELECT 
        DATE(timestamp) as date,
        from_currency,
        to_currency,
        AVG(rate) as rate,
        COUNT(*) as data_points
      FROM exchange_rates 
      WHERE from_currency = 'GBP' 
      AND to_currency = 'NGN'
      AND rate > 1000 
      AND rate < 5000
      ${latestDate ? sql`AND DATE(timestamp) > ${latestDate}` : sql``}
      GROUP BY DATE(timestamp), from_currency, to_currency
      HAVING COUNT(*) >= 1
      ORDER BY date ASC
    `);
    
    if (newDailyRates.rows.length === 0) {
      console.log('No new rate data available for incremental update');
      return;
    }
    
    console.log(`Found ${newDailyRates.rows.length} new days to add`);
    
    let insertedCount = 0;
    
    for (const row of newDailyRates.rows) {
      const dateStr = row.date as string;
      const rate = parseFloat(row.rate as string);
      
      // Double-check that this date doesn't exist
      const exists = await dateExists('GBP', 'NGN', dateStr);
      
      if (!exists && !isNaN(rate) && rate > 0) {
        try {
          await db.insert(rateTrends).values({
            date: dateStr,
            from_currency: 'GBP',
            to_currency: 'NGN',
            rate: rate
          });
          insertedCount++;
          console.log(`Added incremental trend data for ${dateStr}: ${rate.toFixed(4)}`);
        } catch (error) {
          console.error(`Error inserting incremental data for ${dateStr}:`, error);
        }
      }
    }
    
    console.log(`Daily incremental update completed: ${insertedCount} new data points added`);
    
  } catch (error) {
    console.error('Error in daily incremental update:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const operation = process.argv[2];
  
  if (operation === 'rebuild') {
    await rebuildGbpNgnTrends();
  } else if (operation === 'daily') {
    await dailyIncrementalUpdate();
  } else {
    console.log('Usage: npx tsx safe-rate-trends-rebuild.ts [rebuild|daily]');
    console.log('  rebuild - Safe rebuild of GBP/NGN rate trends from existing data');
    console.log('  daily   - Daily incremental update (safe, preserves history)');
    process.exit(1);
  }
  
  process.exit(0);
}

// Auto-run if called directly
main().catch(console.error);

export { rebuildGbpNgnTrends, dailyIncrementalUpdate };