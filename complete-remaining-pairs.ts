/**
 * Complete Population for Remaining Currency Pairs
 * Focuses specifically on pairs with insufficient data
 */

import { db } from './server/db';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const REMAINING_PAIRS = [
  ['GBP', 'KES'], ['GBP', 'INR'], ['GBP', 'PKR'],
  ['EUR', 'NGN'], ['EUR', 'GHS'], ['EUR', 'KES'], ['EUR', 'INR'], ['EUR', 'PKR'],
  ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'INR'], ['USD', 'PKR']
];

async function fetchAndStoreCompleteData(fromCurrency: string, toCurrency: string): Promise<number> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  console.log(`Fetching ${fromCurrency}/${toCurrency}...`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No Alpha Vantage data available for ${fromCurrency}/${toCurrency}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    let insertedCount = 0;
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat(values['4. close']);
      if (!isNaN(rate) && rate > 0) {
        try {
          const insertQuery = `INSERT INTO rate_trends (date, from_currency, to_currency, rate) VALUES ('${date}', '${fromCurrency}', '${toCurrency}', ${rate})`;
          await db.execute(insertQuery);
          insertedCount++;
        } catch (error) {
          // Skip duplicate entries
        }
      }
    }
    
    console.log(`✓ ${fromCurrency}/${toCurrency}: ${insertedCount} new records added`);
    return insertedCount;
    
  } catch (error) {
    console.error(`Error processing ${fromCurrency}/${toCurrency}:`, error);
    return 0;
  }
}

async function completeRemainingPairs(): Promise<void> {
  console.log('Completing historical data population for remaining currency pairs...');
  console.log('This process will take approximately 3-4 minutes due to API rate limiting.');
  
  let totalInserted = 0;
  
  for (const [fromCurrency, toCurrency] of REMAINING_PAIRS) {
    const inserted = await fetchAndStoreCompleteData(fromCurrency, toCurrency);
    totalInserted += inserted;
    
    // API rate limiting - 12 second delay between calls
    console.log('Waiting 12 seconds for API rate limiting...');
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  console.log(`\nCompleted! Total new records added: ${totalInserted}`);
  
  // Final summary
  const summary = await db.execute(`
    SELECT from_currency, to_currency, COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY from_currency, to_currency
  `);
  
  console.log('\nFinal Historical Data Summary:');
  console.log('Currency Pair | Records | Date Range');
  console.log('-------------|---------|------------');
  
  for (const row of summary.rows) {
    console.log(`${row.from_currency}/${row.to_currency} | ${row.count} | ${row.earliest} to ${row.latest}`);
  }
  
  const totalRecords = await db.execute('SELECT COUNT(*) as total FROM rate_trends');
  console.log(`\nTotal historical records in database: ${totalRecords.rows[0].total}`);
}

completeRemainingPairs().catch(console.error);