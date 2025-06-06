/**
 * Comprehensive Rate Trends Rebuilder
 * Rebuilds rate trends using authentic Alpha Vantage historical data
 * Ensures daily incremental updates without truncating existing history
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

interface AlphaVantageResponse {
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
    };
  };
}

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;

if (!ALPHA_VANTAGE_API_KEY) {
  console.error('HISTORICAL_EXCHANGE_API_KEY is required for Alpha Vantage data');
  process.exit(1);
}

/**
 * Fetch authentic historical rates from Alpha Vantage
 */
async function fetchHistoricalRates(fromCurrency: string, toCurrency: string): Promise<any[]> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  console.log(`Fetching historical data for ${fromCurrency}/${toCurrency} from Alpha Vantage...`);
  
  try {
    const response = await fetch(url);
    const data: AlphaVantageResponse = await response.json();
    
    if (!data['Time Series (Daily)']) {
      console.error(`No historical data found for ${fromCurrency}/${toCurrency}`);
      return [];
    }
    
    const timeSeries = data['Time Series (Daily)'];
    const historicalRates = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat(values['4. close']); // Use closing rate
      if (!isNaN(rate) && rate > 0) {
        historicalRates.push({
          date,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate
        });
      }
    }
    
    console.log(`Retrieved ${historicalRates.length} historical data points for ${fromCurrency}/${toCurrency}`);
    return historicalRates.slice(0, 365); // Limit to 1 year of data
    
  } catch (error) {
    console.error(`Error fetching data for ${fromCurrency}/${toCurrency}:`, error);
    return [];
  }
}

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
 * Insert rate trends data safely (only new dates)
 */
async function insertRateTrends(historicalData: any[]): Promise<number> {
  let insertedCount = 0;
  
  for (const dataPoint of historicalData) {
    const exists = await dateExists(
      dataPoint.from_currency, 
      dataPoint.to_currency, 
      dataPoint.date
    );
    
    if (!exists) {
      try {
        await db.insert(rateTrends).values({
          date: dataPoint.date,
          from_currency: dataPoint.from_currency,
          to_currency: dataPoint.to_currency,
          rate: dataPoint.rate
        });
        insertedCount++;
      } catch (error) {
        console.error(`Error inserting data for ${dataPoint.date}:`, error);
      }
    }
  }
  
  return insertedCount;
}

/**
 * Rebuild rate trends for GBP/NGN with authentic historical data
 */
async function rebuildGbpNgnTrends(): Promise<void> {
  console.log('Starting GBP/NGN rate trends rebuild with authentic Alpha Vantage data...');
  
  try {
    // Fetch authentic historical data
    const historicalData = await fetchHistoricalRates('GBP', 'NGN');
    
    if (historicalData.length === 0) {
      console.error('No historical data available for GBP/NGN');
      return;
    }
    
    // Sort by date ascending (oldest first)
    historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`Processing ${historicalData.length} historical data points...`);
    console.log(`Date range: ${historicalData[0].date} to ${historicalData[historicalData.length - 1].date}`);
    
    // Insert only new data points
    const insertedCount = await insertRateTrends(historicalData);
    
    console.log(`Successfully inserted ${insertedCount} new rate trend data points for GBP/NGN`);
    console.log('Rate trends rebuild completed successfully');
    
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
    // Get the latest date in our database
    const latestResult = await db.execute(sql`
      SELECT MAX(date) as latest_date 
      FROM rate_trends 
      WHERE from_currency = 'GBP' AND to_currency = 'NGN'
    `);
    
    const latestDate = latestResult.rows[0]?.latest_date;
    console.log(`Latest date in database: ${latestDate}`);
    
    // Fetch recent data
    const recentData = await fetchHistoricalRates('GBP', 'NGN');
    
    if (recentData.length === 0) {
      console.log('No new data available');
      return;
    }
    
    // Filter for only new dates (after latest in database)
    const newData = latestDate 
      ? recentData.filter(point => new Date(point.date) > new Date(latestDate))
      : recentData.slice(0, 30); // If no existing data, take last 30 days
    
    if (newData.length === 0) {
      console.log('All data points already exist in database');
      return;
    }
    
    console.log(`Found ${newData.length} new data points to add`);
    
    // Insert only new data points
    const insertedCount = await insertRateTrends(newData);
    
    console.log(`Daily update completed: ${insertedCount} new data points added`);
    
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
    console.log('Usage: npx tsx rebuild-rate-trends.ts [rebuild|daily]');
    console.log('  rebuild - Complete rebuild of GBP/NGN rate trends');
    console.log('  daily   - Daily incremental update (safe, preserves history)');
    process.exit(1);
  }
  
  process.exit(0);
}

// Auto-run if called directly
main().catch(console.error);

export { rebuildGbpNgnTrends, dailyIncrementalUpdate };