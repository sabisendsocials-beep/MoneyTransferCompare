/**
 * Accelerated Complete Restoration
 * Final push to restore all 15 currency pairs with authentic Alpha Vantage data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const REMAINING_PAIRS = [
  'EUR/GHS', 'EUR/KES', 'USD/KES', 'GBP/PKR', 'EUR/PKR', 
  'USD/PKR', 'EUR/INR', 'USD/INR', 'GBP/INR'
];

async function restorePair(from: string, to: string): Promise<number> {
  console.log(`Restoring ${from}/${to}...`);
  
  // Clear corrupted data
  await db.delete(rateTrends).where(sql`from_currency = ${from} AND to_currency = ${to}`);
  
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${from}/${to}: No data available`);
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
      console.log(`${from}/${to}: Restored ${records.length} records`);
      return records.length;
    }
    
    return 0;
  } catch (error) {
    console.log(`${from}/${to}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Accelerated restoration starting...');
  
  let totalRecords = 0;
  let completedPairs = 0;
  
  for (const pair of REMAINING_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await restorePair(from, to);
    
    if (records > 1000) {
      completedPairs++;
    }
    totalRecords += records;
    
    // Minimal delay for rapid completion
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  console.log(`\nTotal records restored: ${totalRecords}`);
  console.log(`Pairs completed in this session: ${completedPairs}`);
  
  // Final status check
  const status = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY count DESC
  `);
  
  console.log('\n=== FINAL STATUS ===');
  let authenticPairs = 0;
  
  for (const row of status.rows) {
    const count = row.count as number;
    const isComplete = count > 1000 ? 'COMPLETE' : `${count} records`;
    console.log(`${row.from_currency}/${row.to_currency}: ${isComplete}`);
    if (count > 1000) authenticPairs++;
  }
  
  console.log(`\nTotal completed pairs: ${authenticPairs}/15`);
}

main().catch(console.error);