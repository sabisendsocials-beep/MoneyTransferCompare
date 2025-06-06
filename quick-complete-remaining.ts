/**
 * Quick Complete Remaining Currency Pairs
 * Uses Alpha Vantage API to populate all missing pairs immediately
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const MISSING_PAIRS = [
  'GBP/PKR', 'EUR/PKR', 'USD/PKR',
  'EUR/INR', 'USD/INR'
];

async function fetchAndStore(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Fetching ${fromCurrency}/${toCurrency}...`);
  
  // Clear any existing incomplete data
  await db.delete(rateTrends).where(sql`from_currency = ${fromCurrency} AND to_currency = ${toCurrency}`);
  
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${fromCurrency}/${toCurrency}: No Alpha Vantage data available`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records = Object.entries(timeSeries).map(([date, values]) => ({
      date,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: parseFloat((values as any)['4. close']),
      source: 'alpha_vantage'
    }));
    
    if (records.length > 0) {
      await db.insert(rateTrends).values(records);
      console.log(`${fromCurrency}/${toCurrency}: Stored ${records.length} records`);
      return records.length;
    }
    
    return 0;
  } catch (error) {
    console.log(`${fromCurrency}/${toCurrency}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Quick completion of remaining currency pairs...');
  
  let totalRecords = 0;
  let successfulPairs = 0;
  
  for (const pair of MISSING_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await fetchAndStore(from, to);
    
    if (records > 500) {
      successfulPairs++;
    }
    totalRecords += records;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Final verification
  const allPairs = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count
    FROM rate_trends 
    GROUP BY from_currency, to_currency
    ORDER BY count DESC
  `);
  
  console.log('\n=== COMPLETION STATUS ===');
  let completePairs = 0;
  
  for (const row of allPairs.rows) {
    const count = row.count as number;
    if (count > 1000) {
      console.log(`${row.from_currency}/${row.to_currency}: COMPLETE (${count} records)`);
      completePairs++;
    } else {
      console.log(`${row.from_currency}/${row.to_currency}: ${count} records`);
    }
  }
  
  console.log(`\nTotal completed pairs: ${completePairs}/15`);
  console.log(`Records added in this session: ${totalRecords}`);
  
  if (completePairs >= 12) {
    console.log('SUCCESS: Major currency corridors completed with authentic Alpha Vantage data');
  }
}

main().catch(console.error);