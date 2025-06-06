/**
 * Ultimate Restoration - Complete All Currency Pairs
 * Final comprehensive restoration of all 15 currency corridors
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const INCOMPLETE_PAIRS = [
  'EUR/KES', 'USD/KES', 'GBP/PKR', 'EUR/PKR', 'USD/PKR', 
  'EUR/INR', 'USD/INR', 'GBP/INR'
];

async function restoreAuthenticData(from: string, to: string): Promise<number> {
  console.log(`Restoring ${from}/${to} with Alpha Vantage data...`);
  
  // Clear any incomplete/corrupted data
  await db.delete(rateTrends).where(sql`from_currency = ${from} AND to_currency = ${to}`);
  
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${from}/${to}: No Alpha Vantage data available`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records = Object.entries(timeSeries).map(([date, values]) => ({
      date,
      from_currency: from,
      to_currency: to,
      rate: parseFloat((values as any)['4. close']),
      source: 'alpha_vantage'
    }));
    
    if (records.length > 0) {
      await db.insert(rateTrends).values(records);
      console.log(`${from}/${to}: Restored ${records.length} authentic records`);
      return records.length;
    }
    
    return 0;
  } catch (error) {
    console.log(`${from}/${to}: Alpha Vantage error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Ultimate restoration starting - completing all 15 currency pairs...');
  
  let totalRestored = 0;
  let successfulPairs = 0;
  
  for (const pair of INCOMPLETE_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await restoreAuthenticData(from, to);
    
    if (records > 500) {
      successfulPairs++;
    }
    totalRestored += records;
    
    // API rate limiting
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Final comprehensive verification
  const allPairs = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count, source
    FROM rate_trends 
    GROUP BY from_currency, to_currency, source
    ORDER BY count DESC
  `);
  
  console.log('\n=== ULTIMATE RESTORATION COMPLETE ===');
  let completePairs = 0;
  
  for (const row of allPairs.rows) {
    const count = row.count as number;
    const isComplete = count > 1000 ? 'COMPLETE' : `${count} records`;
    console.log(`${row.from_currency}/${row.to_currency}: ${isComplete} (${row.source || 'no source'})`);
    if (count > 1000) completePairs++;
  }
  
  console.log(`\nTotal pairs with authentic data: ${completePairs}/15`);
  console.log(`Records restored in this session: ${totalRestored}`);
  
  if (completePairs >= 12) {
    console.log('SUCCESS: Major currency corridors completed with authentic Alpha Vantage data');
  } else {
    console.log(`Progress: ${completePairs} pairs completed, ${15 - completePairs} still need restoration`);
  }
}

main().catch(console.error);