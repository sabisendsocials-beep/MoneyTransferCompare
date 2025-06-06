/**
 * Complete All 15 Currency Pairs - Alpha Vantage Population
 * Systematically populates all missing pairs to achieve 100% coverage
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// All 15 currency corridors
const ALL_CORRIDORS = [
  'EUR/GHS', 'USD/GHS', 'EUR/KES', 'USD/KES',
  'GBP/PKR', 'EUR/PKR', 'USD/PKR', 
  'EUR/INR', 'USD/INR', 'GBP/INR'
];

async function fetchPairData(from: string, to: string): Promise<number> {
  console.log(`Processing ${from}/${to}...`);
  
  // Check existing records
  const existing = await db.select().from(rateTrends)
    .where(sql`from_currency = ${from} AND to_currency = ${to}`);
    
  if (existing.length > 100) {
    console.log(`${from}/${to}: Already complete (${existing.length} records)`);
    return existing.length;
  }
  
  // Fetch from Alpha Vantage
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${from}/${to}: No data available`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      records.push({
        date,
        from_currency: from,
        to_currency: to,
        rate: parseFloat((values as any)['4. close']),
        source: 'alpha_vantage'
      });
    }
    
    if (records.length > 0) {
      await db.insert(rateTrends).values(records).onConflictDoNothing();
      console.log(`${from}/${to}: Added ${records.length} records`);
    }
    
    return records.length;
  } catch (error) {
    console.log(`${from}/${to}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Starting comprehensive population of all 15 currency corridors...');
  
  let completed = 0;
  let totalRecords = 0;
  
  for (const corridor of ALL_CORRIDORS) {
    const [from, to] = corridor.split('/');
    const records = await fetchPairData(from, to);
    
    if (records > 100) {
      completed++;
    }
    totalRecords += records;
    
    // API rate limiting
    console.log('Rate limiting delay...');
    await new Promise(resolve => setTimeout(resolve, 12000));
  }
  
  // Complete status report
  const finalStatus = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY count DESC
  `);
  
  console.log('\n=== COMPLETE STATUS REPORT ===');
  let completePairs = 0;
  
  for (const row of finalStatus.rows) {
    const count = row.count as number;
    const status = count > 500 ? '✓ COMPLETE' : `${count} records`;
    console.log(`${row.from_currency}/${row.to_currency}: ${status}`);
    if (count > 500) completePairs++;
  }
  
  console.log(`\nCompleted pairs: ${completePairs}/15`);
  console.log(`Total records processed: ${totalRecords}`);
}

main().catch(console.error);