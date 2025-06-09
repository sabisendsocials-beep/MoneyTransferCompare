/**
 * Emergency Restore Missing Alpha Vantage Data
 * Immediately restores the lost GBP/NGN dataset and other missing pairs
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and, isNull } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Critical pairs that lost their Alpha Vantage data
const CRITICAL_RESTORE = [
  ['GBP', 'NGN'], // Lost - only has 2 records
  ['EUR', 'NGN'], // Lost - only has 2 records  
  ['GBP', 'GHS'], // Lost - only has 2 records
  ['EUR', 'GHS'], // Lost - only has 2 records
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

async function emergencyRestore(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`EMERGENCY RESTORE: ${fromCurrency}/${toCurrency}`);
  
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY required');
  }
  
  try {
    // Remove the incomplete recent data
    await db.delete(rateTrends).where(
      and(
        eq(rateTrends.from_currency, fromCurrency),
        eq(rateTrends.to_currency, toCurrency),
        isNull(rateTrends.source)
      )
    );
    
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    const data: AlphaVantageResponse = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No Alpha Vantage data for ${fromCurrency}/${toCurrency}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    console.log(`Restoring ${Object.keys(timeSeries).length} Alpha Vantage records`);
    
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
      await db.insert(rateTrends).values(batch).onConflictDoNothing();
      totalInserted += batch.length;
    }
    
    console.log(`RESTORED: ${fromCurrency}/${toCurrency} - ${totalInserted} records`);
    return totalInserted;
    
  } catch (error) {
    console.error(`Failed to restore ${fromCurrency}/${toCurrency}:`, error);
    return 0;
  }
}

async function main(): Promise<void> {
  console.log('EMERGENCY DATA RESTORATION IN PROGRESS');
  
  let totalRestored = 0;
  
  for (let i = 0; i < CRITICAL_RESTORE.length; i++) {
    const [from, to] = CRITICAL_RESTORE[i];
    
    const restored = await emergencyRestore(from, to);
    totalRestored += restored;
    
    // Rate limiting
    if (i < CRITICAL_RESTORE.length - 1) {
      console.log('Waiting 12 seconds...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  // Clean up duplicate USD/NGN record
  await db.delete(rateTrends).where(
    and(
      eq(rateTrends.from_currency, 'USD'),
      eq(rateTrends.to_currency, 'NGN'),
      isNull(rateTrends.source)
    )
  );
  
  console.log(`Emergency restoration complete - ${totalRestored} records restored`);
  
  // Verify final status
  const verification = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count, source
    FROM rate_trends 
    WHERE source = 'alpha_vantage'
    GROUP BY from_currency, to_currency, source
    ORDER BY count DESC
  `);
  
  console.log('\nRestored Alpha Vantage Datasets:');
  for (const row of verification.rows) {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.count} records`);
  }
}

main().catch(console.error);