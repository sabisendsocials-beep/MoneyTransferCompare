/**
 * Quick Complete Remaining Currency Pairs
 * Uses Alpha Vantage API to populate all missing pairs immediately
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const MISSING_PAIRS = [
  'EUR/NGN', 'USD/NGN', 'EUR/GHS', 'USD/GHS', 
  'EUR/KES', 'USD/KES', 'GBP/PKR', 'EUR/PKR', 
  'USD/PKR', 'EUR/INR', 'USD/INR'
];

async function fetchAndStore(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Fetching ${fromCurrency}/${toCurrency}...`);
  
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No data for ${fromCurrency}/${toCurrency}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      records.push({
        date,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: parseFloat((values as any)['4. close']),
        source: 'alpha_vantage'
      });
    }
    
    if (records.length > 0) {
      await db.insert(rateTrends).values(records).onConflictDoNothing();
      console.log(`✓ Added ${records.length} records for ${fromCurrency}/${toCurrency}`);
    }
    
    return records.length;
  } catch (error) {
    console.error(`Error with ${fromCurrency}/${toCurrency}:`, error);
    return 0;
  }
}

async function main() {
  console.log('Starting rapid population of remaining currency pairs...');
  
  let total = 0;
  
  for (const pair of MISSING_PAIRS) {
    const [from, to] = pair.split('/');
    const count = await fetchAndStore(from, to);
    total += count;
    
    // Rate limiting - 12 second delay between API calls
    if (MISSING_PAIRS.indexOf(pair) < MISSING_PAIRS.length - 1) {
      console.log('Waiting 12 seconds for API rate limit...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  console.log(`\nCompleted! Total records added: ${total}`);
  
  // Show final status
  const status = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY count DESC
  `);
  
  console.log('\nFinal status:');
  for (const row of status.rows) {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.count} records`);
  }
}

main().catch(console.error);