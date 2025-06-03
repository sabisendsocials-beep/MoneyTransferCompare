/**
 * Run Remaining Population
 * Final push to complete all 15 currency corridors
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const REMAINING = ['USD/KES', 'GBP/INR', 'EUR/INR', 'USD/INR', 'GBP/PKR', 'EUR/PKR', 'USD/PKR'];

const pool = new Pool({ connectionString: DATABASE_URL });

async function populatePair(pair: string) {
  const [from, to] = pair.split('/');
  
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${pair}: No data available`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat((values as any)['4. close']);
      if (!isNaN(rate)) {
        records.push(`('${date}', '${from}', '${to}', ${rate}, 'alpha_vantage')`);
      }
    }
    
    if (records.length === 0) return 0;
    
    await pool.query(`
      INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
      VALUES ${records.join(', ')}
      ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
      rate = EXCLUDED.rate, source = EXCLUDED.source
    `);
    
    console.log(`${pair}: ${records.length} records added`);
    return records.length;
    
  } catch (error) {
    console.error(`${pair}: Error -`, error.message);
    return 0;
  }
}

async function main() {
  console.log('Completing remaining 7 currency pairs...');
  
  let completed = 0;
  let totalRecords = 0;
  
  for (const pair of REMAINING) {
    const records = await populatePair(pair);
    if (records > 0) {
      completed++;
      totalRecords += records;
    }
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  console.log(`Final: ${completed}/7 pairs completed, ${totalRecords} records added`);
  await pool.end();
}

main().catch(console.error);