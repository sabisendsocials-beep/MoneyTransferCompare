/**
 * Batch Complete Remaining Currency Pairs
 * Fast completion for the 8 pairs that still need data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
const DATABASE_URL = process.env.DATABASE_URL;

const REMAINING_PAIRS = [
  'EUR/KES', 'USD/KES', 'GBP/INR', 'EUR/INR', 'USD/INR', 'GBP/PKR', 'EUR/PKR', 'USD/PKR'
];

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function quickPopulate(pair: string): Promise<number> {
  const [from, to] = pair.split('/');
  console.log(`Processing ${pair}...`);
  
  try {
    const url = `${ALPHA_VANTAGE_URL}?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${pair}: No data available`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records: string[] = [];
    let count = 0;
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat((values as any)['4. close']);
      if (!isNaN(rate)) {
        records.push(`('${date}', '${from}', '${to}', ${rate}, 'alpha_vantage')`);
        count++;
      }
    }
    
    if (records.length === 0) return 0;
    
    // Single large insert
    const query = `
      INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
      VALUES ${records.join(', ')}
      ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
      rate = EXCLUDED.rate, source = EXCLUDED.source
    `;
    
    await pool.query(query);
    console.log(`${pair}: Added ${count} records`);
    return count;
    
  } catch (error) {
    console.error(`${pair}: Error -`, error);
    return 0;
  }
}

async function batchComplete(): Promise<void> {
  console.log('Batch completing remaining currency pairs...\n');
  
  let total = 0;
  let completed = 0;
  
  for (const pair of REMAINING_PAIRS) {
    const added = await quickPopulate(pair);
    if (added > 0) {
      total += added;
      completed++;
    }
    
    // Shorter wait time for faster completion
    await new Promise(resolve => setTimeout(resolve, 8000));
  }
  
  console.log(`\nBatch completion summary:`);
  console.log(`Completed: ${completed}/${REMAINING_PAIRS.length} pairs`);
  console.log(`Total records: ${total}`);
  
  await pool.end();
}

batchComplete()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Batch completion failed:', error);
    process.exit(1);
  });