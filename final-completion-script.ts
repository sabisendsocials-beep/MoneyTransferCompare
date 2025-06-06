/**
 * Final Completion Script for All Currency Pairs
 * Completes historical data for the 12 remaining pairs with minimal data
 */

import { db } from './server/db';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const FINAL_PAIRS = [
  ['GBP', 'INR'], ['GBP', 'PKR'],
  ['EUR', 'NGN'], ['EUR', 'GHS'], ['EUR', 'KES'], ['EUR', 'INR'], ['EUR', 'PKR'],
  ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'INR'], ['USD', 'PKR']
];

async function populatePair(fromCurrency: string, toCurrency: string): Promise<number> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  console.log(`Processing ${fromCurrency}/${toCurrency}...`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No data available for ${fromCurrency}/${toCurrency}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    let count = 0;
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat(values['4. close']);
      if (!isNaN(rate) && rate > 0) {
        try {
          await db.execute(
            `INSERT INTO rate_trends (date, from_currency, to_currency, rate) VALUES ('${date}', '${fromCurrency}', '${toCurrency}', ${rate})`
          );
          count++;
        } catch {
          // Skip duplicates
        }
      }
    }
    
    console.log(`✓ ${fromCurrency}/${toCurrency}: ${count} records added`);
    return count;
    
  } catch (error) {
    console.error(`Error with ${fromCurrency}/${toCurrency}:`, error.message);
    return 0;
  }
}

async function completeAllPairs(): Promise<void> {
  console.log('Final completion of all 12 remaining currency pairs...');
  
  let totalAdded = 0;
  
  for (const [from, to] of FINAL_PAIRS) {
    const added = await populatePair(from, to);
    totalAdded += added;
    
    // API rate limiting
    console.log('Waiting 12 seconds...');
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  console.log(`\nTotal records added: ${totalAdded}`);
  
  // Final verification
  const finalCount = await db.execute('SELECT COUNT(*) as total FROM rate_trends');
  console.log(`Total historical records: ${finalCount.rows[0].total}`);
  
  const pairSummary = await db.execute(`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY from_currency, to_currency
  `);
  
  console.log('\nCurrency Pair Summary:');
  for (const row of pairSummary.rows) {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.count} records`);
  }
}

completeAllPairs().catch(console.error);