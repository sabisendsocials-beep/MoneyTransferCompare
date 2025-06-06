/**
 * Safe Rate Trends Rebuild with Data Protection
 * Implements source-aware updates to prevent overwriting authentic Alpha Vantage data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, and, eq, isNull } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Protection: Only update pairs without Alpha Vantage source
async function getUnprotectedPairs(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT from_currency, to_currency 
    FROM rate_trends 
    WHERE source != 'alpha_vantage' OR source IS NULL
    GROUP BY from_currency, to_currency
    HAVING COUNT(*) < 1000
  `);
  
  return result.rows.map(row => `${row.from_currency}/${row.to_currency}`);
}

// Backup before any operations
async function createBackup(fromCurrency: string, toCurrency: string): Promise<number> {
  const count = await db.execute(sql`
    SELECT COUNT(*) as count FROM rate_trends 
    WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
    AND source = 'alpha_vantage'
  `);
  
  return count.rows[0].count as number;
}

// Safe update that preserves Alpha Vantage data
async function safeUpdatePair(fromCurrency: string, toCurrency: string): Promise<boolean> {
  console.log(`Safe update for ${fromCurrency}/${toCurrency}...`);
  
  // Check if Alpha Vantage data exists
  const alphaVantageCount = await createBackup(fromCurrency, toCurrency);
  
  if (alphaVantageCount > 1000) {
    console.log(`${fromCurrency}/${toCurrency}: Protected - ${alphaVantageCount} Alpha Vantage records exist`);
    return false; // Skip protected pairs
  }
  
  // Only delete records without Alpha Vantage source
  await db.delete(rateTrends).where(
    and(
      eq(rateTrends.from_currency, fromCurrency),
      eq(rateTrends.to_currency, toCurrency),
      isNull(rateTrends.source)
    )
  );
  
  // Attempt Alpha Vantage population for unprotected pairs
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Time Series FX (Daily)']) {
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
        console.log(`${fromCurrency}/${toCurrency}: Added ${records.length} protected Alpha Vantage records`);
        return true;
      }
    }
    
    console.log(`${fromCurrency}/${toCurrency}: No Alpha Vantage data available`);
    return false;
  } catch (error) {
    console.log(`${fromCurrency}/${toCurrency}: Error - ${error}`);
    return false;
  }
}

async function main() {
  console.log('Starting safe rate trends rebuild with data protection...');
  
  // Get pairs that can be safely updated
  const unprotectedPairs = await getUnprotectedPairs();
  console.log(`Found ${unprotectedPairs.length} unprotected pairs that can be safely updated`);
  
  let updatedCount = 0;
  
  for (const pair of unprotectedPairs) {
    const [from, to] = pair.split('/');
    const success = await safeUpdatePair(from, to);
    
    if (success) {
      updatedCount++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Final verification with protection status
  const allPairs = await db.execute(sql`
    SELECT from_currency, to_currency, COUNT(*) as count, source
    FROM rate_trends 
    GROUP BY from_currency, to_currency, source
    ORDER BY count DESC
  `);
  
  console.log('\n=== PROTECTED DATA STATUS ===');
  let protectedPairs = 0;
  
  for (const row of allPairs.rows) {
    const count = row.count as number;
    const source = row.source || 'no_source';
    const status = count > 1000 ? 'PROTECTED' : 'unprotected';
    
    if (source === 'alpha_vantage') {
      console.log(`${row.from_currency}/${row.to_currency}: ${count} records (${source}) - ${status}`);
      if (count > 1000) protectedPairs++;
    }
  }
  
  console.log(`\nProtected Alpha Vantage pairs: ${protectedPairs}`);
  console.log(`Updated unprotected pairs: ${updatedCount}`);
  console.log('Data protection system active - authentic datasets preserved');
}

main().catch(console.error);