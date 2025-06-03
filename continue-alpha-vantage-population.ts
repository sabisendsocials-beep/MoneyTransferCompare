/**
 * Continue Alpha Vantage Population for Remaining Currency Pairs
 * Focuses on pairs that still need historical data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({ connectionString: DATABASE_URL });

async function checkExistingData(fromCurrency: string, toCurrency: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM rate_trends WHERE from_currency = $1 AND to_currency = $2',
    [fromCurrency, toCurrency]
  );
  return parseInt(result.rows[0].count);
}

async function fetchAndStoreHistoricalData(fromCurrency: string, toCurrency: string): Promise<boolean> {
  const existing = await checkExistingData(fromCurrency, toCurrency);
  if (existing > 1000) {
    console.log(`${fromCurrency}/${toCurrency}: Already has ${existing} records`);
    return true;
  }

  console.log(`${fromCurrency}/${toCurrency}: Fetching data (currently has ${existing} records)...`);
  
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Information']) {
      console.log(`${fromCurrency}/${toCurrency}: Rate limit - ${data['Information']}`);
      return false;
    }
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${fromCurrency}/${toCurrency}: No data available`);
      return false;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records: string[] = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat((values as any)['4. close']);
      if (!isNaN(rate) && rate > 0) {
        records.push(`('${date}', '${fromCurrency}', '${toCurrency}', ${rate}, 'alpha_vantage')`);
      }
    }
    
    if (records.length === 0) return false;
    
    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      await pool.query(`
        INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
        VALUES ${batch.join(', ')}
        ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
        rate = EXCLUDED.rate, source = EXCLUDED.source
      `);
    }
    
    console.log(`${fromCurrency}/${toCurrency}: Added ${records.length} records`);
    return true;
    
  } catch (error) {
    console.error(`${fromCurrency}/${toCurrency}: Error -`, error.message);
    return false;
  }
}

async function populateRemainingPairs(): Promise<void> {
  const pairs = [
    ['USD', 'INR'], ['USD', 'PKR'], ['EUR', 'PKR'], ['GBP', 'PKR']
  ];
  
  console.log('Populating remaining currency pairs...\n');
  
  for (const [from, to] of pairs) {
    await fetchAndStoreHistoricalData(from, to);
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  // Summary
  const result = await pool.query(`
    SELECT 
      from_currency || '/' || to_currency as pair,
      COUNT(*) as records
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY COUNT(*) DESC
  `);
  
  console.log('\nFinal Summary:');
  for (const row of result.rows) {
    const status = row.records > 1000 ? 'Complete' : 'Incomplete';
    console.log(`${row.pair}: ${row.records} records (${status})`);
  }
  
  await pool.end();
}

populateRemainingPairs().catch(console.error);