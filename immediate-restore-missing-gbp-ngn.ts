/**
 * Immediate Restore Missing GBP/NGN Data
 * Emergency restoration for the lost Alpha Vantage dataset
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and } from 'drizzle-orm';

interface AlphaVantageResponse {
  'Time Series FX (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
    };
  };
  'Meta Data': {
    '2. From Symbol': string;
    '3. To Symbol': string;
    '5. Last Refreshed': string;
  };
}

async function emergencyRestoreGbpNgn(): Promise<number> {
  console.log('Emergency restoration: GBP/NGN Alpha Vantage dataset');
  
  // First, clear any incomplete/recent data for this pair
  await db.delete(rateTrends)
    .where(
      and(
        eq(rateTrends.from_currency, 'GBP'),
        eq(rateTrends.to_currency, 'NGN')
      )
    );
  
  console.log('Cleared existing incomplete data');
  
  // Fetch complete historical data from Alpha Vantage
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=GBP&to_symbol=NGN&outputsize=full&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
  
  console.log('Fetching complete GBP/NGN dataset from Alpha Vantage...');
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }
  
  const data: AlphaVantageResponse = await response.json();
  
  if (!data['Time Series FX (Daily)']) {
    console.error('Alpha Vantage response:', JSON.stringify(data, null, 2));
    throw new Error('Invalid response from Alpha Vantage API');
  }
  
  const timeSeriesData = data['Time Series FX (Daily)'];
  console.log(`Retrieved ${Object.keys(timeSeriesData).length} data points`);
  
  // Convert to our format
  const historicalData = Object.entries(timeSeriesData).map(([date, values]) => ({
    date,
    from_currency: 'GBP',
    to_currency: 'NGN',
    rate: parseFloat(values['4. close']),
    source: 'alpha_vantage'
  }));
  
  console.log(`Preparing to insert ${historicalData.length} records...`);
  
  // Batch insert in chunks
  const batchSize = 500;
  let totalInserted = 0;
  
  for (let i = 0; i < historicalData.length; i += batchSize) {
    const batch = historicalData.slice(i, i + batchSize);
    
    await db.insert(rateTrends)
      .values(batch)
      .onConflictDoNothing();
    
    totalInserted += batch.length;
    console.log(`Inserted batch ${Math.ceil((i + 1) / batchSize)} - ${totalInserted}/${historicalData.length} records`);
  }
  
  console.log(`✓ GBP/NGN restoration complete: ${totalInserted} records restored`);
  return totalInserted;
}

async function verifyRestoration(): Promise<void> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
    FROM rate_trends 
    WHERE from_currency = 'GBP' AND to_currency = 'NGN' AND source = 'alpha_vantage'
  `);
  
  const count = result.rows[0].count as number;
  const earliest = result.rows[0].earliest as string;
  const latest = result.rows[0].latest as string;
  
  console.log(`\n=== VERIFICATION ===`);
  console.log(`Records restored: ${count}`);
  console.log(`Date range: ${earliest} to ${latest}`);
  console.log(`Status: ${count > 2000 ? 'SUCCESS' : 'NEEDS ATTENTION'}`);
}

async function main(): Promise<void> {
  try {
    const restored = await emergencyRestoreGbpNgn();
    await verifyRestoration();
    
    console.log('\nGBP/NGN emergency restoration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Emergency restoration failed:', error);
    process.exit(1);
  }
}

main();