/**
 * Complete Population for Remaining Currency Pairs
 * Focuses specifically on pairs with insufficient data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({ connectionString: DATABASE_URL });

async function fetchAndStoreCompleteData(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Fetching complete data for ${fromCurrency}/${toCurrency}...`);
  
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Information']) {
      console.log(`Rate limit reached: ${data['Information']}`);
      return 0;
    }
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No data available for ${fromCurrency}/${toCurrency}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records: string[] = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat((values as any)['4. close']);
      if (!isNaN(rate) && rate > 0) {
        records.push(`('${date}', '${fromCurrency}', '${toCurrency}', ${rate}, 'alpha_vantage')`);
      }
    }
    
    if (records.length === 0) return 0;
    
    // Insert in smaller batches
    const batchSize = 200;
    let totalInserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      await pool.query(`
        INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
        VALUES ${batch.join(', ')}
        ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
        rate = EXCLUDED.rate, source = EXCLUDED.source
      `);
      
      totalInserted += batch.length;
    }
    
    console.log(`${fromCurrency}/${toCurrency}: Added ${totalInserted} records`);
    return totalInserted;
    
  } catch (error) {
    console.error(`Error for ${fromCurrency}/${toCurrency}:`, error.message);
    return 0;
  }
}

async function completeRemainingPairs(): Promise<void> {
  const remainingPairs = [
    ['EUR', 'INR'], ['USD', 'INR'], ['GBP', 'PKR'], ['EUR', 'PKR'], ['USD', 'PKR']
  ];
  
  console.log('Completing remaining currency pairs with minimal data...\n');
  
  for (const [from, to] of remainingPairs) {
    const added = await fetchAndStoreCompleteData(from, to);
    console.log(`Completed ${from}/${to}: ${added} records\n`);
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 20000));
  }
  
  // Final status check
  const result = await pool.query(`
    SELECT 
      from_currency || '/' || to_currency as pair,
      COUNT(*) as records,
      CASE WHEN COUNT(*) > 1000 THEN 'Complete' ELSE 'Incomplete' END as status
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY COUNT(*) DESC
  `);
  
  console.log('\nFinal Status:');
  for (const row of result.rows) {
    console.log(`${row.pair}: ${row.records} records (${row.status})`);
  }
  
  await pool.end();
}

completeRemainingPairs().catch(console.error);