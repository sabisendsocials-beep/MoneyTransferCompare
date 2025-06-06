/**
 * Complete All Currency Pairs - Urgent Population
 * Populates authentic Alpha Vantage data for all 12 remaining pairs
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

if (!ALPHA_VANTAGE_API_KEY) {
  throw new Error('ALPHA_VANTAGE_API_KEY environment variable is required');
}

const CURRENCY_PAIRS = [
  'EUR/NGN', 'USD/NGN', 'GBP/INR', 'EUR/GHS', 'USD/GHS',
  'EUR/KES', 'USD/KES', 'GBP/PKR', 'EUR/PKR', 'USD/PKR',
  'EUR/INR', 'USD/INR'
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

async function fetchAlphaVantageData(fromCurrency: string, toCurrency: string): Promise<any[]> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  console.log(`Fetching Alpha Vantage data for ${fromCurrency}/${toCurrency}...`);
  
  const response = await fetch(url);
  const data: AlphaVantageResponse = await response.json();
  
  if (!data['Time Series FX (Daily)']) {
    throw new Error(`No data returned for ${fromCurrency}/${toCurrency}`);
  }
  
  const timeSeries = data['Time Series FX (Daily)'];
  const historicalData = [];
  
  for (const [date, values] of Object.entries(timeSeries)) {
    const rate = parseFloat(values['4. close']);
    historicalData.push({
      date,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate
    });
  }
  
  console.log(`Fetched ${historicalData.length} records for ${fromCurrency}/${toCurrency}`);
  return historicalData;
}

async function storeBatchData(data: any[]): Promise<number> {
  if (data.length === 0) return 0;
  
  try {
    await db.insert(rateTrends).values(data).onConflictDoNothing();
    return data.length;
  } catch (error) {
    console.error('Error storing batch data:', error);
    return 0;
  }
}

async function populatePair(pairString: string): Promise<number> {
  const [fromCurrency, toCurrency] = pairString.split('/');
  
  try {
    // Check existing data
    const existingCount = await db
      .select()
      .from(rateTrends)
      .where(sql`from_currency = ${fromCurrency} AND to_currency = ${toCurrency}`)
      .then(rows => rows.length);
      
    if (existingCount > 100) {
      console.log(`${pairString} already has ${existingCount} records - skipping`);
      return existingCount;
    }
    
    // Fetch new data
    const data = await fetchAlphaVantageData(fromCurrency, toCurrency);
    
    // Store data
    const stored = await storeBatchData(data);
    console.log(`✓ Stored ${stored} records for ${pairString}`);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay
    
    return stored;
  } catch (error) {
    console.error(`Error populating ${pairString}:`, error);
    return 0;
  }
}

async function completeAllPairs(): Promise<void> {
  console.log('🚀 Starting urgent population of all remaining currency pairs...');
  
  let totalRecords = 0;
  
  for (const pair of CURRENCY_PAIRS) {
    const records = await populatePair(pair);
    totalRecords += records;
  }
  
  console.log(`✅ Completed! Total records added: ${totalRecords}`);
  
  // Final status check
  const finalStatus = await db
    .select({
      from_currency: rateTrends.from_currency,
      to_currency: rateTrends.to_currency,
      count: sql`COUNT(*)`
    })
    .from(rateTrends)
    .groupBy(rateTrends.from_currency, rateTrends.to_currency)
    .orderBy(sql`COUNT(*) DESC`);
    
  console.log('\n📊 Final status of all currency pairs:');
  finalStatus.forEach(row => {
    console.log(`${row.from_currency}/${row.to_currency}: ${row.count} records`);
  });
}

// Run the script
completeAllPairs().catch(console.error);