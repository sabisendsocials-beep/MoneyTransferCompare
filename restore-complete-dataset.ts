/**
 * Restore Complete Authentic Dataset
 * Rebuilds all currency pairs with authentic Alpha Vantage data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// All currency pairs that need complete data
const ALL_PAIRS = [
  'GBP/NGN', 'GBP/GHS', 'EUR/GHS', 'GBP/KES', 'EUR/NGN', 'USD/NGN',
  'USD/GHS', 'EUR/KES', 'USD/KES', 'GBP/PKR', 'EUR/PKR', 'USD/PKR',
  'GBP/INR', 'EUR/INR', 'USD/INR'
];

async function fetchAuthenticData(from: string, to: string): Promise<number> {
  console.log(`Restoring ${from}/${to} with authentic Alpha Vantage data...`);
  
  // Check existing authentic data
  const existing = await db.select().from(rateTrends)
    .where(sql`from_currency = ${from} AND to_currency = ${to} AND source = 'alpha_vantage'`);
    
  if (existing.length > 1000) {
    console.log(`${from}/${to}: Already has ${existing.length} authentic records`);
    return existing.length;
  }
  
  // Clear any incomplete data
  await db.delete(rateTrends)
    .where(sql`from_currency = ${from} AND to_currency = ${to}`);
  
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
      // Insert in batches for reliability
      const batchSize = 500;
      let totalInserted = 0;
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(rateTrends).values(batch);
        totalInserted += batch.length;
      }
      
      console.log(`${from}/${to}: Restored ${totalInserted} authentic records`);
      return totalInserted;
    }
    
    return 0;
  } catch (error) {
    console.log(`${from}/${to}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Restoring complete authentic Alpha Vantage dataset...');
  
  let completed = 0;
  let totalRecords = 0;
  
  for (const pair of ALL_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await fetchAuthenticData(from, to);
    
    if (records > 1000) {
      completed++;
    }
    totalRecords += records;
    
    // API rate limiting
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Verification
  const finalStatus = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    WHERE source = 'alpha_vantage' OR source IS NULL
    GROUP BY from_currency, to_currency 
    ORDER BY count DESC
  `);
  
  console.log('\n=== RESTORATION COMPLETE ===');
  let authenticPairs = 0;
  
  for (const row of finalStatus.rows) {
    const count = row.count as number;
    const status = count > 1000 ? 'COMPLETE' : `${count} records`;
    console.log(`${row.from_currency}/${row.to_currency}: ${status}`);
    if (count > 1000) authenticPairs++;
  }
  
  console.log(`\nAuthentic pairs restored: ${authenticPairs}/15`);
  console.log(`Total authentic records: ${totalRecords}`);
}

main().catch(console.error);