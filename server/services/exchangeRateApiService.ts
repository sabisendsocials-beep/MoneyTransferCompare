/**
 * Exchange Rate API Service
 * 
 * This service handles fetching real historical exchange rate data from ExchangeRate-API.
 * It caches the data in our database for optimal performance.
 */

import { db } from '../db';
import { rateTrends, rateCache } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { subDays, format } from 'date-fns';

// Currency pairs we want to track
const CURRENCY_PAIRS = [
  { from: 'GBP', to: 'NGN' },
  { from: 'EUR', to: 'NGN' },
  { from: 'GBP', to: 'GHS' },
  { from: 'EUR', to: 'GHS' }
];

// API key is stored in environment variables
const API_KEY = process.env.EXCHANGE_API_KEY;
const API_BASE_URL = 'https://api.exchangerate.host';

type RateTrendPoint = {
  date: string;
  rate: number;
  from_currency: string;
  to_currency: string;
};

/**
 * Fetches historical exchange rate data using multiple APIs to ensure we get a full year of data
 */
async function fetchHistoricalRates(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30
): Promise<RateTrendPoint[]> {
  if (!API_KEY) {
    console.error('Missing EXCHANGE_API_KEY environment variable');
    return [];
  }

  try {
    console.log(`Fetching historical rates for ${fromCurrency}/${toCurrency} (${days} days) from API...`);
    
    // First try to use a timeseries API endpoint which can return multiple dates at once
    const results: RateTrendPoint[] = await fetchTimeseriesData(fromCurrency, toCurrency, days);
    
    // If we got enough data from the timeseries API, return it
    if (results.length >= Math.floor(days * 0.8)) { // If we got at least 80% of the requested days
      console.log(`Successfully fetched ${results.length} historical rates from timeseries API`);
      return results;
    }
    
    // If timeseries API didn't provide enough data, try the day-by-day approach
    console.log(`Timeseries API provided only ${results.length} days, trying day-by-day approach...`);
    
    const today = new Date();
    
    // Only get days we don't already have to avoid duplicate API calls
    const existingDates = new Set(results.map(r => r.date));
    
    // We'll process days in weekly batches to better manage API rate limits
    const batchSize = 7;
    const totalBatches = Math.ceil(days / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      console.log(`Processing batch ${batch + 1} of ${totalBatches}...`);
      
      const batchStart = batch * batchSize;
      const batchEnd = Math.min((batch + 1) * batchSize, days);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const date = subDays(today, i);
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        // Skip if we already have this date
        if (existingDates.has(formattedDate)) {
          continue;
        }
        
        try {
          const url = `${API_BASE_URL}/${formattedDate}?base=${fromCurrency}&symbols=${toCurrency}&access_key=${API_KEY}`;
          console.log(`Fetching rate for ${formattedDate}...`);
          
          const response = await fetch(url);
          
          if (!response.ok) {
            console.error(`API error: ${response.status} - ${await response.text()}`);
            // Try an alternative API endpoint if the primary one fails
            const alternateRate = await fetchAlternativeRate(fromCurrency, toCurrency, formattedDate);
            if (alternateRate !== null) {
              results.push({
                date: formattedDate,
                rate: alternateRate,
                from_currency: fromCurrency,
                to_currency: toCurrency
              });
              existingDates.add(formattedDate);
            }
            continue;
          }
          
          const data = await response.json();
          
          if (!data.success) {
            console.error(`API returned error: ${JSON.stringify(data)}`);
            continue;
          }
          
          if (data.rates && data.rates[toCurrency]) {
            results.push({
              date: formattedDate,
              rate: data.rates[toCurrency],
              from_currency: fromCurrency,
              to_currency: toCurrency
            });
            existingDates.add(formattedDate);
            
            console.log(`Got rate for ${formattedDate}: ${data.rates[toCurrency]}`);
          } else {
            console.warn(`No rate found for ${toCurrency} on ${formattedDate}`);
          }
          
          // Add a delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`Error fetching rate for ${formattedDate}: ${error}`);
        }
      }
      
      // Add a longer delay between batches to avoid hitting API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`Successfully fetched ${results.length} historical rates for ${fromCurrency}/${toCurrency}`);
    return results;
  } catch (error) {
    console.error(`Error fetching historical rates: ${error}`);
    return [];
  }
}

/**
 * Fetch historical rates using a timeseries API endpoint that returns multiple dates at once
 * This is more efficient for getting large date ranges
 */
async function fetchTimeseriesData(
  fromCurrency: string,
  toCurrency: string,
  days: number
): Promise<RateTrendPoint[]> {
  try {
    const results: RateTrendPoint[] = [];
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    console.log(`Fetching timeseries data from ${startDateStr} to ${endDateStr}...`);
    
    // Try the first API endpoint (exchangerate.host)
    try {
      const url = `https://api.exchangerate.host/timeseries?start_date=${startDateStr}&end_date=${endDateStr}&base=${fromCurrency}&symbols=${toCurrency}`;
      console.log(`Trying API: ${url}`);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.rates) {
          for (const [date, rates] of Object.entries(data.rates)) {
            const anyRates = rates as any;
            if (anyRates[toCurrency]) {
              results.push({
                date: date,
                rate: anyRates[toCurrency],
                from_currency: fromCurrency,
                to_currency: toCurrency
              });
            }
          }
          
          console.log(`Got ${results.length} rates from timeseries API`);
          return results;
        }
      } else {
        console.error(`Timeseries API error: ${response.status}`);
      }
    } catch (apiError) {
      console.error(`Error with timeseries API: ${apiError}`);
    }
    
    // Try an alternative API if the first one fails
    try {
      // Breaking the dates into monthly chunks to avoid hitting API limits
      let currentStartDate = new Date(startDate);
      
      while (currentStartDate < endDate) {
        // Calculate end of current month or end date, whichever comes first
        const currentEndDate = new Date(currentStartDate);
        currentEndDate.setMonth(currentEndDate.getMonth() + 1);
        
        if (currentEndDate > endDate) {
          currentEndDate.setTime(endDate.getTime());
        }
        
        const currentStartStr = format(currentStartDate, 'yyyy-MM-dd');
        const currentEndStr = format(currentEndDate, 'yyyy-MM-dd');
        
        console.log(`Fetching chunk from ${currentStartStr} to ${currentEndStr}...`);
        
        const url = `https://api.exchangerate.host/timeframe?start_date=${currentStartStr}&end_date=${currentEndStr}&base=${fromCurrency}&symbols=${toCurrency}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.rates) {
            for (const [date, rates] of Object.entries(data.rates)) {
              const anyRates = rates as any;
              if (anyRates[toCurrency]) {
                results.push({
                  date: date,
                  rate: anyRates[toCurrency],
                  from_currency: fromCurrency,
                  to_currency: toCurrency
                });
              }
            }
          }
        }
        
        // Move to next month
        currentStartDate = new Date(currentEndDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);
        
        // Add a delay between chunks to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Got ${results.length} rates from chunked API requests`);
      return results;
    } catch (apiError) {
      console.error(`Error with chunked API requests: ${apiError}`);
    }
    
    // If we still don't have any data, try another alternative API
    if (results.length === 0) {
      try {
        const url = `https://open.er-api.com/v6/time-series/${fromCurrency}/${startDateStr}/${endDateStr}`;
        console.log(`Trying open.er-api.com: ${url}`);
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.rates) {
            for (const [date, rates] of Object.entries(data.rates)) {
              const rateForCurrency = (rates as any)[toCurrency];
              if (rateForCurrency) {
                results.push({
                  date: date,
                  rate: rateForCurrency,
                  from_currency: fromCurrency,
                  to_currency: toCurrency
                });
              }
            }
          }
        }
      } catch (apiError) {
        console.error(`Error with open.er-api.com: ${apiError}`);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error in fetchTimeseriesData: ${error}`);
    return [];
  }
}

/**
 * Fetch a single day's exchange rate from alternative APIs
 * Used as a fallback when the primary API fails
 */
async function fetchAlternativeRate(
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<number | null> {
  try {
    // Try first alternative API
    try {
      const url = `https://api.exchangerate.host/${date}?base=${fromCurrency}&symbols=${toCurrency}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.rates && data.rates[toCurrency]) {
          return data.rates[toCurrency];
        }
      }
    } catch (error) {
      console.error(`Alternative API error: ${error}`);
    }
    
    // Try second alternative API
    try {
      const url = `https://open.er-api.com/v6/historical/${date}?base=${fromCurrency}&symbols=${toCurrency}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.rates && data.rates[toCurrency]) {
          return data.rates[toCurrency];
        }
      }
    } catch (error) {
      console.error(`Second alternative API error: ${error}`);
    }
    
    // No rate found
    return null;
  } catch (error) {
    console.error(`Error in fetchAlternativeRate: ${error}`);
    return null;
  }
}

/**
 * Stores historical rate data in the database
 */
async function storeHistoricalRates(rates: RateTrendPoint[]): Promise<boolean> {
  if (!rates || rates.length === 0) {
    console.warn('No rates to store');
    return false;
  }
  
  try {
    console.log(`Storing ${rates.length} historical rates in database...`);
    
    // Insert each rate into the database
    for (const rate of rates) {
      // Check if this rate already exists
      const existingRate = await db.select()
        .from(rateTrends)
        .where(
          sql`from_currency = ${rate.from_currency} AND 
              to_currency = ${rate.to_currency} AND 
              date = ${rate.date}`
        );
      
      if (existingRate && existingRate.length > 0) {
        // Update the existing rate
        await db.update(rateTrends)
          .set({ 
            rate: rate.rate
          })
          .where(
            sql`from_currency = ${rate.from_currency} AND 
                to_currency = ${rate.to_currency} AND 
                date = ${rate.date}`
          );
      } else {
        // Insert a new rate
        await db.insert(rateTrends)
          .values({
            from_currency: rate.from_currency,
            to_currency: rate.to_currency,
            date: rate.date,
            rate: rate.rate
          });
      }
    }
    
    // Update the rate cache
    const { from_currency, to_currency } = rates[0];
    const existingCache = await db.select()
      .from(rateCache)
      .where(
        sql`from_currency = ${from_currency} AND to_currency = ${to_currency}`
      );
    
    const now = new Date();
    
    if (existingCache && existingCache.length > 0) {
      // Update the existing cache entry
      await db.update(rateCache)
        .set({ last_updated: now })
        .where(
          sql`from_currency = ${from_currency} AND to_currency = ${to_currency}`
        );
    } else {
      // Insert a new cache entry
      await db.insert(rateCache)
        .values({
          from_currency: from_currency,
          to_currency: to_currency,
          last_updated: now
        });
    }
    
    console.log(`Successfully stored ${rates.length} historical rates in database`);
    return true;
  } catch (error) {
    console.error(`Error storing historical rates: ${error}`);
    return false;
  }
}

/**
 * Retrieves historical rate data from the database if available,
 * otherwise fetches from the API and stores in the database
 */
async function getHistoricalRateData(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30
): Promise<RateTrendPoint[]> {
  try {
    console.log(`Getting historical rate data for ${fromCurrency}/${toCurrency} (${days} days)`);
    
    // Check if we need to refresh the data
    const shouldRefresh = await shouldRefreshData(fromCurrency, toCurrency);
    
    if (shouldRefresh) {
      console.log(`Data needs refreshing for ${fromCurrency}/${toCurrency}`);
      
      // Fetch fresh data from the API
      const apiRates = await fetchHistoricalRates(fromCurrency, toCurrency, days);
      
      if (apiRates && apiRates.length > 0) {
        // Store the fresh data in the database
        await storeHistoricalRates(apiRates);
        
        // Return the fresh data
        return apiRates;
      }
    }
    
    // Get data from the database
    console.log(`Getting historical rate data from database for ${fromCurrency}/${toCurrency} (${days} days)`);
    
    const startDate = subDays(new Date(), days);
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    
    const dbRates = await db.select()
      .from(rateTrends)
      .where(
        sql`from_currency = ${fromCurrency} AND 
            to_currency = ${toCurrency} AND 
            date::date >= ${formattedStartDate}::date`
      )
      .orderBy(sql`date`);
    
    console.log(`Found ${dbRates.length} historical rates in database`);
    
    if (dbRates && dbRates.length > 0) {
      return dbRates as RateTrendPoint[];
    }
    
    // If we still don't have data, try fetching from the API as a last resort
    console.log(`No data found in database, fetching from API as last resort`);
    const lastResortRates = await fetchHistoricalRates(fromCurrency, toCurrency, days);
    
    if (lastResortRates && lastResortRates.length > 0) {
      await storeHistoricalRates(lastResortRates);
      return lastResortRates;
    }
    
    // If all else fails, return an empty array
    console.warn(`Could not get historical rate data for ${fromCurrency}/${toCurrency}`);
    return [];
  } catch (error) {
    console.error(`Error getting historical rate data: ${error}`);
    return [];
  }
}

/**
 * Checks if we need to refresh the data for a currency pair
 */
async function shouldRefreshData(fromCurrency: string, toCurrency: string): Promise<boolean> {
  try {
    // Check if we have a cache entry for this currency pair
    const cacheEntry = await db.select()
      .from(rateCache)
      .where(
        sql`from_currency = ${fromCurrency} AND to_currency = ${toCurrency}`
      );
    
    if (!cacheEntry || cacheEntry.length === 0) {
      // No cache entry, so we need to refresh
      return true;
    }
    
    // Check if the cache entry is stale (older than 8 hours)
    const lastUpdated = new Date(cacheEntry[0].last_updated);
    const now = new Date();
    const hours = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    return hours >= 8;
  } catch (error) {
    console.error(`Error checking if data needs refreshing: ${error}`);
    return true; // Refresh by default if there's an error
  }
}

/**
 * Updates historical rate data for all tracked currency pairs
 */
async function updateAllHistoricalRates(days: number = 90): Promise<boolean> {
  try {
    console.log(`Updating historical rates for all tracked currency pairs (${days} days)`);
    
    let success = true;
    
    for (const pair of CURRENCY_PAIRS) {
      try {
        console.log(`Updating historical rates for ${pair.from}/${pair.to}...`);
        
        // Fetch fresh data from the API
        const apiRates = await fetchHistoricalRates(pair.from, pair.to, days);
        
        if (apiRates && apiRates.length > 0) {
          // Store the fresh data in the database
          await storeHistoricalRates(apiRates);
          console.log(`Successfully updated historical rates for ${pair.from}/${pair.to}`);
        } else {
          console.warn(`Failed to update historical rates for ${pair.from}/${pair.to}`);
          success = false;
        }
      } catch (error) {
        console.error(`Error updating historical rates for ${pair.from}/${pair.to}: ${error}`);
        success = false;
      }
      
      // Add a delay between currency pairs to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return success;
  } catch (error) {
    console.error(`Error updating all historical rates: ${error}`);
    return false;
  }
}

/**
 * Updates historical rate data for the most recent days only
 * This is useful for incremental updates
 */
async function updateRecentHistoricalRates(days: number = 7): Promise<boolean> {
  return updateAllHistoricalRates(days);
}

export {
  getHistoricalRateData,
  updateAllHistoricalRates,
  updateRecentHistoricalRates,
  fetchHistoricalRates,
  storeHistoricalRates
};