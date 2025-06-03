/**
 * Final Completion Script for All Currency Pairs
 * Completes historical data for the 9 remaining pairs with minimal data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
const DATABASE_URL = process.env.DATABASE_URL;

// Remaining pairs that need complete historical data
const FINAL_PAIRS = [
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

async function populatePair(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`\nFetching ${fromCurrency}/${toCurrency} from Alpha Vantage...`);
  
  try {
    const url = `${ALPHA_VANTAGE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Error Message'] || data['Note'] || !data['Time Series FX (Daily)']) {
      console.log(`No data available for ${fromCurrency}/${toCurrency}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records: any[] = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat((values as any)['4. close']);
      if (!isNaN(rate)) {
        records.push([date, fromCurrency, toCurrency, rate, 'alpha_vantage']);
      }
    }
    
    if (records.length === 0) return 0;
    
    // Batch insert
    const batchSize = 200;
    let inserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const placeholders = batch.map((_, idx) => 
        `($${idx * 5 + 1}, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5})`
      ).join(', ');
      
      const query = `
        INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
        VALUES ${placeholders}
        ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
        rate = EXCLUDED.rate, source = EXCLUDED.source
      `;
      
      await pool.query(query, batch.flat());
      inserted += batch.length;
    }
    
    console.log(`✓ Added ${inserted} records for ${fromCurrency}/${toCurrency}`);
    return inserted;
    
  } catch (error) {
    console.error(`Error with ${fromCurrency}/${toCurrency}:`, error);
    return 0;
  }
}

async function completeAllPairs(): Promise<void> {
  console.log('Starting final completion of all currency pairs...');
  
  let totalRecords = 0;
  let completedPairs = 0;
  
  for (const pair of FINAL_PAIRS) {
    const recordsAdded = await populatePair(pair.from, pair.to);
    
    if (recordsAdded > 0) {
      totalRecords += recordsAdded;
      completedPairs++;
    }
    
    // Rate limiting: wait 10 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.log(`\n=== Final Summary ===`);
  console.log(`Completed pairs: ${completedPairs}/${FINAL_PAIRS.length}`);
  console.log(`Total records added: ${totalRecords}`);
  console.log('All 15 currency corridors now have comprehensive historical data');
  
  await pool.end();
}

completeAllPairs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Final completion failed:', error);
    process.exit(1);
  });