/**
 * Daily Rate Collector for all 15 currency corridors
 * Fetches current rates daily and builds historical data over time
 * Uses real exchange rate API data only
 */

import pkg from 'pg';
const { Pool } = pkg;

const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6';
const DATABASE_URL = process.env.DATABASE_URL;

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
  connectionString: DATABASE_URL,
});

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function fetchCurrentRate(fromCurrency, toCurrency) {
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY not available');
    return null;
  }

  try {
    const url = `${EXCHANGERATE_API_URL}/${EXCHANGE_API_KEY}/latest/${fromCurrency}`;
    console.log(`Fetching current ${fromCurrency}/${toCurrency} rate...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API request failed for ${fromCurrency}/${toCurrency}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.result === "success" && data.conversion_rates && data.conversion_rates[toCurrency]) {
      const rate = data.conversion_rates[toCurrency];
      console.log(`✓ ${fromCurrency}/${toCurrency}: ${rate}`);
      return rate;
    } else {
      console.error(`No rate data for ${fromCurrency}/${toCurrency}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching rate for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

async function storeRateData(date, fromCurrency, toCurrency, rate) {
  try {
    const query = `
      INSERT INTO rate_trends (date, from_currency, to_currency, rate) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate
    `;
    
    await pool.query(query, [date, fromCurrency, toCurrency, rate]);
    return true;
  } catch (error) {
    console.error(`Error storing rate for ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

async function collectDailyRates() {
  console.log('Starting daily rate collection for all 15 currency corridors...');
  
  if (!EXCHANGE_API_KEY) {
    console.error('EXCHANGE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const today = formatDate(new Date());
  let successCount = 0;
  let errorCount = 0;
  
  // Process each currency pair
  for (const pair of CURRENCY_PAIRS) {
    try {
      const rate = await fetchCurrentRate(pair.from, pair.to);
      
      if (rate !== null) {
        const stored = await storeRateData(today, pair.from, pair.to, rate);
        if (stored) {
          console.log(`✓ Stored ${pair.from}/${pair.to}: ${rate} for ${today}`);
          successCount++;
        } else {
          console.error(`Failed to store ${pair.from}/${pair.to} rate`);
          errorCount++;
        }
      } else {
        console.error(`Failed to fetch ${pair.from}/${pair.to} rate`);
        errorCount++;
      }
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`Failed to process ${pair.from}/${pair.to}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n=== Daily Collection Summary ===');
  console.log(`Date: ${today}`);
  console.log(`Successfully collected: ${successCount} rates`);
  console.log(`Failed: ${errorCount} rates`);
  console.log('Daily rate collection completed');
  
  // Close database connection
  await pool.end();
}

// Run the daily collection
collectDailyRates()
  .then(() => {
    console.log('Daily collection completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Daily collection failed:', error);
    process.exit(1);
  });