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

// Fetch current rate from API (builds historical data over time through daily collection)
async function fetchCurrentRate(
  fromCurrency: string, 
  toCurrency: string
): Promise<number | null> {
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY not available for rate fetch');
    return null;
  }

  try {
    const url = `${EXCHANGERATE_API_URL}/${EXCHANGE_API_KEY}/latest/${fromCurrency}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`API request failed for ${fromCurrency}/${toCurrency}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.result === "success" && data.conversion_rates && data.conversion_rates[toCurrency]) {
      const rate = data.conversion_rates[toCurrency];
      console.log(`✓ Current ${fromCurrency}/${toCurrency}: ${rate}`);
      return rate;
    } else {
      console.log(`No rate data for ${fromCurrency}/${toCurrency}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching rate for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

// Daily update for a single currency pair (stores today's current rate)
async function updateCurrencyPairDaily(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Daily update for ${fromCurrency}/${toCurrency}...`);
  
  const today = formatDate(new Date());
  
  // Check if we already have today's data
  const existingData = await db
    .select()
    .from(rateTrends)
    .where(
      and(
        eq(rateTrends.date, today),
        eq(rateTrends.from_currency, fromCurrency),
        eq(rateTrends.to_currency, toCurrency)
      )
    )
    .limit(1);
  
  if (existingData.length > 0) {
    console.log(`Today's data already exists for ${fromCurrency}/${toCurrency}`);
    return 0;
  }
  
  // Fetch current rate from API
  const rate = await fetchCurrentRate(fromCurrency, toCurrency);
  
  if (rate !== null) {
    try {
      await db.insert(rateTrends).values({
        date: today,
        rate: rate,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        source: 'exchange_api'
      });
      console.log(`✓ Stored ${fromCurrency}/${toCurrency}: ${rate} for ${today}`);
      return 1;
    } catch (error) {
      console.error(`Error storing rate for ${fromCurrency}/${toCurrency}:`, error);
      return 0;
    }
  } else {
    console.log(`No rate data available for ${fromCurrency}/${toCurrency}`);
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
      const updatedCount = await updateCurrencyPairDaily(pair.from, pair.to);
      totalUpdated += updatedCount;
      successCount++;
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
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