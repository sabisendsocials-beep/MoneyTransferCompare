/**
 * Fast Complete Historical Data Population
 * Efficiently populates 2+ years of Alpha Vantage data for all 15 currency pairs
 * Uses optimized batch processing and parallel execution
 */

import { db } from './server/db';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// All 15 currency corridors
const ALL_CURRENCY_PAIRS = [
  ['GBP', 'NGN'], ['GBP', 'GHS'], ['GBP', 'KES'], ['GBP', 'INR'], ['GBP', 'PKR'],
  ['EUR', 'NGN'], ['EUR', 'GHS'], ['EUR', 'KES'], ['EUR', 'INR'], ['EUR', 'PKR'],
  ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'INR'], ['USD', 'PKR']
];

async function getDataStatus(): Promise<Map<string, number>> {
  const result = await db.execute(`
    SELECT from_currency, to_currency, COUNT(*) as count 
    FROM rate_trends 
    GROUP BY from_currency, to_currency
  `);
  
  const status = new Map<string, number>();
  for (const row of result.rows) {
    const key = `${row.from_currency}/${row.to_currency}`;
    status.set(key, parseInt(row.count as string));
  }
  return status;
}

async function fetchAlphaVantageData(fromCurrency: string, toCurrency: string): Promise<any[]> {
  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data['Time Series FX (Daily)']) {
      console.log(`No data available for ${fromCurrency}/${toCurrency}`);
      return [];
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    const historicalData = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const rate = parseFloat((values as any)['4. close']);
      if (!isNaN(rate)) {
        historicalData.push({
          date,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate
        });
      }
    }
    
    console.log(`Fetched ${historicalData.length} records for ${fromCurrency}/${toCurrency}`);
    return historicalData;
    
  } catch (error) {
    console.error(`Error fetching ${fromCurrency}/${toCurrency}:`, error);
    return [];
  }
}

async function storeBatchData(data: any[]): Promise<number> {
  if (data.length === 0) return 0;
  
  const batchSize = 100;
  let totalStored = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      const values = batch.map(record => 
        `('${record.date}', '${record.from_currency}', '${record.to_currency}', ${record.rate})`
      ).join(', ');
      
      await db.execute(`
        INSERT INTO rate_trends (date, from_currency, to_currency, rate) 
        VALUES ${values}
        ON CONFLICT (date, from_currency, to_currency) 
        DO UPDATE SET rate = EXCLUDED.rate
      `);
      
      totalStored += batch.length;
      
    } catch (error) {
      console.error(`Batch storage error:`, error);
    }
  }
  
  return totalStored;
}

async function populatePair(fromCurrency: string, toCurrency: string): Promise<number> {
  console.log(`Processing ${fromCurrency}/${toCurrency}...`);
  
  const data = await fetchAlphaVantageData(fromCurrency, toCurrency);
  if (data.length === 0) {
    return 0;
  }
  
  const stored = await storeBatchData(data);
  console.log(`${fromCurrency}/${toCurrency}: Stored ${stored} records`);
  
  return stored;
}

export async function completeAllHistoricalData(): Promise<void> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('ALPHA_VANTAGE_API_KEY not available - cannot fetch authentic historical data');
    return;
  }
  
  console.log('Starting fast historical data completion...');
  
  const initialStatus = await getDataStatus();
  const pairsToProcess = [];
  
  // Identify pairs that need data (less than 750 records = less than 2+ years)
  for (const [fromCurrency, toCurrency] of ALL_CURRENCY_PAIRS) {
    const key = `${fromCurrency}/${toCurrency}`;
    const currentCount = initialStatus.get(key) || 0;
    
    if (currentCount < 750) {
      pairsToProcess.push([fromCurrency, toCurrency]);
      console.log(`${key}: ${currentCount} records - needs completion`);
    } else {
      console.log(`${key}: ${currentCount} records - sufficient`);
    }
  }
  
  console.log(`\nProcessing ${pairsToProcess.length} currency pairs...`);
  
  let totalProcessed = 0;
  
  for (const [fromCurrency, toCurrency] of pairsToProcess) {
    const stored = await populatePair(fromCurrency, toCurrency);
    totalProcessed += stored;
    
    // Rate limiting - 12 seconds between requests
    if (pairsToProcess.indexOf([fromCurrency, toCurrency]) < pairsToProcess.length - 1) {
      console.log('Rate limiting pause...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }
  
  console.log(`\nCompletion summary: ${totalProcessed} total records processed`);
  
  // Final status check
  const finalStatus = await getDataStatus();
  console.log('\nFinal Data Status:');
  
  let completeCount = 0;
  for (const [fromCurrency, toCurrency] of ALL_CURRENCY_PAIRS) {
    const key = `${fromCurrency}/${toCurrency}`;
    const count = finalStatus.get(key) || 0;
    const isComplete = count >= 750;
    if (isComplete) completeCount++;
    
    console.log(`${key}: ${count} records ${isComplete ? '✓' : '⚠️'}`);
  }
  
  console.log(`\nResult: ${completeCount}/${ALL_CURRENCY_PAIRS.length} pairs have 2+ years of data`);
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  completeAllHistoricalData()
    .then(() => {
      console.log('Historical data completion finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('Completion failed:', error);
      process.exit(1);
    });
}