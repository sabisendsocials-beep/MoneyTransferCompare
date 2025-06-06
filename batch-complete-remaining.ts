/**
 * Batch Complete Remaining Currency Pairs
 * Fast completion for the 14 pairs that still need data
 */

import { db } from './server/db';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const REMAINING_PAIRS = [
  'GBP/GHS', 'GBP/KES', 'GBP/INR', 'GBP/PKR',
  'EUR/NGN', 'EUR/GHS', 'EUR/KES', 'EUR/INR', 'EUR/PKR',
  'USD/NGN', 'USD/GHS', 'USD/KES', 'USD/INR', 'USD/PKR'
];

async function quickPopulate(pair: string): Promise<number> {
  const [fromCurrency, toCurrency] = pair.split('/');
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No data for ${pair}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    let inserted = 0;
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat(values['4. close']);
      if (!isNaN(rate) && rate > 0) {
        try {
          await db.execute(
            `INSERT INTO rate_trends (date, from_currency, to_currency, rate) 
             VALUES ('${date}', '${fromCurrency}', '${toCurrency}', ${rate})`
          );
          inserted++;
        } catch (error) {
          // Skip duplicates
        }
      }
    }
    
    console.log(`✓ ${pair}: ${inserted} data points`);
    return inserted;
    
  } catch (error) {
    console.error(`Error with ${pair}:`, error);
    return 0;
  }
}

async function batchComplete(): Promise<void> {
  console.log('Completing historical data for remaining 14 currency pairs...');
  
  for (const pair of REMAINING_PAIRS) {
    await quickPopulate(pair);
    // 12 second delay for API rate limiting
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  // Final count
  const result = await db.execute('SELECT COUNT(*) as total FROM rate_trends');
  console.log(`\nCompleted! Total historical records: ${result.rows[0].total}`);
  
  // Summary by pair
  const summary = await db.execute(`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY from_currency, to_currency
  `);
  
  console.log('\nCurrency Pair Summary:');
  for (const row of summary.rows) {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.count} records`);
  }
}

batchComplete().catch(console.error);