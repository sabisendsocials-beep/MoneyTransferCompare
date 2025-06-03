/**
 * Automated Daily Alpha Vantage Updater
 * Runs daily to fetch latest rates and maintain historical data completeness
 * Integrates with existing scheduler for seamless operation
 */

import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const ALPHA_VANTAGE_API_KEY = process.env.HISTORICAL_EXCHANGE_API_KEY;
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
const DATABASE_URL = process.env.DATABASE_URL;

const ALL_CURRENCY_PAIRS = [
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

const pool = new Pool({
  connectionString: DATABASE_URL,
});

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getLatestDataDate(fromCurrency: string, toCurrency: string): Promise<string | null> {
  try {
    const query = `
      SELECT MAX(date) as latest_date 
      FROM rate_trends 
      WHERE from_currency = $1 AND to_currency = $2
    `;
    const result = await pool.query(query, [fromCurrency, toCurrency]);
    return result.rows[0]?.latest_date || null;
  } catch (error) {
    console.error(`Error getting latest date for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

async function fetchLatestRateFromAlphaVantage(fromCurrency: string, toCurrency: string): Promise<number | null> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('HISTORICAL_EXCHANGE_API_KEY not available');
    return null;
  }

  try {
    const url = `${ALPHA_VANTAGE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=compact`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Alpha Vantage API request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data['Error Message'] || data['Note']) {
      console.error(`Alpha Vantage error:`, data['Error Message'] || data['Note']);
      return null;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    if (!timeSeries) {
      console.error(`No time series data for ${fromCurrency}/${toCurrency}`);
      return null;
    }
    
    // Get the most recent rate
    const dates = Object.keys(timeSeries).sort().reverse();
    if (dates.length === 0) return null;
    
    const latestDate = dates[0];
    const latestData = timeSeries[latestDate];
    const rate = parseFloat(latestData['4. close']);
    
    console.log(`Latest ${fromCurrency}/${toCurrency}: ${rate} (${latestDate})`);
    return rate;
    
  } catch (error) {
    console.error(`Error fetching latest rate for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

async function updateDailyRate(fromCurrency: string, toCurrency: string): Promise<boolean> {
  const today = formatDate(new Date());
  
  // Check if today's data already exists
  const latestDate = await getLatestDataDate(fromCurrency, toCurrency);
  if (latestDate === today) {
    console.log(`${fromCurrency}/${toCurrency}: Today's data already exists`);
    return true;
  }
  
  // Fetch latest rate from Alpha Vantage
  const rate = await fetchLatestRateFromAlphaVantage(fromCurrency, toCurrency);
  if (!rate) {
    console.error(`Failed to fetch rate for ${fromCurrency}/${toCurrency}`);
    return false;
  }
  
  // Store the rate
  try {
    const query = `
      INSERT INTO rate_trends (date, from_currency, to_currency, rate, source)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (date, from_currency, to_currency) DO UPDATE SET 
      rate = EXCLUDED.rate, source = EXCLUDED.source
    `;
    
    await pool.query(query, [today, fromCurrency, toCurrency, rate, 'alpha_vantage_daily']);
    console.log(`✓ Updated ${fromCurrency}/${toCurrency}: ${rate} for ${today}`);
    return true;
    
  } catch (error) {
    console.error(`Error storing rate for ${fromCurrency}/${toCurrency}:`, error);
    return false;
  }
}

export async function runDailyAlphaVantageUpdate(): Promise<void> {
  console.log('Starting daily Alpha Vantage update for all currency pairs...');
  
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('HISTORICAL_EXCHANGE_API_KEY not available for daily updates');
    return;
  }
  
  let successful = 0;
  let failed = 0;
  
  for (const pair of ALL_CURRENCY_PAIRS) {
    try {
      const success = await updateDailyRate(pair.from, pair.to);
      if (success) {
        successful++;
      } else {
        failed++;
      }
      
      // Rate limiting: Alpha Vantage allows 5 requests per minute
      await new Promise(resolve => setTimeout(resolve, 13000)); // 13 seconds between requests
      
    } catch (error) {
      console.error(`Failed to update ${pair.from}/${pair.to}:`, error);
      failed++;
    }
  }
  
  console.log(`Daily Alpha Vantage update completed: ${successful} successful, ${failed} failed`);
  await pool.end();
}

// For standalone execution
if (require.main === module) {
  runDailyAlphaVantageUpdate()
    .then(() => {
      console.log('Daily update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Daily update failed:', error);
      process.exit(1);
    });
}