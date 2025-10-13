import { db } from '../db';
import { sql } from 'drizzle-orm';

interface AlphaVantageResponse {
  'Time Series FX (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
    };
  };
  'Error Message'?: string;
  'Note'?: string;
}

const ALL_CURRENCY_PAIRS = [
  ['GBP', 'NGN'],
  ['EUR', 'NGN'],
  ['USD', 'NGN'],
  ['GBP', 'GHS'],
  ['EUR', 'GHS'],
  ['USD', 'GHS'],
  ['GBP', 'KES'],
  ['EUR', 'KES'],
  ['USD', 'KES'],
  ['GBP', 'INR'],
  ['EUR', 'INR'],
  ['USD', 'INR'],
  ['GBP', 'PKR'],
  ['EUR', 'PKR'],
  ['USD', 'PKR'],
];

/**
 * Fetch historical rates from Alpha Vantage (returns up to 100 days)
 */
async function fetchHistoricalRatesFromAlphaVantage(
  fromCurrency: string,
  toCurrency: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; rate: number }>> {
  const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('Alpha Vantage API key not available');
    return [];
  }

  try {
    // Use outputsize=full to get up to 20+ years of data (or compact for 100 days)
    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    console.log(`Fetching historical data for ${fromCurrency}/${toCurrency}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Alpha Vantage API request failed: ${response.status}`);
      return [];
    }
    
    const data: AlphaVantageResponse = await response.json();
    
    if (data['Error Message']) {
      console.error(`Alpha Vantage error: ${data['Error Message']}`);
      return [];
    }
    
    if (data['Note']) {
      console.error(`Alpha Vantage rate limit: ${data['Note']}`);
      return [];
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    if (!timeSeries) {
      console.error('No time series data in Alpha Vantage response');
      return [];
    }
    
    // Filter dates within our range and extract rates
    const historicalRates: Array<{ date: string; rate: number }> = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      // Check if date is within our target range
      if (date >= startDate && date <= endDate) {
        const rate = parseFloat(values['4. close']);
        if (!isNaN(rate)) {
          historicalRates.push({ date, rate });
        }
      }
    }
    
    console.log(`✓ Fetched ${historicalRates.length} historical rates for ${fromCurrency}/${toCurrency}`);
    return historicalRates;
    
  } catch (error) {
    console.error(`Error fetching historical data for ${fromCurrency}/${toCurrency}:`, error);
    return [];
  }
}

/**
 * Backfill historical data for a date range
 */
export async function backfillHistoricalData(
  startDate: string,
  endDate: string
): Promise<{
  totalPairs: number;
  successfulPairs: number;
  failedPairs: number;
  totalDatesInserted: number;
  results: Array<{ pair: string; success: boolean; datesInserted: number; message: string }>;
}> {
  console.log(`\n=== HISTORICAL BACKFILL STARTED ===`);
  console.log(`Date range: ${startDate} to ${endDate}`);
  console.log(`Total pairs to process: ${ALL_CURRENCY_PAIRS.length}`);
  
  const results = [];
  let successfulPairs = 0;
  let failedPairs = 0;
  let totalDatesInserted = 0;
  
  for (let i = 0; i < ALL_CURRENCY_PAIRS.length; i++) {
    const [fromCurrency, toCurrency] = ALL_CURRENCY_PAIRS[i];
    const pairName = `${fromCurrency}/${toCurrency}`;
    
    console.log(`\n[${i + 1}/${ALL_CURRENCY_PAIRS.length}] Processing ${pairName}...`);
    
    try {
      // Fetch historical rates from Alpha Vantage
      const historicalRates = await fetchHistoricalRatesFromAlphaVantage(
        fromCurrency,
        toCurrency,
        startDate,
        endDate
      );
      
      if (historicalRates.length === 0) {
        console.error(`❌ No historical data found for ${pairName}`);
        failedPairs++;
        results.push({
          pair: pairName,
          success: false,
          datesInserted: 0,
          message: 'No historical data retrieved from API'
        });
        
        // Rate limiting delay
        if (i < ALL_CURRENCY_PAIRS.length - 1) {
          console.log('Rate limiting: waiting 12 seconds...');
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
        continue;
      }
      
      // Insert all historical rates using UPSERT
      let insertedCount = 0;
      for (const { date, rate } of historicalRates) {
        await db.execute(sql`
          INSERT INTO rate_trends (date, from_currency, to_currency, rate, source, created_at)
          VALUES (${date}, ${fromCurrency}, ${toCurrency}, ${rate}, 'daily_increment', ${new Date()})
          ON CONFLICT (date, from_currency, to_currency) 
          DO UPDATE SET 
            rate = EXCLUDED.rate,
            created_at = EXCLUDED.created_at
          WHERE rate_trends.source = 'daily_increment'
        `);
        insertedCount++;
      }
      
      console.log(`✓ Inserted ${insertedCount} historical dates for ${pairName}`);
      successfulPairs++;
      totalDatesInserted += insertedCount;
      
      results.push({
        pair: pairName,
        success: true,
        datesInserted: insertedCount,
        message: `Inserted ${insertedCount} dates`
      });
      
    } catch (error) {
      console.error(`❌ Error processing ${pairName}:`, error);
      failedPairs++;
      results.push({
        pair: pairName,
        success: false,
        datesInserted: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Rate limiting: 12 second delay between API calls (5 calls per minute limit)
    if (i < ALL_CURRENCY_PAIRS.length - 1) {
      console.log('Rate limiting: waiting 12 seconds...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  console.log(`\n=== HISTORICAL BACKFILL COMPLETED ===`);
  console.log(`Successful pairs: ${successfulPairs}/${ALL_CURRENCY_PAIRS.length}`);
  console.log(`Failed pairs: ${failedPairs}/${ALL_CURRENCY_PAIRS.length}`);
  console.log(`Total dates inserted: ${totalDatesInserted}`);
  
  return {
    totalPairs: ALL_CURRENCY_PAIRS.length,
    successfulPairs,
    failedPairs,
    totalDatesInserted,
    results
  };
}
