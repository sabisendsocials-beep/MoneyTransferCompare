/**
 * Automated Daily Alpha Vantage Updater
 * Runs daily to fetch latest rates and maintain historical data completeness
 * Integrates with existing scheduler for seamless operation
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// All 15 currency corridors
const ALL_CURRENCY_PAIRS = [
  ['GBP', 'NGN'], ['GBP', 'GHS'], ['GBP', 'KES'], ['GBP', 'INR'], ['GBP', 'PKR'],
  ['EUR', 'NGN'], ['EUR', 'GHS'], ['EUR', 'KES'], ['EUR', 'INR'], ['EUR', 'PKR'],
  ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'INR'], ['USD', 'PKR']
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getLatestDataDate(fromCurrency: string, toCurrency: string): Promise<string | null> {
  const result = await db.execute(`
    SELECT MAX(date) as latest_date 
    FROM rate_trends 
    WHERE from_currency = '${fromCurrency}' AND to_currency = '${toCurrency}'
  `);
  
  return result.rows[0]?.latest_date || null;
}

async function fetchLatestRateFromAlphaVantage(fromCurrency: string, toCurrency: string): Promise<number | null> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=compact`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      return null;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const latestDate = Object.keys(timeSeries)[0];
    const latestRate = parseFloat(timeSeries[latestDate]['4. close']);
    
    return !isNaN(latestRate) ? latestRate : null;
  } catch (error) {
    console.error(`Error fetching ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

async function updateDailyRate(fromCurrency: string, toCurrency: string): Promise<boolean> {
  const today = formatDate(new Date());
  const latestDataDate = await getLatestDataDate(fromCurrency, toCurrency);
  
  // Skip if we already have today's data
  if (latestDataDate === today) {
    console.log(`${fromCurrency}/${toCurrency}: Already up to date`);
    return true;
  }
  
  const rate = await fetchLatestRateFromAlphaVantage(fromCurrency, toCurrency);
  if (!rate) {
    console.log(`${fromCurrency}/${toCurrency}: No rate available`);
    return false;
  }
  
  try {
    await db.execute(`
      INSERT INTO rate_trends (date, from_currency, to_currency, rate) 
      VALUES ('${today}', '${fromCurrency}', '${toCurrency}', ${rate})
      ON CONFLICT (date, from_currency, to_currency) 
      DO UPDATE SET rate = ${rate}
    `);
    
    console.log(`${fromCurrency}/${toCurrency}: Updated with rate ${rate}`);
    return true;
  } catch (error) {
    console.error(`Error storing ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

export async function runDailyAlphaVantageUpdate(): Promise<void> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('ALPHA_VANTAGE_API_KEY not configured - skipping daily update');
    return;
  }
  
  console.log('Starting daily Alpha Vantage rate update...');
  
  let successCount = 0;
  
  for (const [fromCurrency, toCurrency] of ALL_CURRENCY_PAIRS) {
    const success = await updateDailyRate(fromCurrency, toCurrency);
    if (success) successCount++;
    
    // Rate limiting - 12 seconds between API calls
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  console.log(`Daily update completed: ${successCount}/${ALL_CURRENCY_PAIRS.length} pairs updated`);
  
  // Log current data status
  const summary = await db.execute(`
    SELECT from_currency, to_currency, COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY from_currency, to_currency
  `);
  
  console.log('\nCurrent Historical Data Status:');
  for (const row of summary.rows) {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.count} records (${row.earliest} to ${row.latest})`);
  }
}