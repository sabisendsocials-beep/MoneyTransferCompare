/**
 * Final Completion Script for All Currency Pairs
 * Completes historical data for the 6 remaining pairs with minimal data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const FINAL_PAIRS = ['GBP/INR', 'EUR/INR', 'USD/INR', 'GBP/PKR', 'EUR/PKR', 'USD/PKR'];

const pool = new Pool({ connectionString: DATABASE_URL });

async function populatePair(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`\nPopulating ${fromCurrency}/${toCurrency}...`);
  
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Information']) {
      console.log(`${fromCurrency}/${toCurrency}: API rate limit - ${data['Information']}`);
      return 0;
    }
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${fromCurrency}/${toCurrency}: No time series data available`);
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
    
    if (records.length === 0) {
      console.log(`${fromCurrency}/${toCurrency}: No valid rate data found`);
      return 0;
    }
    
    // Insert in batches to avoid query length limits
    const batchSize = 500;
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
    
    console.log(`${fromCurrency}/${toCurrency}: Successfully added ${totalInserted} records`);
    return totalInserted;
    
  } catch (error) {
    console.error(`${fromCurrency}/${toCurrency}: Error -`, error.message);
    return 0;
  }
}

async function completeAllPairs(): Promise<void> {
  console.log('Final completion for remaining currency pairs...\n');
  
  let totalCompleted = 0;
  let totalRecords = 0;
  
  for (const pair of FINAL_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await populatePair(from, to);
    
    if (records > 0) {
      totalCompleted++;
      totalRecords += records;
    }
    
    // Wait between requests to respect API limits
    console.log('Waiting 15 seconds before next request...');
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  console.log(`\n=== Final Completion Summary ===`);
  console.log(`Pairs completed: ${totalCompleted}/${FINAL_PAIRS.length}`);
  console.log(`Total records added: ${totalRecords}`);
  
  // Final verification
  const result = await pool.query(`
    SELECT 
      from_currency || '/' || to_currency as pair,
      COUNT(*) as records,
      CASE WHEN COUNT(*) > 1000 THEN 'Complete' ELSE 'Minimal' END as status
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY COUNT(*) DESC
  `);
  
  console.log('\n=== All Currency Pairs Status ===');
  for (const row of result.rows) {
    console.log(`${row.pair}: ${row.records} records (${row.status})`);
  }
  
  await pool.end();
}

completeAllPairs()
  .then(() => {
    console.log('\nHistorical data population completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Final completion failed:', error);
    process.exit(1);
  });