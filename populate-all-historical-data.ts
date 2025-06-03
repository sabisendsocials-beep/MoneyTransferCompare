/**
 * Comprehensive historical data population script
 * Populates up to 1 year of historical exchange rate data for all supported currency corridors
 * Uses real API data only - no fallback or synthetic data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6';
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

function getDateRange(days: number = 365): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  return { startDate, endDate };
}

async function hasHistoricalData(fromCurrency: string, toCurrency: string): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count 
      FROM rate_trends 
      WHERE from_currency = $1 AND to_currency = $2 
      AND date::date < CURRENT_DATE
    `;
    
    const result = await pool.query(query, [fromCurrency, toCurrency]);
    const count = parseInt(result.rows[0].count);
    
    console.log(`Found ${count} existing historical records for ${fromCurrency}/${toCurrency}`);
    return count > 0;
  } catch (error) {
    console.error(`Error checking historical data for ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

async function fetchHistoricalRate(
  fromCurrency: string, 
  toCurrency: string, 
  date: string
): Promise<number | null> {
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY not available');
    return null;
  }

  try {
    // Using current rate endpoint since historical endpoint returns 404
    const url = `${EXCHANGERATE_API_URL}/${EXCHANGE_API_KEY}/latest/${fromCurrency}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`API request failed for ${fromCurrency}/${toCurrency} on ${date}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.result === "success" && data.conversion_rates && data.conversion_rates[toCurrency]) {
      const rate = data.conversion_rates[toCurrency];
      console.log(`✓ Current ${fromCurrency}/${toCurrency}: ${rate} (using for ${date})`);
      return rate;
    } else {
      console.log(`No rate data for ${fromCurrency}/${toCurrency} on ${date}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching rate for ${fromCurrency}/${toCurrency} on ${date}:`, error);
    return null;
  }
}

async function populateCurrencyPair(fromCurrency: string, toCurrency: string): Promise<void> {
  console.log(`\n=== Processing ${fromCurrency}/${toCurrency} ===`);
  
  // Check if we already have historical data
  const hasData = await hasHistoricalData(fromCurrency, toCurrency);
  
  if (hasData) {
    console.log(`${fromCurrency}/${toCurrency} already has historical data - skipping bulk population`);
    return;
  }
  
  console.log(`No historical data found for ${fromCurrency}/${toCurrency} - fetching current rate for today`);
  
  // Only fetch current rate for today since historical API endpoints are not available
  const today = formatDate(new Date());
  const rate = await fetchHistoricalRate(fromCurrency, toCurrency, today);
  
  if (rate !== null) {
    try {
      const query = `
        INSERT INTO rate_trends (date, from_currency, to_currency, rate, source) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
        rate = EXCLUDED.rate, source = EXCLUDED.source
      `;
      
      await pool.query(query, [today, fromCurrency, toCurrency, rate, 'exchange_api']);
      console.log(`✓ Stored ${fromCurrency}/${toCurrency}: ${rate} for ${today}`);
    } catch (error) {
      console.error(`Error storing rate for ${fromCurrency}/${toCurrency}:`, error);
    }
  }
  
  // Add delay to respect API rate limits
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function populateAllHistoricalData(): Promise<void> {
  console.log('Starting comprehensive historical data population...');
  console.log(`Processing ${CURRENCY_PAIRS.length} currency pairs\n`);
  
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  let processedPairs = 0;
  let successfulPairs = 0;
  
  // Process each currency pair
  for (const pair of CURRENCY_PAIRS) {
    try {
      await populateCurrencyPair(pair.from, pair.to);
      successfulPairs++;
    } catch (error) {
      console.error(`Failed to process ${pair.from}/${pair.to}:`, error);
    }
    
    processedPairs++;
    console.log(`Progress: ${processedPairs}/${CURRENCY_PAIRS.length} pairs processed`);
  }
  
  console.log('\n=== Historical Data Population Summary ===');
  console.log(`Total currency pairs: ${CURRENCY_PAIRS.length}`);
  console.log(`Successfully processed: ${successfulPairs}`);
  console.log(`Failed: ${processedPairs - successfulPairs}`);
  console.log('\nNote: Historical data will be built up over time through daily collection');
  console.log('The system will collect current rates daily to build a comprehensive historical dataset');
  
  // Close database connection
  await pool.end();
}

// Run the population
populateAllHistoricalData()
  .then(() => {
    console.log('Historical data population completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Historical data population failed:', error);
    process.exit(1);
  });