/**
 * Historical Rates Service
 * 
 * This service centralizes all operations related to historical exchange rate data.
 * It handles fetching, storing, and retrieving historical rates for currency pairs.
 */

import { rateTrends } from '@shared/schema';
import { db } from '../db';
import { and, eq, sql } from 'drizzle-orm';
import { subDays, format } from 'date-fns';
import type { RateTrendResponse } from '@shared/schema';

// Currency pairs we want to track
const CURRENCY_PAIRS = [
  { from: 'GBP', to: 'NGN' },
  { from: 'EUR', to: 'NGN' },
  { from: 'GBP', to: 'GHS' },
  { from: 'EUR', to: 'GHS' }
];

/**
 * Gets historical exchange rate data for a currency pair.
 * First checks the database for cached data, then falls back to the API if needed.
 */
async function getHistoricalRates(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30
): Promise<RateTrendResponse[]> {
  console.log(`Getting historical rates for ${fromCurrency}/${toCurrency} (${days} days)`);
  
  try {
    // First try to get data from the database
    const startDate = subDays(new Date(), days);
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    
    const dbRates = await db.select()
      .from(rateTrends)
      .where(
        and(
          eq(rateTrends.from_currency, fromCurrency),
          eq(rateTrends.to_currency, toCurrency),
          sql`${rateTrends.date} >= ${formattedStartDate}`
        )
      )
      .orderBy(rateTrends.date);
    
    if (dbRates && dbRates.length > 0) {
      console.log(`Found ${dbRates.length} historical rates in database`);
      
      // Convert database records to API response format
      const trends: RateTrendResponse[] = dbRates.map(trend => ({
        date: trend.date,
        rate: trend.rate,
        from_currency: trend.from_currency,
        to_currency: trend.to_currency
      }));
      
      return trends;
    }
    
    // If no database data, try to fetch from API
    console.log(`No historical data in database, fetching from API`);
    const { fetchHistoricalRates, storeHistoricalRates } = await import('./exchangeRateApiService');
    
    const apiRates = await fetchHistoricalRates(fromCurrency, toCurrency, days);
    
    if (apiRates && apiRates.length > 0) {
      console.log(`Successfully fetched ${apiRates.length} historical rates from API`);
      
      // Store in database for future use
      await storeHistoricalRates(apiRates);
      
      return apiRates;
    }
    
    // No data available
    console.warn(`Could not get historical rate data for ${fromCurrency}/${toCurrency}`);
    return [];
  } catch (error) {
    console.error(`Error getting historical rates: ${error}`);
    return [];
  }
}

/**
 * Check if any tracked currency pairs need historical data refreshed
 * and update them if needed.
 */
async function updateHistoricalRatesIfNeeded(): Promise<void> {
  try {
    console.log(`Checking if any currency pairs need historical data refresh...`);
    
    // Get exchange rate API service
    const { fetchHistoricalRates, storeHistoricalRates } = await import('./exchangeRateApiService');
    
    for (const pair of CURRENCY_PAIRS) {
      try {
        // Check if the data is recent enough
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Check if we have recent data in the database
        const { db } = await import('../db');
        const { rateCache } = await import('@shared/schema');
        const { eq, and, sql } = await import('drizzle-orm');
        
        const cacheEntry = await db.select()
          .from(rateCache)
          .where(
            and(
              eq(rateCache.from_currency, pair.from),
              eq(rateCache.to_currency, pair.to)
            )
          );
          
        const needsRefresh = !cacheEntry.length || 
                            new Date(cacheEntry[0].last_updated) < oneWeekAgo;
        
        if (needsRefresh) {
          console.log(`Refreshing historical data for ${pair.from}/${pair.to}`);
          // Fetch the most recent 7 days of data
          const recentRates = await fetchHistoricalRates(pair.from, pair.to, 7);
          
          if (recentRates && recentRates.length > 0) {
            // Store the updated rates
            await storeHistoricalRates(recentRates);
            console.log(`Updated ${recentRates.length} historical rate points for ${pair.from}/${pair.to}`);
          }
        } else {
          console.log(`Historical data for ${pair.from}/${pair.to} is up to date`);
        }
      } catch (error) {
        console.error(`Error checking/updating ${pair.from}/${pair.to}: ${error}`);
      }
    }
  } catch (error) {
    console.error(`Error updating historical rates: ${error}`);
  }
}

/**
 * Initialize the historical rates service on application startup.
 * This performs a check and updates any missing data.
 */
async function initializeHistoricalRates(): Promise<void> {
  console.log('Initializing historical rates service...');
  
  try {
    // Start the scheduler
    const { scheduleHistoricalRateUpdates } = await import('../scheduler/historicalRateScheduler');
    scheduleHistoricalRateUpdates();
    
    // Check if we need to populate historical data
    const countQuery = await db.select({ count: sql`COUNT(*)` }).from(rateTrends);
    const countValue = countQuery[0]?.count;
    const count = typeof countValue === 'number' ? countValue : 
                typeof countValue === 'string' ? parseInt(countValue) : 0;
    
    // Count data points per currency pair to see if we have enough historical data
    let hasFullYearData = true;
    
    for (const pair of CURRENCY_PAIRS) {
      const pairData = await db.select({ count: sql`COUNT(*)` })
        .from(rateTrends)
        .where(
          and(
            eq(rateTrends.from_currency, pair.from),
            eq(rateTrends.to_currency, pair.to)
          )
        );
      
      const pairCountValue = pairData[0]?.count;
      const pairCount = typeof pairCountValue === 'number' ? pairCountValue : 
                      typeof pairCountValue === 'string' ? parseInt(pairCountValue) : 0;
      console.log(`Found ${pairCount} historical data points for ${pair.from}/${pair.to}`);
      
      // We need at least 300 data points for a full year
      if (pairCount < 300) {
        hasFullYearData = false;
      }
    }
    
    if (!hasFullYearData) {
      console.log('Insufficient historical data found, generating full year dataset...');
      
      // Use our data generator to create a full year of data
      const { populateYearOfHistoricalData } = await import('../generateHistoricalData');
      await populateYearOfHistoricalData();
      
      console.log('Full year of historical data has been generated');
    } else {
      console.log(`Found sufficient historical rate records, checking for recent updates...`);
      
      // Try to get the most recent real API data to keep the dataset current
      const { fetchHistoricalRates, storeHistoricalRates } = await import('./exchangeRateApiService');
      
      // Only update the most recent 30 days from the API
      for (const pair of CURRENCY_PAIRS) {
        try {
          console.log(`Updating recent historical data for ${pair.from}/${pair.to}...`);
          const recentRates = await fetchHistoricalRates(pair.from, pair.to, 30);
          
          if (recentRates && recentRates.length > 0) {
            await storeHistoricalRates(recentRates);
            console.log(`Updated ${recentRates.length} recent rates for ${pair.from}/${pair.to}`);
          }
        } catch (error) {
          console.error(`Error updating recent data for ${pair.from}/${pair.to}: ${error}`);
        }
      }
    }
    
    console.log('Historical rates service initialized successfully');
  } catch (error) {
    console.error(`Error initializing historical rates service: ${error}`);
  }
}

export {
  getHistoricalRates,
  updateHistoricalRatesIfNeeded,
  initializeHistoricalRates
};