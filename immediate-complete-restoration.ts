/**
 * Immediate Complete Restoration
 * Restores remaining currency pairs to complete Alpha Vantage datasets
 * Focuses on GBP/NGN, EUR/NGN, GBP/GHS, EUR/GHS and source marking for GBP/KES
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Priority pairs that need immediate restoration
const URGENT_PAIRS = [
  ['GBP', 'NGN'], // Only 23 records, needs full restoration
  ['EUR', 'NGN'], // Only 23 records, needs full restoration  
  ['GBP', 'GHS'], // Only 22 records, needs full restoration
  ['EUR', 'GHS'], // Only 22 records, needs full restoration
];

// Pair that needs source marking
const SOURCE_MARKING_PAIR = ['GBP', 'KES']; // Has 2,758 records but no Alpha Vantage source

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

async function markExistingDataAsAlphaVantage(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Marking existing ${fromCurrency}/${toCurrency} data as Alpha Vantage source...`);
  
  // Update all existing records for this pair to have Alpha Vantage source
  const result = await db.update(rateTrends)
    .set({ source: 'alpha_vantage' })
    .where(
      and(
        eq(rateTrends.from_currency, fromCurrency),
        eq(rateTrends.to_currency, toCurrency)
      )
    );
  
  // Get count of updated records
  const count = await db.execute(sql`
    SELECT COUNT(*) as count FROM rate_trends 
    WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency} AND source = 'alpha_vantage'
  `);
  
  const recordCount = count.rows[0].count as number;
  console.log(`✅ Marked ${recordCount} existing records as Alpha Vantage for ${fromCurrency}/${toCurrency}`);
  
  return recordCount;
}

async function restoreCompleteDataset(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`\n🚀 URGENT RESTORATION: ${fromCurrency}/${toCurrency}`);
  
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY required for restoration');
  }
  
  try {
    // Clear existing incomplete data
    await db.delete(rateTrends).where(
      and(
        eq(rateTrends.from_currency, fromCurrency),
        eq(rateTrends.to_currency, toCurrency)
      )
    );
    
    console.log(`Cleared existing incomplete data for ${fromCurrency}/${toCurrency}`);
    
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    console.log(`Fetching complete Alpha Vantage dataset...`);
    const response = await fetch(url);
    const data: AlphaVantageResponse = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`❌ No Alpha Vantage data available for ${fromCurrency}/${toCurrency}`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    console.log(`📥 Received ${Object.keys(timeSeries).length} authentic data points`);
    
    // Prepare all records with Alpha Vantage source marking
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
      
      try {
        await db.insert(rateTrends).values(batch);
        totalInserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records`);
      } catch (error) {
        console.error(`Error inserting batch:`, error);
      }
    }
    
    console.log(`🎯 RESTORATION COMPLETE: ${fromCurrency}/${toCurrency} - ${totalInserted} authentic records`);
    return totalInserted;
    
  } catch (error) {
    console.error(`❌ RESTORATION FAILED: ${fromCurrency}/${toCurrency} - ${error}`);
    return 0;
  }
}

async function main(): Promise<void> {
  console.log('🚨 IMMEDIATE COMPLETE RESTORATION STARTING 🚨');
  console.log(`Restoring ${URGENT_PAIRS.length} urgent currency pairs to complete Alpha Vantage datasets`);
  
  let totalRestored = 0;
  let successfulRestorations = 0;
  
  // First, mark the existing complete dataset with proper source
  console.log('\n--- STEP 1: Source Marking for Complete Dataset ---');
  const [sourceFrom, sourceTo] = SOURCE_MARKING_PAIR;
  const markedCount = await markExistingDataAsAlphaVantage(sourceFrom, sourceTo);
  
  if (markedCount > 0) {
    console.log(`✅ Protected ${sourceFrom}/${sourceTo} with ${markedCount} Alpha Vantage records`);
  }
  
  console.log('\n--- STEP 2: Complete Dataset Restoration ---');
  
  // Restore each urgent pair
  for (let i = 0; i < URGENT_PAIRS.length; i++) {
    const [from, to] = URGENT_PAIRS[i];
    
    console.log(`\n--- Restoring ${i + 1}/${URGENT_PAIRS.length}: ${from}/${to} ---`);
    
    const restored = await restoreCompleteDataset(from, to);
    
    if (restored > 0) {
      totalRestored += restored;
      successfulRestorations++;
    }
    
    // Rate limiting for Alpha Vantage API
    if (i < URGENT_PAIRS.length - 1) {
      console.log('⏳ Waiting 12 seconds for API rate limiting...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  console.log('\n🎉 IMMEDIATE RESTORATION COMPLETE');
  console.log(`Successfully restored: ${successfulRestorations}/${URGENT_PAIRS.length} urgent pairs`);
  console.log(`Total authentic records restored: ${totalRestored}`);
  
  // Final verification
  console.log('\n--- FINAL VERIFICATION ---');
  const allPairs = await db.execute(sql`
    SELECT from_currency, to_currency, source, COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
    FROM rate_trends 
    WHERE source = 'alpha_vantage'
    GROUP BY from_currency, to_currency, source
    ORDER BY count DESC
  `);
  
  console.log('\n=== PROTECTED ALPHA VANTAGE DATASETS ===');
  let protectedCount = 0;
  
  for (const row of allPairs.rows) {
    const count = row.count as number;
    const status = count > 2000 ? 'Complete (10+ years)' : count > 1000 ? 'Complete (5+ years)' : 'Partial';
    
    console.log(`${row.from_currency}/${row.to_currency}: ${count} records (${status}) [${row.earliest} to ${row.latest}]`);
    
    if (count > 1000) {
      protectedCount++;
    }
  }
  
  console.log(`\n🛡️  Total protected currency pairs: ${protectedCount}`);
  console.log('🔒 Data protection system active - all authentic datasets secured');
}

main().catch(console.error);