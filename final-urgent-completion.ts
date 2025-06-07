/**
 * Final Urgent Completion
 * Completes the remaining 4 currency pairs that still need Alpha Vantage restoration
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Remaining pairs that need completion
const REMAINING_PAIRS = [
  ['EUR', 'NGN'],
  ['GBP', 'GHS'], 
  ['EUR', 'GHS'],
  ['GBP', 'INR']
];

interface AlphaVantageResponse {
  'Time Series FX (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
    };
  };
}

async function rapidComplete(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Completing ${fromCurrency}/${toCurrency} with Alpha Vantage data...`);
  
  if (!ALPHA_VANTAGE_API_KEY) {
    console.log(`Skipping ${fromCurrency}/${toCurrency} - no Alpha Vantage API key`);
    return 0;
  }
  
  try {
    // Clear existing incomplete data
    await db.delete(rateTrends).where(
      and(
        eq(rateTrends.from_currency, fromCurrency),
        eq(rateTrends.to_currency, toCurrency)
      )
    );
    
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    const data: AlphaVantageResponse = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No Alpha Vantage data available for ${fromCurrency}/${toCurrency}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    
    // Prepare records with Alpha Vantage source marking
    const records = Object.entries(timeSeries).map(([date, values]) => ({
      date,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: parseFloat(values['4. close']),
      source: 'alpha_vantage'
    }));
    
    // Insert in batches
    const batchSize = 500;
    let totalInserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.insert(rateTrends).values(batch);
      totalInserted += batch.length;
    }
    
    console.log(`Completed ${fromCurrency}/${toCurrency}: ${totalInserted} Alpha Vantage records`);
    return totalInserted;
    
  } catch (error) {
    console.error(`Error completing ${fromCurrency}/${toCurrency}:`, error);
    return 0;
  }
}

async function main(): Promise<void> {
  console.log('Final completion of remaining currency pairs...');
  
  let totalCompleted = 0;
  let successCount = 0;
  
  for (let i = 0; i < REMAINING_PAIRS.length; i++) {
    const [from, to] = REMAINING_PAIRS[i];
    
    const completed = await rapidComplete(from, to);
    
    if (completed > 0) {
      totalCompleted += completed;
      successCount++;
    }
    
    // Rate limiting
    if (i < REMAINING_PAIRS.length - 1) {
      console.log('Waiting 12 seconds...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  // Clean up duplicate USD/NGN record
  await db.execute(sql`
    DELETE FROM rate_trends 
    WHERE from_currency = 'USD' AND to_currency = 'NGN' AND source IS NULL
  `);
  
  console.log(`\nCompletion Summary:`);
  console.log(`Successfully completed: ${successCount}/${REMAINING_PAIRS.length} pairs`);
  console.log(`Total records added: ${totalCompleted}`);
  
  // Final status check
  const finalStatus = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count, source
    FROM rate_trends 
    WHERE source = 'alpha_vantage'
    GROUP BY from_currency, to_currency, source
    ORDER BY count DESC
  `);
  
  console.log(`\nFinal Alpha Vantage Dataset Status:`);
  for (const row of finalStatus.rows) {
    const count = row.count as number;
    const status = count > 2000 ? 'Complete (10+ years)' : count > 1000 ? 'Complete (5+ years)' : 'Partial';
    console.log(`${row.from_currency}/${row.to_currency}: ${count} records (${status})`);
  }
}

main().catch(console.error);