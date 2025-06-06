/**
 * Final Restoration Push - Complete All 15 Currency Pairs
 * Rapidly restores all missing authentic Alpha Vantage datasets
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Priority pairs that need immediate restoration
const PRIORITY_PAIRS = [
  'GBP/GHS', 'EUR/GHS', 'EUR/KES', 'USD/KES', 
  'GBP/PKR', 'EUR/PKR', 'USD/PKR', 'EUR/INR', 'USD/INR'
];

async function rapidRestore(from: string, to: string): Promise<number> {
  console.log(`Rapidly restoring ${from}/${to}...`);
  
  // Clear any corrupted data first
  await db.delete(rateTrends).where(sql`from_currency = ${from} AND to_currency = ${to}`);
  
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${from}/${to}: No Alpha Vantage data`);
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
  console.log('Final restoration push starting...');
  
  let totalRestored = 0;
  let completed = 0;
  
  for (const pair of PRIORITY_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await rapidRestore(from, to);
    
    if (records > 1000) {
      completed++;
    }
    totalRestored += records;
    
    // Minimal delay for rapid completion
    await new Promise(resolve => setTimeout(resolve, 13000));
  }
  
  // Complete GBP/INR as well
  const gbpInrAdded = await rapidRestore('GBP', 'INR');
  if (gbpInrAdded > 100) completed++;
  totalRestored += gbpInrAdded;
  
  // Final verification
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
  
  console.log(`\nCompleted pairs: ${authenticPairs}/15`);
  console.log(`Records restored: ${totalRestored}`);
  
  if (authenticPairs >= 10) {
    console.log('SUCCESS: Major currency corridors restored with authentic data');
  }
}

main().catch(console.error);