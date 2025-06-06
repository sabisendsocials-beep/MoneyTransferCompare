/**
 * Rapid Complete All Currency Pairs
 * Final push to complete all 15 currency corridors with authentic Alpha Vantage data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Remaining pairs that need completion
const REMAINING_PAIRS = [
  'USD/GHS', 'EUR/KES', 'USD/KES', 'GBP/PKR', 'EUR/PKR', 
  'USD/PKR', 'EUR/INR', 'USD/INR'
];

async function rapidPopulatePair(from: string, to: string): Promise<number> {
  console.log(`Processing ${from}/${to}...`);
  
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
      // Insert in smaller batches for reliability
      const batchSize = 500;
      let inserted = 0;
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        try {
          await db.insert(rateTrends).values(batch).onConflictDoNothing();
          inserted += batch.length;
        } catch (error) {
          console.log(`Batch insert error for ${from}/${to}:`, error);
        }
      }
      
      console.log(`${from}/${to}: Added ${inserted} records`);
      return inserted;
    }
    
    return 0;
  } catch (error) {
    console.log(`${from}/${to}: Error - ${error}`);
    return 0;
  }
}

async function main() {
  console.log('Starting rapid completion of all remaining currency pairs...');
  
  let totalAdded = 0;
  
  for (const pair of REMAINING_PAIRS) {
    const [from, to] = pair.split('/');
    const added = await rapidPopulatePair(from, to);
    totalAdded += added;
    
    // Shorter delay for rapid completion
    console.log('API rate limit delay...');
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Complete GBP/INR as well
  console.log('Completing GBP/INR...');
  const gbpInrAdded = await rapidPopulatePair('GBP', 'INR');
  totalAdded += gbpInrAdded;
  
  // Final comprehensive status
  const finalStatus = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency 
    ORDER BY count DESC
  `);
  
  console.log('\n=== FINAL COMPREHENSIVE STATUS ===');
  let completePairs = 0;
  
  for (const row of finalStatus.rows) {
    const count = row.count as number;
    const status = count > 1000 ? 'COMPLETE' : `${count} records`;
    console.log(`${row.from_currency}/${row.to_currency}: ${status}`);
    if (count > 1000) completePairs++;
  }
  
  console.log(`\nTotal completed pairs: ${completePairs}/15`);
  console.log(`Total records added in this session: ${totalAdded}`);
  
  if (completePairs >= 12) {
    console.log('SUCCESS: Major currency corridors completed with authentic Alpha Vantage data');
  }
}

main().catch(console.error);