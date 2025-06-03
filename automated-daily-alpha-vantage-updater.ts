/**
 * Automated Daily Alpha Vantage Updater
 * Runs daily to fetch latest rates and maintain historical data completeness
 * Integrates with existing scheduler for seamless operation
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Only the 1 remaining pair that needs completion
const FINAL_PAIRS = [
  ['USD', 'PKR']
];

const pool = new Pool({ connectionString: DATABASE_URL });

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getLatestDataDate(fromCurrency: string, toCurrency: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT MAX(date) as latest_date FROM rate_trends WHERE from_currency = $1 AND to_currency = $2',
    [fromCurrency, toCurrency]
  );
  return result.rows[0]?.latest_date || null;
}

async function fetchLatestRateFromAlphaVantage(fromCurrency: string, toCurrency: string): Promise<number | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Information']) {
      console.log(`Alpha Vantage rate limit: ${data['Information']}`);
      return null;
    }
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No Alpha Vantage data for ${fromCurrency}/${toCurrency}`);
      return null;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records: string[] = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat((values as any)['4. close']);
      if (!isNaN(rate) && rate > 0) {
        records.push(`('${date}', '${fromCurrency}', '${toCurrency}', ${rate}, 'alpha_vantage')`);
      }
    }
    
    if (records.length > 0) {
      // Insert all historical data
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
      
      console.log(`Updated ${fromCurrency}/${toCurrency} with ${records.length} records`);
      return records.length;
    }
    
    return null;
    
  } catch (error) {
    console.error(`Error fetching ${fromCurrency}/${toCurrency}:`, error.message);
    return null;
  }
}

async function updateDailyRate(fromCurrency: string, toCurrency: string): Promise<boolean> {
  console.log(`Updating ${fromCurrency}/${toCurrency}...`);
  
  const result = await fetchLatestRateFromAlphaVantage(fromCurrency, toCurrency);
  
  if (result && result > 0) {
    console.log(`✓ ${fromCurrency}/${toCurrency}: Added ${result} records`);
    return true;
  } else {
    console.log(`✗ ${fromCurrency}/${toCurrency}: No data retrieved`);
    return false;
  }
}

export async function runDailyAlphaVantageUpdate(): Promise<void> {
  console.log('Running final completion for remaining PKR pairs...\n');
  
  let completed = 0;
  
  for (const [from, to] of FINAL_PAIRS) {
    const success = await updateDailyRate(from, to);
    if (success) completed++;
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  console.log(`\nCompleted ${completed}/${FINAL_PAIRS.length} remaining pairs`);
  
  // Final verification
  const result = await pool.query(`
    SELECT 
      from_currency || '/' || to_currency as pair,
      COUNT(*) as records,
      CASE WHEN COUNT(*) > 1000 THEN 'Complete' ELSE 'Incomplete' END as status
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY COUNT(*) DESC
  `);
  
  console.log('\n=== Final Historical Data Status ===');
  let totalComplete = 0;
  for (const row of result.rows) {
    console.log(`${row.pair}: ${row.records} records (${row.status})`);
    if (row.status === 'Complete') totalComplete++;
  }
  
  console.log(`\nSummary: ${totalComplete}/15 currency pairs with complete historical data`);
  
  await pool.end();
}

// Run immediately when called
runDailyAlphaVantageUpdate()
  .then(() => {
    console.log('Final completion process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Final completion failed:', error);
    process.exit(1);
  });