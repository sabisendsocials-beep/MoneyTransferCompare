/**
 * Historical data population for all 15 currency corridors
 * Fetches up to 1 year of real exchange rate data from API
 */

import { Pool } from 'pg';
import 'dotenv/config';

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

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function getLastDataDate(fromCurrency, toCurrency) {
  try {
    const result = await pool.query(
      'SELECT date FROM rate_trends WHERE from_currency = $1 AND to_currency = $2 ORDER BY date DESC LIMIT 1',
      [fromCurrency, toCurrency]
    );
    
    return result.rows.length > 0 ? result.rows[0].date : null;
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
  let fetchCount = 0;
  
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
      fetchCount++;
      
      if (fetchCount % 10 === 0) {
        console.log(`✓ Fetched ${fetchCount} data points for ${fromCurrency}/${toCurrency}...`);
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Add delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  // Store the data in database
  if (rateData.length > 0) {
    try {
      console.log(`Storing ${rateData.length} data points for ${fromCurrency}/${toCurrency}...`);
      
      // Insert data in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < rateData.length; i += batchSize) {
        const batch = rateData.slice(i, i + batchSize);
        
        const values = [];
        const placeholders = [];
        let paramIndex = 1;
        
        for (const item of batch) {
          placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
          values.push(item.date, item.from_currency, item.to_currency, item.rate);
          paramIndex += 4;
        }
        
        const query = `
          INSERT INTO rate_trends (date, from_currency, to_currency, rate) 
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (date, from_currency, to_currency) DO NOTHING
        `;
        
        await pool.query(query, values);
      }
      
      console.log(`✓ Successfully stored ${rateData.length} historical rates for ${fromCurrency}/${toCurrency}`);
      console.log(`  Date range: ${rateData[0].date} to ${rateData[rateData.length - 1].date}`);
      console.log(`  Rate range: ${Math.min(...rateData.map(d => d.rate)).toFixed(4)} to ${Math.max(...rateData.map(d => d.rate)).toFixed(4)}`);
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
  
  // Close database connection
  await pool.end();
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