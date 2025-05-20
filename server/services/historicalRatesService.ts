/**
 * Historical Exchange Rates Service
 * 
 * This service handles fetching, storing, and retrieving historical exchange rate data
 * from ExchangeRate-API, storing it in our database, and providing it to the frontend.
 */

import { db } from '../db';
import { rateTrends, rateCache } from '@shared/schema';
import { sql } from 'drizzle-orm';
import fetch from 'node-fetch';

// Currency pairs we track
const CURRENCY_PAIRS = [
  { from: 'GBP', to: 'NGN' },
  { from: 'EUR', to: 'NGN' },
  { from: 'GBP', to: 'GHS' },
  { from: 'EUR', to: 'GHS' }
];

// API configuration
const API_KEY = process.env.EXCHANGE_API_KEY;
const API_BASE_URL = 'https://api.exchangerate.host';

interface HistoricalRateResponse {
  success: boolean;
  base: string;
  rates: Record<string, number>;
  date: string;
  [key: string]: any;
}

/**
 * Fetches historical exchange rate data for a specific date
 */
async function fetchHistoricalRate(
  baseCurrency: string,
  targetCurrency: string,
  date: string
): Promise<number | null> {
  if (!API_KEY) {
    console.error('Missing EXCHANGE_API_KEY environment variable');
    return null;
  }

  try {
    const url = `${API_BASE_URL}/${date}?base=${baseCurrency}&symbols=${targetCurrency}&access_key=${API_KEY}`;
    console.log(`Fetching historical rate for ${baseCurrency}/${targetCurrency} on ${date}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data: HistoricalRateResponse = await response.json();
    
    if (!data.success) {
      console.error(`API returned error: ${JSON.stringify(data)}`);
      return null;
    }
    
    // Extract the exchange rate for the target currency
    const rate = data.rates[targetCurrency];
    
    if (!rate) {
      console.error(`No rate found for ${targetCurrency}`);
      return null;
    }
    
    return rate;
  } catch (error) {
    console.error(`Error fetching historical rate: ${error}`);
    return null;
  }
}

/**
 * Fetches historical rates for a specified date range
 */
async function fetchHistoricalRates(
  fromCurrency: string,
  toCurrency: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; rate: number }>> {
  const results: Array<{ date: string; rate: number }> = [];
  const currentDate = new Date(startDate);
  
  // Process one day at a time to ensure we handle API rate limits properly
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const rate = await fetchHistoricalRate(fromCurrency, toCurrency, dateStr);
    
    if (rate) {
      results.push({ date: dateStr, rate });
    }
    
    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Add a small delay between requests to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

/**
 * Stores historical rate data in the database
 */
async function storeHistoricalRates(
  fromCurrency: string,
  toCurrency: string,
  rates: Array<{ date: string; rate: number }>
): Promise<boolean> {
  try {
    // First delete any existing records for this currency pair in the date range
    // to avoid duplicates
    const dates = rates.map(r => r.date);
    
    if (dates.length > 0) {
      await db.execute(sql`
        DELETE FROM rate_trends 
        WHERE from_currency = ${fromCurrency} 
        AND to_currency = ${toCurrency}
        AND date IN (${sql.join(dates, sql`, `)})
      `);
    }
    
    // Now insert the new records
    for (const { date, rate } of rates) {
      await db.execute(sql`
        INSERT INTO rate_trends (from_currency, to_currency, date, rate, source)
        VALUES (${fromCurrency}, ${toCurrency}, ${date}, ${rate}, 'api')
      `);
    }
    
    // Update the rate cache to mark data as fresh
    const cacheEntry = await db.select()
      .from(rateCache)
      .where(sql`from_currency = ${fromCurrency} AND to_currency = ${toCurrency}`);
    
    if (cacheEntry.length > 0) {
      await db.execute(sql`
        UPDATE rate_cache
        SET last_updated = NOW()
        WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO rate_cache (from_currency, to_currency, last_updated)
        VALUES (${fromCurrency}, ${toCurrency}, NOW())
      `);
    }
    
    return true;
  } catch (error) {
    console.error(`Error storing historical rates: ${error}`);
    return false;
  }
}

/**
 * Gets historical rate data for a specific currency pair and time period
 */
async function getHistoricalRates(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30
): Promise<Array<{ date: string; rate: number; from_currency: string; to_currency: string }>> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Check if we have data in the database
    const existingData = await db.execute(sql`
      SELECT date, rate, from_currency, to_currency
      FROM rate_trends
      WHERE from_currency = ${fromCurrency}
      AND to_currency = ${toCurrency}
      AND date >= ${startDateStr}
      AND date <= ${endDateStr}
      ORDER BY date ASC
    `);
    
    if (existingData.rows.length > 0) {
      console.log(`Using cached rate trend data for ${fromCurrency}/${toCurrency}`);
      return existingData.rows as any[];
    }
    
    // If we don't have data, fetch it from the API
    console.log(`No cached data found for ${fromCurrency}/${toCurrency}, fetching from API...`);
    const apiData = await fetchHistoricalRates(fromCurrency, toCurrency, startDate, endDate);
    
    if (apiData.length > 0) {
      // Store the data in the database
      await storeHistoricalRates(fromCurrency, toCurrency, apiData);
      
      // Return the data with the expected format
      return apiData.map(item => ({
        date: item.date,
        rate: item.rate,
        from_currency: fromCurrency,
        to_currency: toCurrency
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting historical rates: ${error}`);
    return [];
  }
}

/**
 * Updates historical rate data for all tracked currency pairs
 */
async function updateAllHistoricalRates(days: number = 90): Promise<boolean> {
  console.log(`Updating historical rates for ${CURRENCY_PAIRS.length} currency pairs (${days} days)...`);
  
  let successCount = 0;
  
  for (const pair of CURRENCY_PAIRS) {
    try {
      console.log(`Updating historical rates for ${pair.from}/${pair.to}...`);
      
      // Get the end date (today)
      const endDate = new Date();
      
      // Get the start date (days ago)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Fetch rates from the API
      const rates = await fetchHistoricalRates(pair.from, pair.to, startDate, endDate);
      
      if (rates.length > 0) {
        // Store the rates in the database
        await storeHistoricalRates(pair.from, pair.to, rates);
        
        console.log(`Successfully updated ${rates.length} historical rates for ${pair.from}/${pair.to}`);
        successCount++;
      } else {
        console.warn(`No historical rates found for ${pair.from}/${pair.to}`);
      }
    } catch (error) {
      console.error(`Error updating historical rates for ${pair.from}/${pair.to}: ${error}`);
    }
    
    // Add a delay between currency pairs to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`Historical rate update completed: ${successCount}/${CURRENCY_PAIRS.length} successful`);
  
  return successCount > 0;
}

/**
 * Checks if we need to refresh historical rate data
 */
async function shouldRefreshHistoricalRates(fromCurrency: string, toCurrency: string): Promise<boolean> {
  try {
    // Check if we have a cache entry for this currency pair
    const cacheEntry = await db.select()
      .from(rateCache)
      .where(sql`from_currency = ${fromCurrency} AND to_currency = ${toCurrency}`);
    
    if (cacheEntry.length === 0) {
      // No cache entry, we should refresh
      return true;
    }
    
    // Check if the cache entry is older than 8 hours
    const lastUpdated = new Date(cacheEntry[0].last_updated);
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    return hours > 8;
  } catch (error) {
    console.error(`Error checking if we should refresh historical rates: ${error}`);
    return true;
  }
}

/**
 * Incremental update of historical rates
 * Only updates the most recent days to avoid excessive API calls
 */
async function updateRecentHistoricalRates(days: number = 5): Promise<boolean> {
  console.log(`Performing incremental update of historical rates (${days} recent days)...`);
  
  // Use a shorter timeframe for incremental updates
  return updateAllHistoricalRates(days);
}

// Export the public functions
export {
  getHistoricalRates,
  updateAllHistoricalRates,
  updateRecentHistoricalRates,
  shouldRefreshHistoricalRates
};