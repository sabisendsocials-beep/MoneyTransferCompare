/**
 * Complete Population for Remaining Currency Pairs
 * Focuses specifically on pairs with insufficient data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
const DATABASE_URL = process.env.DATABASE_URL;

// Pairs that need complete historical data based on current status
const PRIORITY_PAIRS = [
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

async function fetchAndStoreCompleteData(fromCurrency: string, toCurrency: string): Promise<number> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('HISTORICAL_EXCHANGE_API_KEY not available');
    return 0;
  }

  try {
    const url = `${ALPHA_VANTAGE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    console.log(`Fetching complete data for ${fromCurrency}/${toCurrency}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return 0;
    }

    const data = await response.json();
    
    if (data['Error Message']) {
      console.error(`Alpha Vantage Error:`, data['Error Message']);
      return 0;
    }
    
    if (data['Note']) {
      console.error(`Rate Limit:`, data['Note']);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    if (!timeSeries) {
      console.error(`No time series data found`);
      return 0;
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
    
    if (historicalData.length === 0) {
      console.error(`No valid data points extracted`);
      return 0;
    }
    
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
    return insertedCount;
    
  } catch (error) {
    console.error(`Error processing ${fromCurrency}/${toCurrency}:`, error);
    return 0;
  }
}

async function completeRemainingPairs(): Promise<void> {
  console.log('Completing historical data for remaining currency pairs...\n');
  
  let totalRecords = 0;
  let successfulPairs = 0;
  
  for (const pair of PRIORITY_PAIRS) {
    console.log(`Processing ${pair.from}/${pair.to}...`);
    
    const recordsAdded = await fetchAndStoreCompleteData(pair.from, pair.to);
    
    if (recordsAdded > 0) {
      totalRecords += recordsAdded;
      successfulPairs++;
      console.log(`Success: ${recordsAdded} records added`);
    } else {
      console.log(`Failed to add data`);
    }
    
    console.log(`Waiting 12 seconds for rate limit...\n`);
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  console.log(`\nCompletion Summary:`);
  console.log(`- Successful pairs: ${successfulPairs}/${PRIORITY_PAIRS.length}`);
  console.log(`- Total records added: ${totalRecords}`);
  
  await pool.end();
}

completeRemainingPairs()
  .then(() => {
    console.log('Historical data completion process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Completion process failed:', error);
    process.exit(1);
  });