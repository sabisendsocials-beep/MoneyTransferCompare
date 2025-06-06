/**
 * Accelerated Complete Restoration
 * Final push to restore all 15 currency pairs with authentic Alpha Vantage data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const ALL_PAIRS = [
  'GBP/NGN', 'EUR/NGN', 'USD/NGN', // Nigeria
  'GBP/GHS', 'EUR/GHS', 'USD/GHS', // Ghana  
  'GBP/KES', 'EUR/KES', 'USD/KES', // Kenya
  'GBP/INR', 'EUR/INR', 'USD/INR', // India
  'GBP/PKR', 'EUR/PKR', 'USD/PKR'  // Pakistan
];

async function restorePair(from: string, to: string): Promise<number> {
  console.log(`Restoring ${from}/${to}...`);
  
  // Check current count
  const current = await db.execute(sql`
    SELECT COUNT(*) as count FROM rate_trends 
    WHERE from_currency = ${from} AND to_currency = ${to}
  `);
  
  const currentCount = current.rows[0].count as number;
  
  if (currentCount > 1000) {
    console.log(`${from}/${to}: Already complete with ${currentCount} records`);
    return currentCount;
  }
  
  // Clear incomplete data
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
    console.log(`${from}/${to}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Accelerated restoration starting - all 15 currency pairs...');
  
  let totalRestored = 0;
  let completePairs = 0;
  
  for (const pair of ALL_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await restorePair(from, to);
    
    if (records > 1000) {
      completePairs++;
    }
    totalRestored += records;
    
    // Rate limiting for Alpha Vantage
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  // Final verification
  const allPairs = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count
    FROM rate_trends 
    GROUP BY from_currency, to_currency
    ORDER BY count DESC
  `);
  
  console.log('\n=== RESTORATION COMPLETE ===');
  let verifiedComplete = 0;
  
  for (const row of allPairs.rows) {
    const count = row.count as number;
    const status = count > 1000 ? 'COMPLETE' : `INCOMPLETE (${count})`;
    console.log(`${row.from_currency}/${row.to_currency}: ${status}`);
    if (count > 1000) verifiedComplete++;
  }
  
  console.log(`\nTotal complete pairs: ${verifiedComplete}/15`);
  console.log(`Records restored: ${totalRestored}`);
  
  if (verifiedComplete >= 12) {
    console.log('SUCCESS: Major currency corridors completed');
  }
}

main().catch(console.error);