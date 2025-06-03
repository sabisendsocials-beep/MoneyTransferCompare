/**
 * Historical Data Service
 * Manages daily updates of historical exchange rate data for all supported currency corridors
 * Uses real API data only - no synthetic or fallback data
 */

import { db } from '../db';
import { rateTrends } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6';

// All supported currency corridors
const CURRENCY_PAIRS = [
  { from: 'GBP', to: 'NGN' },
  { from: 'EUR', to: 'NGN' },
  { from: 'USD', to: 'NGN' },
  { from: 'GBP', to: 'GHS' },
  { from: 'EUR', to: 'GHS' },
  { from: 'USD', to: 'GHS' },
  { from: 'GBP', to: 'KES' },
  { from: 'EUR', to: 'KES' },
  { from: 'USD', to: 'KES' },
  { from: 'GBP', to: 'INR' },
  { from: 'EUR', to: 'INR' },
  { from: 'USD', to: 'INR' },
  { from: 'GBP', to: 'PKR' },
  { from: 'EUR', to: 'PKR' },
  { from: 'USD', to: 'PKR' },
];

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get the last date we have data for a currency pair
async function getLastDataDate(fromCurrency: string, toCurrency: string): Promise<string | null> {
  try {
    const lastRecord = await db
      .select({ date: rateTrends.date })
      .from(rateTrends)
      .where(
        and(
          eq(rateTrends.from_currency, fromCurrency),
          eq(rateTrends.to_currency, toCurrency)
        )
      )
      .orderBy(desc(rateTrends.date))
      .limit(1);
    
    return lastRecord.length > 0 ? lastRecord[0].date : null;
  } catch (error) {
    console.error(`Error getting last data date for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

// Fetch historical rate for a specific date from API
async function fetchHistoricalRate(
  fromCurrency: string, 
  toCurrency: string, 
  date: string
): Promise<number | null> {
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY not available for historical data fetch');
    return null;
  }

  try {
    const url = `${EXCHANGERATE_API_URL}/${EXCHANGE_API_KEY}/history/${fromCurrency}/${date}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API request failed for ${fromCurrency}/${toCurrency} on ${date}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.result === "success" && data.conversion_rates && data.conversion_rates[toCurrency]) {
      const rate = data.conversion_rates[toCurrency];
      return rate;
    } else {
      console.error(`No rate data for ${fromCurrency}/${toCurrency} on ${date}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching rate for ${fromCurrency}/${toCurrency} on ${date}:`, error);
    return null;
  }
}

// Update historical data for a single currency pair
async function updateCurrencyPairHistory(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Updating historical data for ${fromCurrency}/${toCurrency}...`);
  
  const lastDataDate = await getLastDataDate(fromCurrency, toCurrency);
  
  // Determine start date for updates
  let startDate: Date;
  if (lastDataDate) {
    // Start from the day after the last data point
    startDate = new Date(lastDataDate);
    startDate.setDate(startDate.getDate() + 1);
  } else {
    // No existing data, start from 1 year ago
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
  }
  
  const endDate = new Date();
  const rateData: Array<{ date: string; rate: number; from_currency: string; to_currency: string }> = [];
  
  console.log(`Fetching ${fromCurrency}/${toCurrency} from ${formatDate(startDate)} to ${formatDate(endDate)}`);
  
  // Fetch data for each day in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    const rate = await fetchHistoricalRate(fromCurrency, toCurrency, dateStr);
    
    if (rate !== null) {
      rateData.push({
        date: dateStr,
        rate: rate,
        from_currency: fromCurrency,
        to_currency: toCurrency
      });
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Add delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Store the data in database
  if (rateData.length > 0) {
    try {
      await db.insert(rateTrends).values(rateData);
      console.log(`✓ Added ${rateData.length} new data points for ${fromCurrency}/${toCurrency}`);
      return rateData.length;
    } catch (error) {
      console.error(`Error storing data for ${fromCurrency}/${toCurrency}:`, error);
      return 0;
    }
  } else {
    console.log(`No new data available for ${fromCurrency}/${toCurrency}`);
    return 0;
  }
}

// Daily update function for all currency pairs
export async function updateAllHistoricalData(): Promise<void> {
  console.log('Starting daily historical data update for all currency pairs...');
  
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY environment variable is required for historical data updates');
    return;
  }
  
  let totalUpdated = 0;
  let successCount = 0;
  let errorCount = 0;
  
  // Process each currency pair
  for (const pair of CURRENCY_PAIRS) {
    try {
      const updatedCount = await updateCurrencyPairHistory(pair.from, pair.to);
      totalUpdated += updatedCount;
      successCount++;
    } catch (error) {
      console.error(`Failed to update ${pair.from}/${pair.to}:`, error);
      errorCount++;
    }
  }
  
  console.log(`Daily historical data update completed:`);
  console.log(`- Successfully processed: ${successCount} currency pairs`);
  console.log(`- Failed: ${errorCount} currency pairs`);
  console.log(`- Total new data points added: ${totalUpdated}`);
}

// Initial population function for new currency pairs
export async function populateInitialHistoricalData(): Promise<void> {
  console.log('Starting initial historical data population...');
  
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY environment variable is required');
    return;
  }
  
  let totalPopulated = 0;
  let successCount = 0;
  let errorCount = 0;
  
  // Check each currency pair and populate if no data exists
  for (const pair of CURRENCY_PAIRS) {
    try {
      const lastDataDate = await getLastDataDate(pair.from, pair.to);
      
      if (!lastDataDate) {
        console.log(`No existing data for ${pair.from}/${pair.to}, populating initial data...`);
        const updatedCount = await updateCurrencyPairHistory(pair.from, pair.to);
        totalPopulated += updatedCount;
      } else {
        console.log(`${pair.from}/${pair.to} already has data (latest: ${lastDataDate})`);
      }
      
      successCount++;
    } catch (error) {
      console.error(`Failed to populate ${pair.from}/${pair.to}:`, error);
      errorCount++;
    }
  }
  
  console.log(`Initial population completed:`);
  console.log(`- Successfully processed: ${successCount} currency pairs`);
  console.log(`- Failed: ${errorCount} currency pairs`);
  console.log(`- Total data points populated: ${totalPopulated}`);
}