/**
 * Final Batch Completion - All Remaining Currency Pairs
 * Systematically populates authentic Alpha Vantage data for all missing pairs
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// All 15 currency corridors - prioritize missing ones
const ALL_PAIRS = [
  'USD/NGN', 'EUR/GHS', 'USD/GHS', 'EUR/KES', 'USD/KES',
  'GBP/PKR', 'EUR/PKR', 'USD/PKR', 'EUR/INR', 'USD/INR',
  'GBP/INR' // Complete this one too
];

async function checkExisting(from: string, to: string): Promise<number> {
  const result = await db.select().from(rateTrends)
    .where(sql`from_currency = ${from} AND to_currency = ${to}`);
  return result.length;
}

async function populatePair(from: string, to: string): Promise<number> {
  const existing = await checkExisting(from, to);
  if (existing > 500) {
    console.log(`${from}/${to}: Already has ${existing} records - skipping`);
    return existing;
  }

  console.log(`Fetching ${from}/${to} from Alpha Vantage...`);
  
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
      await db.insert(rateTrends).values(records).onConflictDoNothing();
      console.log(`${from}/${to}: Added ${records.length} records ✓`);
    }
    
    return records.length;
  } catch (error) {
    console.log(`${from}/${to}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Final batch completion started...');
  
  for (const pair of ALL_PAIRS) {
    const [from, to] = pair.split('/');
    await populatePair(from, to);
    
    // Rate limiting
    console.log('Waiting 12 seconds...');
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  // Final verification
  const final = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY count DESC
  `);
  
  console.log('\n=== FINAL STATUS ===');
  for (const row of final.rows) {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.count} records`);
  }
  
  const complete = final.rows.filter(row => row.count > 500).length;
  console.log(`\nCompleted pairs: ${complete}/15`);
}

main().catch(console.error);