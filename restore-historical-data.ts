/**
 * Restore Historical Data Script
 * Restores the lost historical data for affected currency pairs using Alpha Vantage API
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { format, subDays } from 'date-fns';
import ws from 'ws';

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

if (!process.env.HISTORICAL_EXCHANGE_API_KEY) {
  throw new Error('HISTORICAL_EXCHANGE_API_KEY environment variable is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Currency pairs that lost their historical data
const AFFECTED_PAIRS = [
  { from: 'GBP', to: 'NGN' },
  { from: 'EUR', to: 'NGN' },
  { from: 'GBP', to: 'GHS' },
  { from: 'EUR', to: 'GHS' }
];

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

async function fetchAlphaVantageData(fromCurrency: string, toCurrency: string): Promise<any[]> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${process.env.HISTORICAL_EXCHANGE_API_KEY}&outputsize=full`;
  
  console.log(`Fetching historical data for ${fromCurrency}/${toCurrency}...`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
    }
    
    if (data['Note']) {
      console.warn(`Alpha Vantage API note: ${data['Note']}`);
      return [];
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    if (!timeSeries) {
      console.warn(`No time series data found for ${fromCurrency}/${toCurrency}`);
      return [];
    }
    
    const historicalData: any[] = [];
    
    // Convert the data to our format
    for (const [date, rates] of Object.entries(timeSeries)) {
      const closeRate = parseFloat((rates as any)['4. close']);
      if (!isNaN(closeRate)) {
        historicalData.push({
          date,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: closeRate,
          source: 'alpha_vantage'
        });
      }
    }
    
    // Sort by date (oldest first)
    historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`Fetched ${historicalData.length} historical data points for ${fromCurrency}/${toCurrency}`);
    return historicalData;
    
  } catch (error) {
    console.error(`Error fetching data for ${fromCurrency}/${toCurrency}:`, error);
    return [];
  }
}

async function insertHistoricalData(historicalData: any[]): Promise<number> {
  if (historicalData.length === 0) {
    return 0;
  }
  
  const batchSize = 100;
  let totalInserted = 0;
  
  for (let i = 0; i < historicalData.length; i += batchSize) {
    const batch = historicalData.slice(i, i + batchSize);
    
    try {
      const values = batch.map(record => 
        `('${record.date}', '${record.from_currency}', '${record.to_currency}', ${record.rate}, '${record.source}')`
      ).join(', ');
      
      const query = `
        INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
        VALUES ${values}
        ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
          rate = EXCLUDED.rate, 
          source = EXCLUDED.source
      `;
      
      await pool.query(query);
      totalInserted += batch.length;
      
      if (totalInserted % 500 === 0) {
        console.log(`  Inserted ${totalInserted} records so far...`);
      }
      
    } catch (error) {
      console.error(`Error inserting batch:`, error);
    }
  }
  
  return totalInserted;
}

async function restoreHistoricalData(): Promise<void> {
  console.log('Starting historical data restoration...');
  console.log(`Restoring data for ${AFFECTED_PAIRS.length} currency pairs`);
  
  let totalRestored = 0;
  
  for (const pair of AFFECTED_PAIRS) {
    console.log(`\n--- Restoring ${pair.from}/${pair.to} ---`);
    
    // Check current data count
    const currentCount = await pool.query(
      'SELECT COUNT(*) FROM rate_trends WHERE from_currency = $1 AND to_currency = $2',
      [pair.from, pair.to]
    );
    
    const existingRecords = parseInt(currentCount.rows[0].count);
    console.log(`Currently has ${existingRecords} records`);
    
    if (existingRecords > 100) {
      console.log(`Skipping ${pair.from}/${pair.to} - already has sufficient data`);
      continue;
    }
    
    // Fetch historical data from Alpha Vantage
    const historicalData = await fetchAlphaVantageData(pair.from, pair.to);
    
    if (historicalData.length > 0) {
      // Insert the data
      const inserted = await insertHistoricalData(historicalData);
      console.log(`Successfully restored ${inserted} historical records for ${pair.from}/${pair.to}`);
      totalRestored += inserted;
    } else {
      console.log(`No historical data available for ${pair.from}/${pair.to}`);
    }
    
    // Add a small delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay
  }
  
  console.log(`\n=== Restoration Complete ===`);
  console.log(`Total historical records restored: ${totalRestored}`);
  
  // Final verification
  console.log('\n--- Final Data Verification ---');
  for (const pair of AFFECTED_PAIRS) {
    const finalCount = await pool.query(
      'SELECT COUNT(*) FROM rate_trends WHERE from_currency = $1 AND to_currency = $2',
      [pair.from, pair.to]
    );
    console.log(`${pair.from}/${pair.to}: ${finalCount.rows[0].count} records`);
  }
}

// Run the restoration
restoreHistoricalData()
  .then(() => {
    console.log('Historical data restoration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Historical data restoration failed:', error);
    process.exit(1);
  });