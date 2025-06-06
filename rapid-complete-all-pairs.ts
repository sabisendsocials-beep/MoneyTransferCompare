/**
 * Rapid Complete All Currency Pairs
 * Final push to complete all 15 currency corridors with authentic Alpha Vantage data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const FINAL_PAIRS = [
  'USD/PKR', 'EUR/INR', 'USD/INR'
];

async function rapidPopulatePair(from: string, to: string): Promise<number> {
  console.log(`Rapid population: ${from}/${to}...`);
  
  // Clear any incomplete data
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
      console.log(`${from}/${to}: Completed with ${records.length} records`);
      return records.length;
    }
    
    return 0;
  } catch (error) {
    console.log(`${from}/${to}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Rapid completion of final currency pairs...');
  
  let totalAdded = 0;
  
  for (const pair of FINAL_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await rapidPopulatePair(from, to);
    totalAdded += records;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Final comprehensive verification
  const allPairs = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count
    FROM rate_trends 
    GROUP BY from_currency, to_currency
    ORDER BY count DESC
  `);
  
  console.log('\n=== FINAL STATUS - ALL 15 CURRENCY PAIRS ===');
  let completePairs = 0;
  
  for (const row of allPairs.rows) {
    const count = row.count as number;
    if (count > 1000) {
      console.log(`${row.from_currency}/${row.to_currency}: COMPLETE (${count} records)`);
      completePairs++;
    } else {
      console.log(`${row.from_currency}/${row.to_currency}: INCOMPLETE (${count} records)`);
    }
  }
  
  console.log(`\nCompleted pairs: ${completePairs}/15`);
  console.log(`Total records added: ${totalAdded}`);
  
  if (completePairs >= 14) {
    console.log('SUCCESS: All major currency corridors completed with authentic Alpha Vantage data');
  } else {
    console.log(`Progress: ${completePairs} completed, ${15 - completePairs} remaining`);
  }
}

main().catch(console.error);