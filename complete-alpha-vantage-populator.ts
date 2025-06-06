/**
 * Complete Alpha Vantage Historical Data Populator
 * Fetches 2+ years of authentic historical data for all 15 currency pairs
 * Uses Alpha Vantage FX_DAILY API with proper rate limiting
 */

import { db } from './server/db';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// All 15 currency corridors that need 2+ years of data
const ALL_CURRENCY_PAIRS = [
  ['GBP', 'NGN'], ['GBP', 'GHS'], ['GBP', 'KES'], ['GBP', 'INR'], ['GBP', 'PKR'],
  ['EUR', 'NGN'], ['EUR', 'GHS'], ['EUR', 'KES'], ['EUR', 'INR'], ['EUR', 'PKR'],
  ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'INR'], ['USD', 'PKR']
];

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
    '1. Information': string;
    '2. From Symbol': string;
    '3. To Symbol': string;
    '4. Output Size': string;
    '5. Last Refreshed': string;
    '6. Time Zone': string;
  };
}

async function checkExistingDataCount(fromCurrency: string, toCurrency: string): Promise<number> {
  const result = await db.execute(`
    SELECT COUNT(*) as count 
    FROM rate_trends 
    WHERE from_currency = '${fromCurrency}' AND to_currency = '${toCurrency}'
  `);
  
  return parseInt(result.rows[0]?.count) || 0;
}

async function fetchFullHistoricalData(fromCurrency: string, toCurrency: string): Promise<any[]> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('ALPHA_VANTAGE_API_KEY not configured');
    return [];
  }

  // Use full output size to get 2+ years of data
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  console.log(`Fetching full historical data for ${fromCurrency}/${toCurrency}...`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data: AlphaVantageResponse = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.error(`No time series data received for ${fromCurrency}/${toCurrency}`);
      if (data['Note']) {
        console.error('API Note:', data['Note']);
      }
      return [];
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const historicalData = [];
    
    // Convert to our format
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat(values['4. close']);
      if (!isNaN(rate)) {
        historicalData.push({
          date,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate
        });
      }
    }
    
    console.log(`Retrieved ${historicalData.length} historical records for ${fromCurrency}/${toCurrency}`);
    return historicalData;
    
  } catch (error) {
    console.error(`Error fetching ${fromCurrency}/${toCurrency}:`, error);
    return [];
  }
}

async function storeHistoricalData(historicalData: any[]): Promise<number> {
  if (historicalData.length === 0) {
    return 0;
  }
  
  console.log(`Storing ${historicalData.length} historical records...`);
  
  let storedCount = 0;
  
  // Store in batches to avoid memory issues
  const batchSize = 100;
  for (let i = 0; i < historicalData.length; i += batchSize) {
    const batch = historicalData.slice(i, i + batchSize);
    
    try {
      const values = batch.map(record => 
        `('${record.date}', '${record.from_currency}', '${record.to_currency}', ${record.rate})`
      ).join(', ');
      
      await db.execute(`
        INSERT INTO rate_trends (date, from_currency, to_currency, rate) 
        VALUES ${values}
        ON CONFLICT (date, from_currency, to_currency) 
        DO UPDATE SET rate = EXCLUDED.rate
      `);
      
      storedCount += batch.length;
      
    } catch (error) {
      console.error(`Error storing batch ${i}-${i + batch.length}:`, error);
    }
  }
  
  console.log(`Successfully stored ${storedCount} records`);
  return storedCount;
}

async function populateCurrencyPair(fromCurrency: string, toCurrency: string): Promise<void> {
  const existingCount = await checkExistingDataCount(fromCurrency, toCurrency);
  
  // Skip if we already have substantial data (750+ days = 2+ years accounting for weekends)
  if (existingCount >= 750) {
    console.log(`${fromCurrency}/${toCurrency}: Already has ${existingCount} records - skipping`);
    return;
  }
  
  console.log(`${fromCurrency}/${toCurrency}: Currently has ${existingCount} records - fetching full history`);
  
  const historicalData = await fetchFullHistoricalData(fromCurrency, toCurrency);
  
  if (historicalData.length > 0) {
    const storedCount = await storeHistoricalData(historicalData);
    console.log(`${fromCurrency}/${toCurrency}: Stored ${storedCount} new records`);
  } else {
    console.log(`${fromCurrency}/${toCurrency}: No data retrieved`);
  }
}

export async function populateAllHistoricalData(): Promise<void> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('ALPHA_VANTAGE_API_KEY not configured - cannot populate historical data');
    console.error('Please provide your Alpha Vantage API key to fetch authentic historical data');
    return;
  }
  
  console.log('Starting complete historical data population for all currency pairs...');
  console.log(`Target: 2+ years of data for ${ALL_CURRENCY_PAIRS.length} currency pairs`);
  
  // Process each currency pair with proper rate limiting
  for (let i = 0; i < ALL_CURRENCY_PAIRS.length; i++) {
    const [fromCurrency, toCurrency] = ALL_CURRENCY_PAIRS[i];
    
    console.log(`\n--- Processing ${i + 1}/${ALL_CURRENCY_PAIRS.length}: ${fromCurrency}/${toCurrency} ---`);
    
    try {
      await populateCurrencyPair(fromCurrency, toCurrency);
    } catch (error) {
      console.error(`Error processing ${fromCurrency}/${toCurrency}:`, error);
    }
    
    // Alpha Vantage free tier: 25 requests per day, 5 per minute
    // Using 12-second delays to stay well under the limit
    if (i < ALL_CURRENCY_PAIRS.length - 1) {
      console.log('Waiting 12 seconds for API rate limiting...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  console.log('\n=== Historical data population completed ===');
  
  // Final summary
  const summary = await db.execute(`
    SELECT from_currency, to_currency, COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY from_currency, to_currency
  `);
  
  console.log('\nFinal Historical Data Status:');
  let pairsWithSufficientData = 0;
  
  for (const row of summary.rows) {
    const count = parseInt(row.count);
    const hasSufficientData = count >= 750;
    if (hasSufficientData) pairsWithSufficientData++;
    
    console.log(`${row.from_currency}/${row.to_currency}: ${count} records (${row.earliest} to ${row.latest}) ${hasSufficientData ? '✓' : '⚠️'}`);
  }
  
  console.log(`\nSummary: ${pairsWithSufficientData}/${ALL_CURRENCY_PAIRS.length} pairs have 2+ years of data`);
}

// Self-executing script for standalone use
if (import.meta.url === `file://${process.argv[1]}`) {
  populateAllHistoricalData()
    .then(() => {
      console.log('Population script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Population script failed:', error);
      process.exit(1);
    });
}