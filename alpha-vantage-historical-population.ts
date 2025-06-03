/**
 * Alpha Vantage Historical Data Population
 * Fetches authentic historical exchange rate data for all 15 currency corridors
 * Uses Alpha Vantage FX_DAILY API for real market data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
const DATABASE_URL = process.env.DATABASE_URL;

// All 15 supported currency corridors
const CURRENCY_PAIRS = [
  { from: 'GBP', to: 'NGN' },
  { from: 'EUR', to: 'NGN' },
  { from: 'USD', to: 'NGN' },
  { from: 'GBP', to: 'GHS' },
  { from: 'EUR', to: 'GHS' },
  { from: 'USD', to: 'GHS' },
  { from: 'GBP', to: 'KES' },
  { from: 'EUR', to: 'KES' },
  { from: 'USD', to: 'KES' },
  { from: 'GBP', to: 'INR' },
  { from: 'EUR', to: 'INR' },
  { from: 'USD', to: 'INR' },
  { from: 'GBP', to: 'PKR' },
  { from: 'EUR', to: 'PKR' },
  { from: 'USD', to: 'PKR' },
];

// Database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
});

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function checkExistingData(fromCurrency: string, toCurrency: string): Promise<number> {
  try {
    const query = 'SELECT COUNT(*) as count FROM rate_trends WHERE from_currency = $1 AND to_currency = $2';
    const result = await pool.query(query, [fromCurrency, toCurrency]);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error(`Error checking existing data for ${fromCurrency}/${toCurrency}:`, error);
    return 0;
  }
}

async function fetchAlphaVantageHistoricalData(fromCurrency: string, toCurrency: string): Promise<any[]> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('HISTORICAL_EXCHANGE_API_KEY not available');
    return [];
  }

  try {
    const url = `${ALPHA_VANTAGE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    console.log(`Fetching ${fromCurrency}/${toCurrency} historical data from Alpha Vantage...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Alpha Vantage API request failed for ${fromCurrency}/${toCurrency}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Check for API errors
    if (data['Error Message']) {
      console.error(`Alpha Vantage Error for ${fromCurrency}/${toCurrency}:`, data['Error Message']);
      return [];
    }
    
    if (data['Note']) {
      console.error(`Alpha Vantage Rate Limit for ${fromCurrency}/${toCurrency}:`, data['Note']);
      return [];
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    if (!timeSeries) {
      console.error(`No time series data found for ${fromCurrency}/${toCurrency}`);
      return [];
    }
    
    // Convert to our format
    const historicalData: any[] = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const closeRate = parseFloat((values as any)['4. close']);
      if (!isNaN(closeRate)) {
        historicalData.push({
          date: date,
          rate: closeRate,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          source: 'alpha_vantage'
        });
      }
    }
    
    console.log(`✓ Retrieved ${historicalData.length} historical data points for ${fromCurrency}/${toCurrency}`);
    return historicalData;
    
  } catch (error) {
    console.error(`Error fetching Alpha Vantage data for ${fromCurrency}/${toCurrency}:`, error);
    return [];
  }
}

async function storeHistoricalData(historicalData: any[]): Promise<number> {
  if (historicalData.length === 0) return 0;
  
  try {
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < historicalData.length; i += batchSize) {
      const batch = historicalData.slice(i, i + batchSize);
      
      const values = batch.map((_, index) => 
        `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`
      ).join(', ');
      
      const query = `
        INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
        VALUES ${values}
        ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
        rate = EXCLUDED.rate, source = EXCLUDED.source
      `;
      
      const params = batch.flatMap(item => [
        item.date, item.from_currency, item.to_currency, item.rate, item.source
      ]);
      
      await pool.query(query, params);
      insertedCount += batch.length;
    }
    
    return insertedCount;
    
  } catch (error) {
    console.error('Error storing historical data:', error);
    return 0;
  }
}

async function populateHistoricalDataForPair(fromCurrency: string, toCurrency: string): Promise<void> {
  console.log(`\n=== Processing ${fromCurrency}/${toCurrency} ===`);
  
  const existingCount = await checkExistingData(fromCurrency, toCurrency);
  
  // Skip if we already have substantial data (more than 200 days)
  if (existingCount > 200) {
    console.log(`${fromCurrency}/${toCurrency} already has sufficient data (${existingCount} records) - skipping`);
    return;
  }
  
  console.log(`${fromCurrency}/${toCurrency} has ${existingCount} existing records - fetching historical data`);
  
  // Fetch historical data from Alpha Vantage
  const historicalData = await fetchAlphaVantageHistoricalData(fromCurrency, toCurrency);
  
  if (historicalData.length === 0) {
    console.error(`No historical data retrieved for ${fromCurrency}/${toCurrency}`);
    return;
  }
  
  // Store the data
  const insertedCount = await storeHistoricalData(historicalData);
  console.log(`✓ Successfully stored ${insertedCount} historical records for ${fromCurrency}/${toCurrency}`);
  
  // Rate limiting - Alpha Vantage allows 5 requests per minute for free tier
  console.log('Waiting 15 seconds to respect API rate limits...');
  await new Promise(resolve => setTimeout(resolve, 15000));
}

async function populateAllHistoricalData(): Promise<void> {
  console.log('Starting Alpha Vantage historical data population for all 15 currency corridors...');
  console.log('Fetching up to 1 year of authentic exchange rate data from Alpha Vantage\n');
  
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('HISTORICAL_EXCHANGE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalRecords = 0;
  
  for (const pair of CURRENCY_PAIRS) {
    try {
      await populateHistoricalDataForPair(pair.from, pair.to);
      totalSuccess++;
    } catch (error) {
      console.error(`Failed to process ${pair.from}/${pair.to}:`, error);
    }
    
    totalProcessed++;
    console.log(`Progress: ${totalProcessed}/${CURRENCY_PAIRS.length} currency pairs processed`);
  }
  
  // Final verification
  console.log('\n=== Final Data Verification ===');
  for (const pair of CURRENCY_PAIRS) {
    const count = await checkExistingData(pair.from, pair.to);
    totalRecords += count;
    console.log(`${pair.from}/${pair.to}: ${count} historical records`);
  }
  
  console.log('\n=== Population Summary ===');
  console.log(`Currency pairs processed: ${totalProcessed}/${CURRENCY_PAIRS.length}`);
  console.log(`Successfully populated: ${totalSuccess}`);
  console.log(`Total historical records: ${totalRecords}`);
  console.log('Authentic historical data population completed!');
  
  await pool.end();
}

// Run the population
populateAllHistoricalData()
  .then(() => {
    console.log('\nAll currency corridors now have comprehensive authentic historical data');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Historical data population failed:', error);
    process.exit(1);
  });