/**
 * Emergency Data Restoration System
 * Rapidly restores all protected Alpha Vantage datasets in case of future data loss
 * Uses authentic Alpha Vantage API to rebuild complete historical datasets
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// All currency pairs with complete Alpha Vantage datasets
const PROTECTED_PAIRS = [
  ['USD', 'KES'], ['GBP', 'KES'], ['GBP', 'PKR'], ['EUR', 'KES'], ['EUR', 'PKR'],
  ['USD', 'GHS'], ['EUR', 'GHS'], ['GBP', 'GHS'], ['GBP', 'NGN'], ['EUR', 'NGN'], ['USD', 'NGN']
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
  'Meta Data': {
    '2. From Symbol': string;
    '3. To Symbol': string;
    '5. Last Refreshed': string;
  };
}

async function checkDataIntegrity(): Promise<{ damaged: string[], protected: string[] }> {
  console.log('Checking data integrity for all protected currency pairs...');
  
  const damaged = [];
  const protected = [];
  
  for (const [from, to] of PROTECTED_PAIRS) {
    const count = await db.execute(sql`
      SELECT COUNT(*) as count FROM rate_trends 
      WHERE from_currency = ${from} AND to_currency = ${to} AND source = 'alpha_vantage'
    `);
    
    const recordCount = count.rows[0].count as number;
    
    if (recordCount < 1000) {
      damaged.push(`${from}/${to}`);
      console.log(`⚠️  DAMAGED: ${from}/${to} has only ${recordCount} Alpha Vantage records`);
    } else {
      protected.push(`${from}/${to}`);
      console.log(`✅ PROTECTED: ${from}/${to} has ${recordCount} Alpha Vantage records`);
    }
  }
  
  return { damaged, protected };
}

async function emergencyRestore(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`🚨 EMERGENCY RESTORE: ${fromCurrency}/${toCurrency}`);
  
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY required for emergency restoration');
  }
  
  try {
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    console.log(`Fetching complete historical data from Alpha Vantage...`);
    const response = await fetch(url);
    const data: AlphaVantageResponse = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No data available for ${fromCurrency}/${toCurrency} from Alpha Vantage`);
      return 0;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    console.log(`Received ${Object.keys(timeSeries).length} data points from Alpha Vantage`);
    
    // Clear any existing non-Alpha Vantage data for this pair
    await db.delete(rateTrends).where(
      and(
        eq(rateTrends.from_currency, fromCurrency),
        eq(rateTrends.to_currency, toCurrency),
        sql`(source != 'alpha_vantage' OR source IS NULL)`
      )
    );
    
    // Prepare batch insert data
    const records = Object.entries(timeSeries).map(([date, values]) => ({
      date,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: parseFloat(values['4. close']),
      source: 'alpha_vantage'
    }));
    
    // Insert in batches to avoid memory issues
    const batchSize = 500;
    let totalInserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        await db.insert(rateTrends).values(batch).onConflictDoNothing();
        totalInserted += batch.length;
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records`);
      } catch (error) {
        console.error(`Error inserting batch starting at ${i}:`, error);
      }
    }
    
    console.log(`✅ RESTORATION COMPLETE: ${fromCurrency}/${toCurrency} - ${totalInserted} authentic records restored`);
    return totalInserted;
    
  } catch (error) {
    console.error(`❌ RESTORATION FAILED: ${fromCurrency}/${toCurrency} - ${error}`);
    return 0;
  }
}

async function fullSystemRestore(): Promise<void> {
  console.log('🚨 INITIATING FULL SYSTEM RESTORATION 🚨');
  console.log('This will restore all authentic Alpha Vantage datasets');
  
  const { damaged, protected } = await checkDataIntegrity();
  
  console.log(`\nIntegrity Summary:`);
  console.log(`Protected pairs: ${protected.length}`);
  console.log(`Damaged pairs requiring restoration: ${damaged.length}`);
  
  if (damaged.length === 0) {
    console.log('\n✅ ALL DATA INTACT - No restoration needed');
    return;
  }
  
  console.log(`\nBeginning emergency restoration for ${damaged.length} damaged pairs...`);
  
  let totalRestored = 0;
  let successfulRestorations = 0;
  
  for (let i = 0; i < damaged.length; i++) {
    const [from, to] = damaged[i].split('/');
    
    console.log(`\n--- Restoring ${i + 1}/${damaged.length}: ${from}/${to} ---`);
    
    const restored = await emergencyRestore(from, to);
    
    if (restored > 0) {
      totalRestored += restored;
      successfulRestorations++;
    }
    
    // Rate limiting for Alpha Vantage API
    if (i < damaged.length - 1) {
      console.log('Waiting 12 seconds for API rate limiting...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  console.log('\n🎯 EMERGENCY RESTORATION COMPLETE');
  console.log(`Successfully restored: ${successfulRestorations}/${damaged.length} pairs`);
  console.log(`Total authentic records restored: ${totalRestored}`);
  
  // Final verification
  const finalStatus = await checkDataIntegrity();
  console.log(`\nFinal Status:`);
  console.log(`Protected pairs: ${finalStatus.protected.length}`);
  console.log(`Remaining damaged pairs: ${finalStatus.damaged.length}`);
  
  if (finalStatus.damaged.length === 0) {
    console.log('\n🎉 ALL SYSTEMS RESTORED - Data protection complete');
  }
}

// Export functions for use in other scripts
export { checkDataIntegrity, emergencyRestore, fullSystemRestore };

// Run if called directly
if (require.main === module) {
  fullSystemRestore().catch(console.error);
}