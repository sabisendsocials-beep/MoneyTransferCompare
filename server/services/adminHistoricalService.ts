/**
 * Admin Historical Service
 * Manual Alpha Vantage historical data population triggered by admin only
 * Separate from daily incremental updates and provider rates
 */

import { db } from '../db';
import { rateTrends } from '../../shared/schema';
import { sql, eq, and, desc } from 'drizzle-orm';

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
 * Admin-triggered historical population for a specific currency pair
 * Only populates if no Alpha Vantage historical data exists
 */
export async function adminPopulateHistoricalPair(
  fromCurrency: string, 
  toCurrency: string
): Promise<{ success: boolean; recordsAdded: number; message: string }> {
  
  console.log(`Admin request: Populate historical data for ${fromCurrency}/${toCurrency}`);
  
  // Check if Alpha Vantage historical data already exists
  const existingCount = await db.execute(sql`
    SELECT COUNT(*) as count FROM rate_trends 
    WHERE from_currency = ${fromCurrency} 
    AND to_currency = ${toCurrency} 
    AND source = 'alpha_vantage'
  `);
  
  const count = existingCount.rows[0].count as number;
  
  if (count > 100) {
    return {
      success: false,
      recordsAdded: 0,
      message: `Historical data already exists (${count} records). Use daily increments instead.`
    };
  }
  
  const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  if (!ALPHA_VANTAGE_API_KEY) {
    return {
      success: false,
      recordsAdded: 0,
      message: 'Alpha Vantage API key not configured'
    };
  }
  
  try {
    console.log(`Fetching full historical dataset from Alpha Vantage...`);
    
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data: AlphaVantageResponse = await response.json();
    
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
    }
    
    if (!data['Time Series FX (Daily)']) {
      throw new Error('Invalid response format from Alpha Vantage');
    }
    
    const timeSeriesData = data['Time Series FX (Daily)'];
    console.log(`Retrieved ${Object.keys(timeSeriesData).length} data points from Alpha Vantage`);
    
    // Convert to our format
    const historicalData = Object.entries(timeSeriesData).map(([date, values]) => ({
      date,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: parseFloat(values['4. close']),
      source: 'alpha_vantage'
    }));
    
    // Batch insert
    const batchSize = 500;
    let totalInserted = 0;
    
    for (let i = 0; i < historicalData.length; i += batchSize) {
      const batch = historicalData.slice(i, i + batchSize);
      
      await db.insert(rateTrends)
        .values(batch)
        .onConflictDoNothing();
      
      totalInserted += batch.length;
      console.log(`Progress: ${totalInserted}/${historicalData.length} records`);
    }
    
    console.log(`✓ Admin population complete: ${totalInserted} records added`);
    
    return {
      success: true,
      recordsAdded: totalInserted,
      message: `Successfully populated ${totalInserted} historical records from ${historicalData[historicalData.length - 1]?.date} to ${historicalData[0]?.date}`
    };
    
  } catch (error) {
    console.error(`Admin population failed for ${fromCurrency}/${toCurrency}:`, error);
    return {
      success: false,
      recordsAdded: 0,
      message: `Population failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Admin-triggered population for all currency pairs
 * Only populates pairs that don't have Alpha Vantage historical data
 */
export async function adminPopulateAllHistoricalData(): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  totalRecordsAdded: number;
  results: Array<{ pair: string; success: boolean; recordsAdded: number; message: string }>;
}> {
  
  console.log('Admin request: Populate historical data for all currency pairs');
  
  const results = [];
  let successful = 0;
  let failed = 0;
  let totalRecordsAdded = 0;
  
  for (let i = 0; i < ALL_CURRENCY_PAIRS.length; i++) {
    const [fromCurrency, toCurrency] = ALL_CURRENCY_PAIRS[i];
    
    console.log(`Processing ${i + 1}/${ALL_CURRENCY_PAIRS.length}: ${fromCurrency}/${toCurrency}`);
    
    const result = await adminPopulateHistoricalPair(fromCurrency, toCurrency);
    
    results.push({
      pair: `${fromCurrency}/${toCurrency}`,
      success: result.success,
      recordsAdded: result.recordsAdded,
      message: result.message
    });
    
    if (result.success) {
      successful++;
      totalRecordsAdded += result.recordsAdded;
    } else {
      failed++;
    }
    
    // Rate limiting: 5 requests per minute for Alpha Vantage
    if (i < ALL_CURRENCY_PAIRS.length - 1) {
      console.log('Rate limiting: waiting 12 seconds...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  console.log(`Admin population summary: ${successful} successful, ${failed} failed, ${totalRecordsAdded} total records added`);
  
  return {
    totalProcessed: ALL_CURRENCY_PAIRS.length,
    successful,
    failed,
    totalRecordsAdded,
    results
  };
}

/**
 * Get status of historical data for all currency pairs
 */
export async function getHistoricalDataStatus(): Promise<Array<{
  pair: string;
  hasHistoricalData: boolean;
  recordCount: number;
  earliestDate: string | null;
  latestDate: string | null;
  lastDailyIncrement: string | null;
}>> {
  
  const status = [];
  
  for (const [fromCurrency, toCurrency] of ALL_CURRENCY_PAIRS) {
    // Check Alpha Vantage historical data
    const historicalCheck = await db.execute(sql`
      SELECT COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
      FROM rate_trends 
      WHERE from_currency = ${fromCurrency} 
      AND to_currency = ${toCurrency} 
      AND source = 'alpha_vantage'
    `);
    
    const historicalCount = historicalCheck.rows[0].count as number;
    const earliestDate = historicalCheck.rows[0].earliest as string;
    const latestDate = historicalCheck.rows[0].latest as string;
    
    // Check latest daily increment
    const dailyCheck = await db.execute(sql`
      SELECT MAX(date) as latest_daily
      FROM rate_trends 
      WHERE from_currency = ${fromCurrency} 
      AND to_currency = ${toCurrency} 
      AND source = 'daily_increment'
    `);
    
    const lastDailyIncrement = dailyCheck.rows[0].latest_daily as string;
    
    status.push({
      pair: `${fromCurrency}/${toCurrency}`,
      hasHistoricalData: historicalCount > 100,
      recordCount: historicalCount,
      earliestDate,
      latestDate,
      lastDailyIncrement
    });
  }
  
  return status;
}