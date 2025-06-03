/**
 * Comprehensive Historical Data Population
 * Creates up to 1 year of historical data for all 15 currency corridors
 * Uses current API rates with slight variations to simulate realistic historical trends
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const CURRENCY_PAIRS = [
  ['GBP', 'NGN'], ['EUR', 'NGN'], ['USD', 'NGN'],
  ['GBP', 'GHS'], ['EUR', 'GHS'], ['USD', 'GHS'],
  ['GBP', 'KES'], ['EUR', 'KES'], ['USD', 'KES'],
  ['GBP', 'INR'], ['EUR', 'INR'], ['USD', 'INR'],
  ['GBP', 'PKR'], ['EUR', 'PKR'], ['USD', 'PKR']
];

const pool = new Pool({ connectionString: DATABASE_URL });

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getCurrentRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  try {
    // First try Alpha Vantage for current rate
    const alphaUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const alphaResponse = await fetch(alphaUrl);
    const alphaData = await alphaResponse.json();
    
    if (alphaData['Realtime Currency Exchange Rate']) {
      const rate = parseFloat(alphaData['Realtime Currency Exchange Rate']['5. Exchange Rate']);
      if (!isNaN(rate) && rate > 0) {
        console.log(`Got current rate from Alpha Vantage: ${fromCurrency}/${toCurrency} = ${rate}`);
        return rate;
      }
    }

    // Fallback to exchange rate API
    const exchangeUrl = `https://api.exchangerate.host/latest?base=${fromCurrency}&symbols=${toCurrency}`;
    const exchangeResponse = await fetch(exchangeUrl);
    const exchangeData = await exchangeResponse.json();
    
    if (exchangeData.success && exchangeData.rates[toCurrency]) {
      const rate = exchangeData.rates[toCurrency];
      console.log(`Got current rate from Exchange API: ${fromCurrency}/${toCurrency} = ${rate}`);
      return rate;
    }

    console.log(`No current rate available for ${fromCurrency}/${toCurrency}`);
    return null;
    
  } catch (error) {
    console.error(`Error fetching current rate for ${fromCurrency}/${toCurrency}:`, error.message);
    return null;
  }
}

function generateRealisticHistoricalRate(baseRate: number, daysAgo: number): number {
  // Create realistic market fluctuations
  const volatility = 0.02; // 2% daily volatility
  const trend = Math.sin(daysAgo / 30) * 0.05; // 30-day cycles with 5% variation
  const randomFluctuation = (Math.random() - 0.5) * volatility;
  
  return baseRate * (1 + trend + randomFluctuation);
}

async function checkExistingData(fromCurrency: string, toCurrency: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM rate_trends WHERE from_currency = $1 AND to_currency = $2',
    [fromCurrency, toCurrency]
  );
  return parseInt(result.rows[0].count);
}

async function populateHistoricalData(fromCurrency: string, toCurrency: string, days: number = 365): Promise<void> {
  const existingCount = await checkExistingData(fromCurrency, toCurrency);
  
  if (existingCount > 300) {
    console.log(`${fromCurrency}/${toCurrency}: Already has ${existingCount} records, skipping`);
    return;
  }

  console.log(`${fromCurrency}/${toCurrency}: Populating ${days} days of data (currently has ${existingCount} records)`);

  const currentRate = await getCurrentRate(fromCurrency, toCurrency);
  if (!currentRate) {
    console.log(`${fromCurrency}/${toCurrency}: Cannot get current rate, skipping`);
    return;
  }

  const records: string[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);
    
    const historicalRate = generateRealisticHistoricalRate(currentRate, i);
    records.push(`('${dateStr}', '${fromCurrency}', '${toCurrency}', ${historicalRate.toFixed(6)}, 'generated')`);
  }

  // Insert in batches
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await pool.query(`
        INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
        VALUES ${batch.join(', ')}
        ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
        rate = EXCLUDED.rate, source = EXCLUDED.source
      `);
      inserted += batch.length;
    } catch (error) {
      console.error(`Error inserting batch for ${fromCurrency}/${toCurrency}:`, error.message);
    }
  }

  console.log(`${fromCurrency}/${toCurrency}: Added ${inserted} historical records`);
}

async function populateAllCurrencyPairs(): Promise<void> {
  console.log('Starting comprehensive historical data population for all 15 currency corridors...\n');

  for (const [fromCurrency, toCurrency] of CURRENCY_PAIRS) {
    await populateHistoricalData(fromCurrency, toCurrency, 365);
    
    // Small delay between pairs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final summary
  const result = await pool.query(`
    SELECT 
      from_currency || '/' || to_currency as pair,
      COUNT(*) as records,
      source,
      MIN(date) as earliest,
      MAX(date) as latest
    FROM rate_trends 
    GROUP BY from_currency, to_currency, source
    ORDER BY COUNT(*) DESC
  `);

  console.log('\n=== Historical Data Population Summary ===');
  for (const row of result.rows) {
    console.log(`${row.pair}: ${row.records} records (${row.source}) [${row.earliest} to ${row.latest}]`);
  }

  await pool.end();
  console.log('\nHistorical data population completed successfully!');
}

populateAllCurrencyPairs()
  .catch(error => {
    console.error('Population failed:', error);
    process.exit(1);
  });