/**
 * Continue Alpha Vantage Population for Remaining Currency Pairs
 * Focuses on pairs that still need historical data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
const DATABASE_URL = process.env.DATABASE_URL;

// Focus on pairs that need population (excluding already populated ones)
const REMAINING_PAIRS = [
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

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function checkExistingData(fromCurrency: string, toCurrency: string): Promise<number> {
  try {
    const query = 'SELECT COUNT(*) as count FROM rate_trends WHERE from_currency = $1 AND to_currency = $2';
    const result = await pool.query(query, [fromCurrency, toCurrency]);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error(`Error checking data for ${fromCurrency}/${toCurrency}:`, error);
    return 0;
  }
}

async function fetchAndStoreHistoricalData(fromCurrency: string, toCurrency: string): Promise<boolean> {
  try {
    const url = `${ALPHA_VANTAGE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    console.log(`Fetching ${fromCurrency}/${toCurrency}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    
    if (data['Error Message'] || data['Note']) {
      console.error(`Alpha Vantage error:`, data['Error Message'] || data['Note']);
      return false;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    if (!timeSeries) {
      console.error(`No data found for ${fromCurrency}/${toCurrency}`);
      return false;
    }
    
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
    
    if (historicalData.length === 0) return false;
    
    // Store in batches
    const batchSize = 100;
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
    
    console.log(`✓ Stored ${insertedCount} records for ${fromCurrency}/${toCurrency}`);
    return true;
    
  } catch (error) {
    console.error(`Error processing ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

async function populateRemainingPairs(): Promise<void> {
  console.log('Continuing Alpha Vantage population for remaining currency pairs...\n');
  
  let processed = 0;
  let successful = 0;
  
  for (const pair of REMAINING_PAIRS) {
    const existingCount = await checkExistingData(pair.from, pair.to);
    
    if (existingCount > 1000) {
      console.log(`${pair.from}/${pair.to}: Already has ${existingCount} records - skipping`);
    } else {
      console.log(`${pair.from}/${pair.to}: Has ${existingCount} records - fetching historical data`);
      
      const success = await fetchAndStoreHistoricalData(pair.from, pair.to);
      if (success) {
        successful++;
        console.log(`Wait 12 seconds for rate limit...`);
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }
    
    processed++;
    console.log(`Progress: ${processed}/${REMAINING_PAIRS.length}\n`);
  }
  
  console.log(`\nCompleted: ${successful}/${REMAINING_PAIRS.length} pairs populated`);
  await pool.end();
}

populateRemainingPairs()
  .then(() => {
    console.log('Population process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Population failed:', error);
    process.exit(1);
  });