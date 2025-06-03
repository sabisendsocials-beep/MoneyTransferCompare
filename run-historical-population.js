/**
 * Direct population script for all 15 currency corridors
 * Uses real exchange rate API data only - no synthetic data
 */

import { db } from './server/db.js';
import { rateTrends } from './shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';

const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6';

// All 15 supported currency corridors
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

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function getLastDataDate(fromCurrency, toCurrency) {
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

async function fetchHistoricalRate(fromCurrency, toCurrency, date) {
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

async function populateCurrencyPair(fromCurrency, toCurrency) {
  console.log(`\n=== Processing ${fromCurrency}/${toCurrency} ===`);
  
  const lastDataDate = await getLastDataDate(fromCurrency, toCurrency);
  
  let startDate;
  if (lastDataDate) {
    // Start from the day after the last data point
    startDate = new Date(lastDataDate);
    startDate.setDate(startDate.getDate() + 1);
    console.log(`Found existing data up to ${lastDataDate}, continuing from ${formatDate(startDate)}`);
  } else {
    // No existing data, start from 1 year ago
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    console.log(`No existing data, starting from 1 year ago: ${formatDate(startDate)}`);
  }
  
  const endDate = new Date();
  const rateData = [];
  
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
      console.log(`Storing ${rateData.length} data points for ${fromCurrency}/${toCurrency}...`);
      
      await db.insert(rateTrends).values(rateData);
      
      console.log(`✓ Successfully stored ${rateData.length} historical rates for ${fromCurrency}/${toCurrency}`);
      console.log(`  Date range: ${rateData[0].date} to ${rateData[rateData.length - 1].date}`);
      console.log(`  Rate range: ${Math.min(...rateData.map(d => d.rate))} to ${Math.max(...rateData.map(d => d.rate))}`);
      return rateData.length;
    } catch (error) {
      console.error(`Error storing data for ${fromCurrency}/${toCurrency}:`, error);
      return 0;
    }
  } else {
    console.log(`No valid data retrieved for ${fromCurrency}/${toCurrency}`);
    return 0;
  }
}

async function populateAllHistoricalData() {
  console.log('Starting comprehensive historical data population...');
  console.log(`Processing ${CURRENCY_PAIRS.length} currency pairs with up to 1 year of data each`);
  
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  let totalDataPoints = 0;
  let successCount = 0;
  let errorCount = 0;
  
  // Process each currency pair
  for (const pair of CURRENCY_PAIRS) {
    try {
      const dataPoints = await populateCurrencyPair(pair.from, pair.to);
      totalDataPoints += dataPoints;
      successCount++;
    } catch (error) {
      console.error(`Failed to process ${pair.from}/${pair.to}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n=== Population Summary ===');
  console.log(`Successfully processed: ${successCount} currency pairs`);
  console.log(`Failed: ${errorCount} currency pairs`);
  console.log(`Total data points added: ${totalDataPoints}`);
  console.log('Historical data population completed');
}

// Run the population script
populateAllHistoricalData()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });