/**
 * Final Batch Completion - All Remaining Currency Pairs
 * Systematically populates authentic Alpha Vantage data for all missing pairs
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const REMAINING_PAIRS = [
  'USD/KES', 'GBP/PKR', 'EUR/PKR', 'USD/PKR', 
  'EUR/INR', 'USD/INR'
];

async function checkExisting(from: string, to: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count FROM rate_trends 
    WHERE from_currency = ${from} AND to_currency = ${to}
  `);
  return result.rows[0].count as number;
}

async function populatePair(from: string, to: string): Promise<number> {
  const existing = await checkExisting(from, to);
  
  if (existing > 1000) {
    console.log(`${from}/${to}: Already complete with ${existing} records`);
    return existing;
  }
  
  console.log(`Populating ${from}/${to} with Alpha Vantage data...`);
  
  // Clear any partial data
  await db.delete(rateTrends).where(sql`from_currency = ${from} AND to_currency = ${to}`);
  
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${from}/${to}: No data available from Alpha Vantage`);
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
      console.log(`${from}/${to}: Added ${records.length} authentic records`);
      return records.length;
    }
    
    return 0;
  } catch (error) {
    console.log(`${from}/${to}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Final batch completion starting...');
  
  let totalAdded = 0;
  let completedCount = 0;
  
  for (const pair of REMAINING_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await populatePair(from, to);
    
    if (records > 1000) {
      completedCount++;
    }
    totalAdded += records;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Final status check
  const allPairs = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count
    FROM rate_trends 
    GROUP BY from_currency, to_currency
    ORDER BY count DESC
  `);
  
  console.log('\n=== FINAL STATUS ===');
  let totalComplete = 0;
  
  for (const row of allPairs.rows) {
    const count = row.count as number;
    const status = count > 1000 ? 'COMPLETE' : 'INCOMPLETE';
    console.log(`${row.from_currency}/${row.to_currency}: ${count} records (${status})`);
    if (count > 1000) totalComplete++;
  }
  
  console.log(`\nCompleted pairs: ${totalComplete}/15`);
  console.log(`Records added: ${totalAdded}`);
  
  if (totalComplete >= 12) {
    console.log('SUCCESS: Major currency corridors completed with authentic data');
  }
}

main().catch(console.error);