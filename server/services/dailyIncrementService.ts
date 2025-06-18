/**
 * Daily Increment Service
 * Automated daily collection of current rates using Alpha Vantage API
 * Only adds new daily data points without touching historical data
 */

import { db } from '../db';
import { rateTrends } from '../../shared/schema';
import { sql, eq, and } from 'drizzle-orm';

interface AlphaVantageResponse {
  'Time Series FX (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
    };
  };
  'Meta Data': {
    '2. From Symbol': string;
    '3. To Symbol': string;
    '5. Last Refreshed': string;
  };
}

const ALL_CURRENCY_PAIRS = [
  ['GBP', 'NGN'], ['EUR', 'NGN'], ['USD', 'NGN'],
  ['GBP', 'GHS'], ['EUR', 'GHS'], ['USD', 'GHS'],
  ['GBP', 'KES'], ['EUR', 'KES'], ['USD', 'KES'],
  ['GBP', 'INR'], ['EUR', 'INR'], ['USD', 'INR'],
  ['GBP', 'PKR'], ['EUR', 'PKR'], ['USD', 'PKR']
];

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if today's increment already exists for a currency pair
 */
async function hasTodayIncrement(fromCurrency: string, toCurrency: string): Promise<boolean> {
  const today = getTodayDate();
  
  const existing = await db.execute(sql`
    SELECT COUNT(*) as count FROM rate_trends 
    WHERE from_currency = ${fromCurrency} 
    AND to_currency = ${toCurrency} 
    AND date = ${today}
    AND source = 'daily_increment'
  `);
  
  return (existing.rows[0].count as number) > 0;
}

/**
 * Fetch latest rate from Alpha Vantage for daily increment
 */
async function fetchLatestRateFromAlphaVantage(
  fromCurrency: string, 
  toCurrency: string
): Promise<{ rate: number; date: string } | null> {
  
  const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('Alpha Vantage API key not available for daily increment');
    return null;
  }
  
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Alpha Vantage API request failed: ${response.status}`);
      return null;
    }
    
    const data: AlphaVantageResponse = await response.json();
    
    if (data['Error Message']) {
      console.error(`Alpha Vantage error: ${data['Error Message']}`);
      return null;
    }
    
    if (data['Note']) {
      console.error(`Alpha Vantage rate limit: ${data['Note']}`);
      return null;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    if (!timeSeries) {
      console.error('No time series data in Alpha Vantage response');
      return null;
    }
    
    // Get the most recent date and rate
    const dates = Object.keys(timeSeries).sort().reverse();
    if (dates.length === 0) {
      console.error('No dates found in Alpha Vantage time series');
      return null;
    }
    
    const latestDate = dates[0];
    const latestData = timeSeries[latestDate];
    const rate = parseFloat(latestData['4. close']);
    
    if (isNaN(rate)) {
      console.error('Invalid rate value from Alpha Vantage');
      return null;
    }
    
    console.log(`✓ Fetched ${fromCurrency}/${toCurrency}: ${rate} for ${latestDate}`);
    return { rate, date: latestDate };
    
  } catch (error) {
    console.error(`Error fetching from Alpha Vantage for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

/**
 * Add daily increment for a single currency pair
 */
async function addDailyIncrement(fromCurrency: string, toCurrency: string): Promise<boolean> {
  console.log(`Adding daily increment for ${fromCurrency}/${toCurrency}...`);
  
  // Fetch latest rate from Alpha Vantage
  const rateData = await fetchLatestRateFromAlphaVantage(fromCurrency, toCurrency);
  if (!rateData) {
    console.error(`Failed to fetch rate for ${fromCurrency}/${toCurrency}`);
    return false;
  }
  
  try {
    // Check if today's increment already exists
    const existingIncrement = await hasTodayIncrement(fromCurrency, toCurrency);
    
    if (existingIncrement) {
      // Update existing entry with latest rate
      await db.update(rateTrends)
        .set({
          rate: rateData.rate,
          // Keep original date but update rate to latest
        })
        .where(
          and(
            eq(rateTrends.date, rateData.date),
            eq(rateTrends.from_currency, fromCurrency),
            eq(rateTrends.to_currency, toCurrency),
            eq(rateTrends.source, 'daily_increment')
          )
        );
      
      console.log(`✓ Updated daily increment: ${fromCurrency}/${toCurrency} = ${rateData.rate} (${rateData.date})`);
    } else {
      // Insert new daily increment entry
      await db.insert(rateTrends).values({
        date: rateData.date,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rateData.rate,
        source: 'daily_increment'
      });
      
      console.log(`✓ Added daily increment: ${fromCurrency}/${toCurrency} = ${rateData.rate} (${rateData.date})`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`Error storing daily increment for ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

/**
 * Run daily increment collection for all currency pairs
 * This is the automated function called by scheduler
 */
export async function runDailyIncrementCollection(): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{ pair: string; success: boolean; message: string }>;
}> {
  
  console.log('Starting automated daily increment collection...');
  
  const results = [];
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < ALL_CURRENCY_PAIRS.length; i++) {
    const [fromCurrency, toCurrency] = ALL_CURRENCY_PAIRS[i];
    
    console.log(`Processing ${i + 1}/${ALL_CURRENCY_PAIRS.length}: ${fromCurrency}/${toCurrency}`);
    
    const success = await addDailyIncrement(fromCurrency, toCurrency);
    
    results.push({
      pair: `${fromCurrency}/${toCurrency}`,
      success,
      message: success ? 'Daily increment added' : 'Failed to add daily increment'
    });
    
    if (success) {
      successful++;
    } else {
      failed++;
    }
    
    // Rate limiting: 5 requests per minute for Alpha Vantage
    if (i < ALL_CURRENCY_PAIRS.length - 1) {
      console.log('Rate limiting: waiting 12 seconds...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  console.log(`Daily increment collection completed: ${successful} successful, ${failed} failed`);
  
  return {
    totalProcessed: ALL_CURRENCY_PAIRS.length,
    successful,
    failed,
    results
  };
}

/**
 * Get the latest increment date for a currency pair
 */
export async function getLatestIncrementDate(
  fromCurrency: string, 
  toCurrency: string
): Promise<string | null> {
  
  const result = await db.execute(sql`
    SELECT MAX(date) as latest_date FROM rate_trends 
    WHERE from_currency = ${fromCurrency} 
    AND to_currency = ${toCurrency} 
    AND source = 'daily_increment'
  `);
  
  return result.rows[0].latest_date as string || null;
}

/**
 * Check if daily increment collection should run
 * (Allows multiple runs per day, but prevents duplicate data for same date)
 */
export async function shouldRunDailyCollection(): Promise<boolean> {
  // Always allow collection attempts - the individual addDailyIncrement function
  // will handle duplicate detection per currency pair
  return true;
}