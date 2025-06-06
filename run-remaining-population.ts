/**
 * Run Remaining Population
 * Final push to complete all 15 currency corridors
 */

import { db } from './server/db';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const PAIRS_TO_COMPLETE = [
  'GBP/PKR',
  'EUR/NGN', 'EUR/GHS', 'EUR/KES', 'EUR/INR', 'EUR/PKR',
  'USD/NGN', 'USD/GHS', 'USD/KES', 'USD/INR', 'USD/PKR'
];

async function populatePair(pair: string) {
  const [from, to] = pair.split('/');
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  console.log(`Fetching ${pair}...`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No data for ${pair}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    let count = 0;
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat(values['4. close']);
      if (!isNaN(rate) && rate > 0) {
        try {
          await db.execute(`INSERT INTO rate_trends (date, from_currency, to_currency, rate) VALUES ('${date}', '${from}', '${to}', ${rate})`);
          count++;
        } catch {
          // Skip duplicates
        }
      }
    }
    
    console.log(`✓ ${pair}: ${count} records`);
    return count;
    
  } catch (error) {
    console.error(`Error with ${pair}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('Completing remaining currency pairs...');
  
  let total = 0;
  for (const pair of PAIRS_TO_COMPLETE) {
    const added = await populatePair(pair);
    total += added;
    
    // API rate limiting
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  console.log(`\nTotal added: ${total}`);
  
  // Final summary
  const summary = await db.execute(`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY from_currency, to_currency
  `);
  
  console.log('\nAll Currency Pairs:');
  for (const row of summary.rows) {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.count} records`);
  }
  
  const total_count = await db.execute('SELECT COUNT(*) as total FROM rate_trends');
  console.log(`\nTotal historical records: ${total_count.rows[0].total}`);
}

main().catch(console.error);