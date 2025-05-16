import { db } from './db';
import { sql } from 'drizzle-orm';
import { fetchHistoricalRates } from './api/exchangeRateApi';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Prints the current state of the rate trends database table
 */
async function printRateTrendData() {
  try {
    console.log('Analyzing rate_trends table...');
    
    // Check table structure
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'rate_trends';
    `);
    
    console.log('Table structure:');
    console.table(tableInfo.rows);
    
    // Count trends by currency pair
    const trendCount = await db.execute(sql`
      SELECT from_currency, to_currency, COUNT(*) as count
      FROM rate_trends
      GROUP BY from_currency, to_currency;
    `);
    
    console.log('Trend counts by currency pair:');
    console.table(trendCount.rows);
    
    // Get sample of actual data for each pair
    const pairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'EUR', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'GHS' }
    ];
    
    for (const pair of pairs) {
      const { from, to } = pair;
      
      const data = await db.select()
        .from(schema.rateTrends)
        .where(
          and(
            eq(schema.rateTrends.from_currency, from),
            eq(schema.rateTrends.to_currency, to)
          )
        )
        .orderBy(schema.rateTrends.date)
        .limit(5);
      
      if (data.length > 0) {
        console.log(`\nSample data for ${from}/${to} (showing ${data.length} records):`);
        console.table(data);
      } else {
        console.log(`\nNo data for ${from}/${to}`);
      }
    }
    
    // Check rate_cache table
    const cacheInfo = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'rate_cache';
    `);
    
    console.log('\nRate cache table structure:');
    console.table(cacheInfo.rows);
    
    const cacheData = await db.select().from(schema.rateCache);
    
    console.log('\nRate cache data:');
    console.table(cacheData);
    
  } catch (error) {
    console.error('Error analyzing trend data:', error);
  }
}

/**
 * Forces an immediate refresh of rate trend data regardless of cache status
 */
async function forceRateTrendRefresh() {
  try {
    // Define the currency pairs we need to update trends for
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'EUR', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'GHS' }
    ];
    
    console.log('==== Starting forced rate trends update ====');
    
    // Delete all existing rate trends to start fresh
    await db.delete(schema.rateTrends);
    console.log('Deleted all existing rate trends');
    
    // Delete all cache entries to force refresh
    await db.delete(schema.rateCache);
    console.log('Deleted all rate cache entries');
    
    // Process each currency pair
    for (const pair of currencyPairs) {
      const { from, to } = pair;
      console.log(`Refreshing trends for ${from} to ${to}...`);
      
      // Fetch historical rates (30 days)
      const trends = await fetchHistoricalRates(from, to, 30);
      
      if (trends && trends.length > 0) {
        // Insert new trends as a batch
        const trendValues = trends.map(trend => {
          // Convert the date string to a format that works with SQL
          const dateStr = trend.date.split('T')[0]; // Ensure format is YYYY-MM-DD
          
          return {
            from_currency: from,
            to_currency: to,
            date: dateStr, // Use the string format which gets converted by Drizzle
            rate: trend.rate
          };
        });
        
        // Insert the batch of trends
        await db.insert(schema.rateTrends).values(trendValues);
        
        // Create new cache entry
        await db.insert(schema.rateCache).values({
          from_currency: from,
          to_currency: to,
          last_updated: new Date()
        });
        
        console.log(`✅ Inserted ${trends.length} trend data points for ${from}/${to}`);
        
        // Log first and last point
        if (trends.length > 1) {
          console.log(`  First point: ${trends[0].date} - ${trends[0].rate}`);
          console.log(`  Last point: ${trends[trends.length-1].date} - ${trends[trends.length-1].rate}`);
        }
      } else {
        console.warn(`⚠️ No trend data retrieved for ${from}/${to}`);
      }
    }
    
    console.log('==== Forced rate trends update complete ====');
  } catch (error) {
    console.error('Error in forceRateTrendRefresh:', error);
  }
}

// Run both functions
async function main() {
  // Print current state before refresh
  console.log('CURRENT STATE BEFORE REFRESH:');
  await printRateTrendData();
  
  // Force refresh
  console.log('\n\nFORCING REFRESH:');
  await forceRateTrendRefresh();
  
  // Print state after refresh
  console.log('\n\nFINAL STATE AFTER REFRESH:');
  await printRateTrendData();
  
  console.log('\nDebug complete!');
  process.exit(0);
}

main().catch(console.error);