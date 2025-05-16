import { db } from './db';
import { fetchHistoricalRates } from './api/exchangeRateApi';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Loads trend data for a specific currency pair and stores it in the database
 */
export async function loadTrendData(fromCurrency: string, toCurrency: string, days: number = 30) {
  console.log(`Loading ${days} days of trend data for ${fromCurrency}/${toCurrency}...`);
  
  try {
    // Fetch data from API
    const trends = await fetchHistoricalRates(fromCurrency, toCurrency, days);
    
    if (trends && trends.length > 0) {
      console.log(`Retrieved ${trends.length} trend data points from API for ${fromCurrency}/${toCurrency}`);
      
      // Begin a transaction to update the database
      await db.transaction(async (tx) => {
        // Delete existing trends for this currency pair
        await tx.delete(schema.rateTrends)
          .where(
            and(
              eq(schema.rateTrends.from_currency, fromCurrency),
              eq(schema.rateTrends.to_currency, toCurrency)
            )
          );
        
        // Insert the new trends
        const trendValues = trends.map(trend => {
          // Convert the date string to a format that works with SQL
          const dateStr = trend.date.split('T')[0]; // Ensure format is YYYY-MM-DD
          
          return {
            from_currency: fromCurrency,
            to_currency: toCurrency,
            date: dateStr,
            rate: trend.rate
          };
        });
        
        await tx.insert(schema.rateTrends).values(trendValues);
        
        // Update the cache entry or create a new one
        const existingCache = await tx.select()
          .from(schema.rateCache)
          .where(
            and(
              eq(schema.rateCache.from_currency, fromCurrency),
              eq(schema.rateCache.to_currency, toCurrency)
            )
          );
        
        if (existingCache.length > 0) {
          await tx.update(schema.rateCache)
            .set({ last_updated: new Date() })
            .where(
              and(
                eq(schema.rateCache.from_currency, fromCurrency),
                eq(schema.rateCache.to_currency, toCurrency)
              )
            );
        } else {
          await tx.insert(schema.rateCache).values({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            last_updated: new Date()
          });
        }
      });
      
      console.log(`Successfully stored ${trends.length} trend data points for ${fromCurrency}/${toCurrency}`);
      return true;
    } else {
      console.warn(`No trend data retrieved from API for ${fromCurrency}/${toCurrency}`);
      return false;
    }
  } catch (error) {
    console.error(`Error loading trend data for ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

/**
 * Loads trend data for all supported currency pairs
 */
export async function loadAllTrendData() {
  const currencyPairs = [
    { from: 'GBP', to: 'NGN' },
    { from: 'EUR', to: 'NGN' },
    { from: 'GBP', to: 'GHS' },
    { from: 'EUR', to: 'GHS' }
  ];
  
  console.log('=== Starting trend data load for all currency pairs ===');
  
  for (const pair of currencyPairs) {
    await loadTrendData(pair.from, pair.to);
  }
  
  console.log('=== Completed trend data load for all currency pairs ===');
}

// If this script is run directly, load data for all pairs
// For ESM modules, we need a different approach than require.main === module
// Check if this file is being executed directly
if (process.argv[1].endsWith('loadTrendData.ts')) {
  loadAllTrendData()
    .then(() => {
      console.log('Trend data load complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error loading trend data:', error);
      process.exit(1);
    });
}