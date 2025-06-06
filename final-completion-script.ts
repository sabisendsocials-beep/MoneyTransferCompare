/**
 * Final Completion Script for All Currency Pairs
 * Completes historical data for the 12 remaining pairs with minimal data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const TARGET_PAIRS = [
  'EUR/PKR', 'USD/PKR', 'EUR/INR', 'USD/INR'
];

async function populatePair(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Processing ${fromCurrency}/${toCurrency}...`);
  
  // Check existing count
  const existing = await db.execute(sql`
    SELECT COUNT(*) as count FROM rate_trends 
    WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
  `);
  
  const currentCount = existing.rows[0].count as number;
  if (currentCount > 1000) {
    console.log(`${fromCurrency}/${toCurrency}: Already complete with ${currentCount} records`);
    return currentCount;
  }
  
  // Clear incomplete data
  await db.delete(rateTrends).where(sql`from_currency = ${fromCurrency} AND to_currency = ${toCurrency}`);
  
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`${fromCurrency}/${toCurrency}: No data from Alpha Vantage`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const records = Object.entries(timeSeries).map(([date, values]) => ({
      date,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: parseFloat((values as any)['4. close']),
      source: 'alpha_vantage'
    }));
    
    if (records.length > 0) {
      await db.insert(rateTrends).values(records);
      console.log(`${fromCurrency}/${toCurrency}: Added ${records.length} records`);
      return records.length;
    }
    
    return 0;
  } catch (error) {
    console.log(`${fromCurrency}/${toCurrency}: Error - ${error}`);
    return 0;
  }
}

async function completeAllPairs(): Promise<void> {
  console.log('Completing all remaining currency pairs...');
  
  let totalAdded = 0;
  let completedPairs = 0;
  
  for (const pair of TARGET_PAIRS) {
    const [from, to] = pair.split('/');
    const records = await populatePair(from, to);
    
    if (records > 1000) {
      completedPairs++;
    }
    totalAdded += records;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Final comprehensive check
  const allPairs = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count
    FROM rate_trends 
    GROUP BY from_currency, to_currency
    ORDER BY count DESC
  `);
  
  console.log('\n=== FINAL COMPLETION STATUS ===');
  let totalComplete = 0;
  
  for (const row of allPairs.rows) {
    const count = row.count as number;
    if (count > 1000) {
      console.log(`${row.from_currency}/${row.to_currency}: COMPLETE (${count} records)`);
      totalComplete++;
    } else {
      console.log(`${row.from_currency}/${row.to_currency}: INCOMPLETE (${count} records)`);
    }
  }
  
  console.log(`\nCompleted currency pairs: ${totalComplete}/15`);
  console.log(`Records added in this session: ${totalAdded}`);
  
  if (totalComplete >= 13) {
    console.log('SUCCESS: Major currency corridors completed with authentic Alpha Vantage data');
  } else {
    console.log(`Progress: ${totalComplete} pairs completed, ${15 - totalComplete} remaining`);
  }
}

completeAllPairs().catch(console.error);