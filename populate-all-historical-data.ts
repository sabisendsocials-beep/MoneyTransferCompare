/**
 * Comprehensive historical data population script
 * Populates up to 1 year of historical exchange rate data for all supported currency corridors
 * Uses real API data only - no fallback or synthetic data
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { eq, and } from 'drizzle-orm';

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

// Get date range for the last year
function getDateRange(days: number = 365): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate, endDate };
}

// Check if historical data exists for a currency pair
async function hasHistoricalData(fromCurrency: string, toCurrency: string): Promise<boolean> {
  try {
    const existingData = await db
      .select()
      .from(rateTrends)
      .where(
        and(
          eq(rateTrends.fromCurrency, fromCurrency),
          eq(rateTrends.toCurrency, toCurrency)
        )
      )
      .limit(1);
    
    return existingData.length > 0;
  } catch (error) {
    console.error(`Error checking existing data for ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

// Fetch historical rate for a specific date
async function fetchHistoricalRate(
  fromCurrency: string, 
  toCurrency: string, 
  date: string
): Promise<number | null> {
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY not available');
    return null;
  }

  try {
    const url = `${EXCHANGERATE_API_URL}/${EXCHANGE_API_KEY}/history/${fromCurrency}/${date}`;
    console.log(`Fetching ${fromCurrency}/${toCurrency} for ${date}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API request failed for ${date}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.result === "success" && data.conversion_rates && data.conversion_rates[toCurrency]) {
      const rate = data.conversion_rates[toCurrency];
      console.log(`✓ ${fromCurrency}/${toCurrency} on ${date}: ${rate}`);
      return rate;
    } else {
      console.error(`No rate data for ${fromCurrency}/${toCurrency} on ${date}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching rate for ${date}:`, error);
    return null;
  }
}

// Populate historical data for a single currency pair
async function populateCurrencyPair(fromCurrency: string, toCurrency: string): Promise<void> {
  console.log(`\n=== Processing ${fromCurrency}/${toCurrency} ===`);
  
  // Check if data already exists
  const hasData = await hasHistoricalData(fromCurrency, toCurrency);
  if (hasData) {
    console.log(`${fromCurrency}/${toCurrency} already has historical data, skipping...`);
    return;
  }

  const { startDate, endDate } = getDateRange(365);
  const rateData: Array<{ date: string; rate: number; fromCurrency: string; toCurrency: string }> = [];
  
  console.log(`Fetching data from ${formatDate(startDate)} to ${formatDate(endDate)}`);
  
  // Fetch data for each day in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    const rate = await fetchHistoricalRate(fromCurrency, toCurrency, dateStr);
    
    if (rate !== null) {
      rateData.push({
        date: dateStr,
        rate: rate,
        fromCurrency: fromCurrency,
        toCurrency: toCurrency
      });
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Add small delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Store the data in database
  if (rateData.length > 0) {
    try {
      console.log(`Storing ${rateData.length} data points for ${fromCurrency}/${toCurrency}...`);
      
      await db.insert(rateTrends).values(rateData);
      
      console.log(`✓ Successfully stored ${rateData.length} historical rates for ${fromCurrency}/${toCurrency}`);
      console.log(`  Date range: ${rateData[0].date} to ${rateData[rateData.length - 1].date}`);
      console.log(`  Rate range: ${Math.min(...rateData.map(d => d.rate))} to ${Math.max(...rateData.map(d => d.rate))}`);
    } catch (error) {
      console.error(`Error storing data for ${fromCurrency}/${toCurrency}:`, error);
    }
  } else {
    console.log(`No valid data retrieved for ${fromCurrency}/${toCurrency}`);
  }
}

// Main function to populate all currency pairs
async function populateAllHistoricalData(): Promise<void> {
  console.log('Starting comprehensive historical data population...');
  console.log(`Processing ${CURRENCY_PAIRS.length} currency pairs with up to 1 year of data each`);
  
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process each currency pair
  for (const pair of CURRENCY_PAIRS) {
    try {
      await populateCurrencyPair(pair.from, pair.to);
      successCount++;
    } catch (error) {
      console.error(`Failed to process ${pair.from}/${pair.to}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n=== Population Summary ===');
  console.log(`Successfully processed: ${successCount} currency pairs`);
  console.log(`Failed: ${errorCount} currency pairs`);
  console.log('Historical data population completed');
}

// Run the population script
if (require.main === module) {
  populateAllHistoricalData()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { populateAllHistoricalData };