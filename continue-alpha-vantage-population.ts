/**
 * Continue Alpha Vantage Population for Remaining Currency Pairs
 * Focuses on pairs that still need historical data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

if (!ALPHA_VANTAGE_API_KEY) {
  console.error('ALPHA_VANTAGE_API_KEY is required');
  process.exit(1);
}

// All 15 currency corridors
const CURRENCY_PAIRS = [
  ['GBP', 'GHS'], ['GBP', 'KES'], ['GBP', 'INR'], ['GBP', 'PKR'],
  ['EUR', 'NGN'], ['EUR', 'GHS'], ['EUR', 'KES'], ['EUR', 'INR'], ['EUR', 'PKR'],
  ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'INR'], ['USD', 'PKR']
];

async function checkExistingData(fromCurrency: string, toCurrency: string): Promise<number> {
  const result = await db.execute(`
    SELECT COUNT(*) as count 
    FROM rate_trends 
    WHERE from_currency = $1 AND to_currency = $2
  `, [fromCurrency, toCurrency]);
  
  return parseInt(result.rows[0].count);
}

async function fetchAndStoreHistoricalData(fromCurrency: string, toCurrency: string): Promise<boolean> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No Alpha Vantage data for ${fromCurrency}/${toCurrency}`);
      return false;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const historicalData = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat(values['4. close']);
      if (!isNaN(rate) && rate > 0) {
        historicalData.push([date, fromCurrency, toCurrency, rate]);
      }
    }
    
    // Insert data using raw SQL to avoid type issues
    for (const [date, from_currency, to_currency, rate] of historicalData) {
      await db.execute(
        'INSERT INTO rate_trends (date, from_currency, to_currency, rate) VALUES ($1, $2, $3, $4)',
        [date, from_currency, to_currency, rate]
      );
    }
    
    console.log(`✓ ${fromCurrency}/${toCurrency}: ${historicalData.length} data points stored`);
    return true;
    
  } catch (error) {
    console.error(`Error with ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

async function populateRemainingPairs(): Promise<void> {
  console.log('Continuing Alpha Vantage historical data population for remaining currency pairs...');
  
  for (const [fromCurrency, toCurrency] of CURRENCY_PAIRS) {
    console.log(`\nProcessing ${fromCurrency}/${toCurrency}...`);
    
    const existingCount = await checkExistingData(fromCurrency, toCurrency);
    if (existingCount > 0) {
      console.log(`Skipping ${fromCurrency}/${toCurrency} - already has ${existingCount} records`);
      continue;
    }
    
    await fetchAndStoreHistoricalData(fromCurrency, toCurrency);
    
    // Rate limiting - wait 12 seconds between API calls
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  console.log('\nHistorical data population completed for all remaining currency pairs.');
  
  // Final summary
  const summary = await db.execute(`
    SELECT from_currency, to_currency, COUNT(*) as record_count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY from_currency, to_currency
  `);
  
  console.log('\nFinal Summary:');
  for (const row of summary.rows) {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.record_count} records`);
  }
}

populateRemainingPairs().catch(console.error);