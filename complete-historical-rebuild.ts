/**
 * Complete Historical Data Rebuild
 * Simple script to populate 2+ years of authentic historical data for all currency pairs
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;

if (!ALPHA_VANTAGE_API_KEY) {
  console.error('HISTORICAL_EXCHANGE_API_KEY is required');
  process.exit(1);
}

// All 15 currency corridors
const CURRENCY_PAIRS = [
  ['GBP', 'NGN'], ['GBP', 'GHS'], ['GBP', 'KES'], ['GBP', 'INR'], ['GBP', 'PKR'],
  ['EUR', 'NGN'], ['EUR', 'GHS'], ['EUR', 'KES'], ['EUR', 'INR'], ['EUR', 'PKR'],
  ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'INR'], ['USD', 'PKR']
];

async function fetchHistoricalData(fromCurrency: string, toCurrency: string): Promise<void> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  console.log(`Fetching ${fromCurrency}/${toCurrency}...`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.error(`No data for ${fromCurrency}/${toCurrency}`);
      return;
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
    
    // Insert all data in batches
    if (historicalData.length > 0) {
      await db.insert(rateTrends).values(historicalData);
      console.log(`✓ ${fromCurrency}/${toCurrency}: ${historicalData.length} data points`);
    }
    
    // Rate limiting - wait 12 seconds between API calls
    await new Promise(resolve => setTimeout(resolve, 12000));
    
  } catch (error) {
    console.error(`Error with ${fromCurrency}/${toCurrency}:`, error);
  }
}

async function rebuildAllHistoricalData(): Promise<void> {
  console.log('Starting complete historical data rebuild for all 15 currency pairs...');
  console.log('This will take approximately 3 minutes due to API rate limiting.');
  
  for (const [fromCurrency, toCurrency] of CURRENCY_PAIRS) {
    await fetchHistoricalData(fromCurrency, toCurrency);
  }
  
  console.log('Historical data rebuild completed for all currency pairs.');
}

rebuildAllHistoricalData().catch(console.error);