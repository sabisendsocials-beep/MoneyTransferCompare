/**
 * Alpha Vantage Historical Data Population
 * Fetches authentic historical exchange rate data for all 15 currency corridors
 * Uses Alpha Vantage FX_DAILY API for real market data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

if (!ALPHA_VANTAGE_API_KEY) {
  console.error('ALPHA_VANTAGE_API_KEY is required');
  process.exit(1);
}

// All 15 currency corridors
const CURRENCY_PAIRS = [
  ['GBP', 'NGN'], ['GBP', 'GHS'], ['GBP', 'KES'], ['GBP', 'INR'], ['GBP', 'PKR'],
  ['EUR', 'NGN'], ['EUR', 'GHS'], ['EUR', 'KES'], ['EUR', 'INR'], ['EUR', 'PKR'],
  ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'INR'], ['USD', 'PKR']
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function checkExistingData(fromCurrency: string, toCurrency: string): Promise<number> {
  const result = await db
    .select()
    .from(rateTrends)
    .where(
      db.and(
        db.eq(rateTrends.from_currency, fromCurrency),
        db.eq(rateTrends.to_currency, toCurrency)
      )
    );
  return result.length;
}

async function fetchAlphaVantageHistoricalData(fromCurrency: string, toCurrency: string): Promise<any[]> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No Alpha Vantage data for ${fromCurrency}/${toCurrency}`);
      return [];
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const historicalData = [];
    
    for (const [date, values] of Object.entries(timeSeries) as [string, any][]) {
      const rate = parseFloat(values['4. close']);
      if (!isNaN(rate) && rate > 0) {
        historicalData.push({
          date,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate
        });
      }
    }
    
    return historicalData;
  } catch (error) {
    console.error(`Error fetching ${fromCurrency}/${toCurrency}:`, error);
    return [];
  }
}

async function storeHistoricalData(historicalData: any[]): Promise<number> {
  if (historicalData.length === 0) return 0;
  
  try {
    await db.insert(rateTrends).values(historicalData);
    return historicalData.length;
  } catch (error) {
    console.error('Error storing data:', error);
    return 0;
  }
}

async function populateHistoricalDataForPair(fromCurrency: string, toCurrency: string): Promise<void> {
  console.log(`\nProcessing ${fromCurrency}/${toCurrency}...`);
  
  const existingCount = await checkExistingData(fromCurrency, toCurrency);
  if (existingCount > 0) {
    console.log(`Skipping ${fromCurrency}/${toCurrency} - already has ${existingCount} records`);
    return;
  }
  
  const historicalData = await fetchAlphaVantageHistoricalData(fromCurrency, toCurrency);
  
  if (historicalData.length > 0) {
    const stored = await storeHistoricalData(historicalData);
    console.log(`✓ ${fromCurrency}/${toCurrency}: ${stored} data points stored`);
  } else {
    console.log(`⚠ ${fromCurrency}/${toCurrency}: No data available`);
  }
  
  // Rate limiting - wait 12 seconds between API calls
  await new Promise(resolve => setTimeout(resolve, 12000));
}

async function populateAllHistoricalData(): Promise<void> {
  console.log('Starting Alpha Vantage historical data population for all 15 currency pairs...');
  console.log('This process includes 12-second delays between API calls for rate limiting.');
  
  for (const [fromCurrency, toCurrency] of CURRENCY_PAIRS) {
    await populateHistoricalDataForPair(fromCurrency, toCurrency);
  }
  
  console.log('\nHistorical data population completed for all currency pairs.');
  
  // Final summary
  const totalRecords = await db.select().from(rateTrends);
  console.log(`Total historical records in database: ${totalRecords.length}`);
}

populateAllHistoricalData().catch(console.error);