/**
 * Comprehensive historical data population script
 * Populates up to 1 year of historical exchange rate data for all supported currency corridors
 * Uses real API data only - no fallback or synthetic data
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Focus on the 3 remaining PKR pairs that need data
const REMAINING_PAIRS = [
  ['GBP', 'PKR'], ['EUR', 'PKR'], ['USD', 'PKR']
];

const pool = new Pool({ connectionString: DATABASE_URL });

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(days: number = 365): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  return { startDate, endDate };
}

async function hasHistoricalData(fromCurrency: string, toCurrency: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM rate_trends WHERE from_currency = $1 AND to_currency = $2',
    [fromCurrency, toCurrency]
  );
  return parseInt(result.rows[0].count) > 1000;
}

async function fetchHistoricalRate(
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<number | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Information']) {
      console.log(`Rate limit reached: ${data['Information']}`);
      return null;
    }
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No historical data available for ${fromCurrency}/${toCurrency}`);
      return null;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    
    // Get all available data, not just specific date
    const records: string[] = [];
    let count = 0;
    
    for (const [dateKey, values] of Object.entries(timeSeries)) {
      const rate = parseFloat((values as any)['4. close']);
      if (!isNaN(rate) && rate > 0) {
        records.push(`('${dateKey}', '${fromCurrency}', '${toCurrency}', ${rate}, 'alpha_vantage')`);
        count++;
      }
    }
    
    if (records.length > 0) {
      // Insert all records at once
      const batchSize = 200;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        await pool.query(`
          INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
          VALUES ${batch.join(', ')}
          ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
          rate = EXCLUDED.rate, source = EXCLUDED.source
        `);
      }
      
      console.log(`Added ${count} historical records for ${fromCurrency}/${toCurrency}`);
      return count;
    }
    
    return null;
    
  } catch (error) {
    console.error(`Error fetching data for ${fromCurrency}/${toCurrency}:`, error.message);
    return null;
  }
}

async function populateCurrencyPair(fromCurrency: string, toCurrency: string): Promise<void> {
  console.log(`\nProcessing ${fromCurrency}/${toCurrency}...`);
  
  // Check if already has sufficient data
  if (await hasHistoricalData(fromCurrency, toCurrency)) {
    console.log(`${fromCurrency}/${toCurrency}: Already has sufficient historical data`);
    return;
  }
  
  console.log(`${fromCurrency}/${toCurrency}: Fetching historical data from Alpha Vantage...`);
  
  const result = await fetchHistoricalRate(fromCurrency, toCurrency, '');
  
  if (result && result > 0) {
    console.log(`${fromCurrency}/${toCurrency}: Successfully populated with ${result} records`);
  } else {
    console.log(`${fromCurrency}/${toCurrency}: No data retrieved`);
  }
}

async function populateAllHistoricalData(): Promise<void> {
  console.log('Populating historical data for remaining PKR currency pairs...\n');
  
  for (const [fromCurrency, toCurrency] of REMAINING_PAIRS) {
    await populateCurrencyPair(fromCurrency, toCurrency);
    
    // Wait between API calls to respect rate limits
    console.log('Waiting 15 seconds before next request...');
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Final verification
  console.log('\n=== Final Status Report ===');
  const finalResult = await pool.query(`
    SELECT 
      from_currency || '/' || to_currency as pair,
      COUNT(*) as records,
      MIN(date) as earliest,
      MAX(date) as latest,
      CASE 
        WHEN COUNT(*) > 2000 THEN 'Complete (7+ years)'
        WHEN COUNT(*) > 1000 THEN 'Complete (3+ years)'
        WHEN COUNT(*) > 100 THEN 'Partial data'
        ELSE 'Minimal data'
      END as status
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY COUNT(*) DESC
  `);
  
  for (const row of finalResult.rows) {
    console.log(`${row.pair}: ${row.records} records (${row.status}) [${row.earliest} to ${row.latest}]`);
  }
  
  await pool.end();
  console.log('\nHistorical data population completed!');
}

populateAllHistoricalData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Population failed:', error);
    process.exit(1);
  });