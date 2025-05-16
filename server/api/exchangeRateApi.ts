import { storage } from '../storage';
import type { RateTrendResponse } from '@shared/schema';

// Primary API - using exchangerate-api.com which is more reliable for our needs
const EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6/open-access-key';
// Fallback options if primary fails
const FALLBACK_API_OPTIONS = [
  'https://api.exchangerate-api.com/v4',
  'https://open.er-api.com/v6'
];

// Check if we have an API key for enhanced API access
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY || '';
const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY || '';

// Define known API endpoints and how to extract rates from them
interface ApiKeyOption {
  url: string;
  keyParam: string;
  latestEndpoint: (from: string, to: string) => string;
  parseLatest: (data: any) => number | null;
}

const API_OPTIONS: ApiKeyOption[] = [
  {
    url: 'https://api.exchangerate.host',
    keyParam: 'access_key',
    latestEndpoint: (from: string, to: string) => 
      `/latest?base=${from}&symbols=${to}`,
    parseLatest: (data: any) => 
      data.success && data.rates && data.rates[to] ? data.rates[to] : null
  },
  {
    url: 'https://api.exchangerate-api.com/v4',
    keyParam: 'api_key',
    latestEndpoint: (from: string, to: string) => 
      `/latest/${from}`,
    parseLatest: (data: any) => 
      data.rates && data.rates[to] ? data.rates[to] : null
  },
  {
    url: 'https://open.er-api.com/v6',
    keyParam: 'api_key',
    latestEndpoint: (from: string, to: string) => 
      `/latest/${from}`,
    parseLatest: (data: any) => 
      data.rates && data.rates[to] ? data.rates[to] : null
  }
];

// Type definitions for API responses
interface ExchangeRateApiResponse {
  success: boolean;
  base: string;
  date: string;
  rates: {
    [currency: string]: number;
  };
}

interface TimeSeriesResponse {
  success: boolean;
  base: string;
  start_date: string;
  end_date: string;
  rates: {
    [date: string]: {
      [currency: string]: number;
    };
  };
}

/**
 * Fetches the latest exchange rate from the API
 */
export async function fetchLatestExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  console.log(`Fetching latest ${fromCurrency} to ${toCurrency} exchange rate...`);
  
  // Try the updated primary API first
  try {
    const response = await fetch(`${EXCHANGERATE_API_URL}/latest/${fromCurrency}`);
    if (response.ok) {
      const data = await response.json();
      if (data.result === "success" && data.conversion_rates && data.conversion_rates[toCurrency]) {
        const rate = data.conversion_rates[toCurrency];
        console.log(`Successfully fetched rate from primary API: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        return rate;
      }
    }
  } catch (error) {
    console.log(`Error fetching from primary API: ${error}`);
  }
  
  // Try each API option in order
  for (const apiOption of API_OPTIONS) {
    try {
      const endpoint = apiOption.latestEndpoint(fromCurrency, toCurrency);
      const url = `${apiOption.url}${endpoint}`;
      console.log(`Trying API: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`API ${apiOption.url} responded with status: ${response.status}`);
        continue; // Try next API
      }
      
      const data = await response.json();
      const rate = apiOption.parseLatest(data);
      
      if (rate !== null) {
        console.log(`Successfully fetched rate from ${apiOption.url}: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        return rate;
      }
    } catch (error) {
      console.log(`Error with API ${apiOption.url}: ${error}`);
    }
  }
  
  // Try direct API URLs if the configured ones fail
  try {
    const url = `https://api.exchangerate.host/latest?base=${fromCurrency}&symbols=${toCurrency}`;
    console.log(`Trying direct API URL: ${url}`);
    
    const response = await fetch(url);
    if (response.ok) {
      const data: ExchangeRateApiResponse = await response.json();
      if (data.success && data.rates && data.rates[toCurrency]) {
        const rate = data.rates[toCurrency];
        console.log(`Successfully fetched rate from direct URL: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        return rate;
      }
    }
  } catch (error) {
    console.log(`Error with direct API URL: ${error}`);
  }
  
  // Try a different direct API as a last resort
  try {
    const url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`;
    console.log(`Trying last resort API URL: ${url}`);
    
    const response = await fetch(url);
    if (response.ok) {
      const data: ExchangeRateApiResponse = await response.json();
      if (data.rates && data.rates[toCurrency]) {
        const rate = data.rates[toCurrency];
        console.log(`Successfully fetched rate from last resort API: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        return rate;
      }
    }
  } catch (error) {
    console.log(`Error with last resort API: ${error}`);
  }
  
  // Last resort - return null to indicate failure
  console.log(`Could not get a valid exchange rate for ${fromCurrency}/${toCurrency}`);
  return null;
}

export async function fetchHistoricalRates(
  fromCurrency: string,
  toCurrency: string,
  days: number
): Promise<RateTrendResponse[]> {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);
    
    console.log(`Fetching historical rates for ${fromCurrency}/${toCurrency} from ${startDateFormatted} to ${endDateFormatted}`);
    
    // Get today's rate first from the most reliable API
    const trends: RateTrendResponse[] = [];
    let currentRate: number | null = null;
    
    try {
      currentRate = await fetchLatestExchangeRate(fromCurrency, toCurrency);
      if (currentRate) {
        console.log(`Got current ${fromCurrency}/${toCurrency} rate: ${currentRate}`);
        
        // Add current rate as the newest data point
        trends.push({
          date: formatDate(endDate),
          rate: currentRate,
          from_currency: fromCurrency,
          to_currency: toCurrency
        });
      }
    } catch (error) {
      console.error(`Error fetching current rate: ${error}`);
    }
    
    // Now try to get historical data from exchangerate.host (free API with historical data)
    try {
      // Get historical data from exchangerate.host - they offer a free historical endpoint
      const baseUrl = 'https://api.exchangerate.host';
      console.log(`Attempting to fetch historical rates from ${baseUrl}`);
      
      // We'll fetch historical data in batches to avoid hitting API rate limits
      // Start date - get a data point every 3-4 days for 30 days
      const datesToFetch = [];
      for (let i = days - 1; i >= 0; i -= 3) { // Every 3-4 days
        const historicalDate = new Date(endDate);
        historicalDate.setDate(historicalDate.getDate() - i);
        datesToFetch.push(formatDate(historicalDate));
      }
      
      // Fetch historical rates for each date
      for (const dateStr of datesToFetch) {
        try {
          const url = `${baseUrl}/${dateStr}?base=${fromCurrency}&symbols=${toCurrency}`;
          console.log(`Fetching historical rate for ${dateStr}: ${url}`);
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            
            if (data.rates && data.rates[toCurrency]) {
              const rate = data.rates[toCurrency];
              console.log(`Got historical rate for ${dateStr}: ${rate}`);
              
              trends.push({
                date: dateStr,
                rate: rate,
                from_currency: fromCurrency,
                to_currency: toCurrency
              });
              
              // Add a small delay to avoid API rate limits
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } else {
            console.log(`API request failed for ${dateStr}: ${response.status}`);
          }
        } catch (dateError) {
          console.error(`Error fetching rate for ${dateStr}: ${dateError}`);
        }
      }
    } catch (histError) {
      console.error(`Error fetching historical data: ${histError}`);
    }
    
    // If we couldn't get any historical data, try an alternative API
    if (trends.length <= 1) {
      try {
        console.log('Trying alternative API for historical data');
        const url = `https://api.exchangerate.host/timeseries?start_date=${startDateFormatted}&end_date=${endDateFormatted}&base=${fromCurrency}&symbols=${toCurrency}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          if (data.rates) {
            for (const [date, rates] of Object.entries(data.rates)) {
              if (rates[toCurrency]) {
                trends.push({
                  date: date,
                  rate: rates[toCurrency],
                  from_currency: fromCurrency,
                  to_currency: toCurrency
                });
              }
            }
            console.log(`Got ${Object.keys(data.rates).length} historical rates from timeseries API`);
          }
        }
      } catch (altError) {
        console.error(`Error with alternative historical API: ${altError}`);
      }
    }
    
    // Sort trends by date
    trends.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // If we got some data, return it
    if (trends.length > 0) {
      console.log(`Successfully retrieved ${trends.length} trend data points for ${fromCurrency}/${toCurrency}`);
      return trends;
    }
    
    // If all APIs failed, return an empty array - we won't use synthetic data
    console.error(`Failed to retrieve any trend data for ${fromCurrency}/${toCurrency}`);
    return [];
  } catch (error) {
    console.error(`Error in fetchHistoricalRates: ${error}`);
    return [];
  }
}

/**
 * Updates the rate trends in the database
 * Fetches fresh trend data from APIs and stores it
 */
export async function updateRateTrends(): Promise<void> {
  // Define the currency pairs we need to update trends for
  const currencyPairs = [
    { from: 'GBP', to: 'NGN' },
    { from: 'EUR', to: 'NGN' },
    { from: 'GBP', to: 'GHS' },
    { from: 'EUR', to: 'GHS' }
  ];
  
  const daysToFetch = 30; // 30 days of historical data
  
  try {
    console.log('==== Starting rate trends update process ====');
    
    // Process each currency pair
    for (const pair of currencyPairs) {
      const { from, to } = pair;
      console.log(`Updating trends for ${from} to ${to}...`);
      
      try {
        // Check if we should refresh the data
        const shouldRefresh = await storage.shouldRefreshRateTrends(from, to);
        
        if (shouldRefresh) {
          console.log(`Data for ${from}-${to} needs refresh (>12 hours old or missing)`);
          
          // Fetch historical rates for this pair from external APIs
          const trends = await fetchHistoricalRates(from, to, daysToFetch);
          
          // Only update if we have trends data
          if (trends && trends.length > 0) {
            await storage.updateRateTrends(from, to, trends);
            console.log(`✅ Updated ${from}-${to} trends with ${trends.length} data points`);
            
            // Log the first and last trend points to verify the data
            if (trends.length > 1 && trends[0]?.rate !== undefined) {
              console.log(`  First trend point: ${trends[0].date} - ${from} 1 = ${to} ${Number(trends[0].rate).toFixed(2)}`);
              console.log(`  Last trend point: ${trends[trends.length-1].date} - ${from} 1 = ${to} ${Number(trends[trends.length-1].rate).toFixed(2)}`);
            }
          } else {
            console.warn(`⚠️ No API trend data available for ${from}-${to}`);
          }
        } else {
          console.log(`Using cached data for ${from}-${to} (less than 12 hours old)`);
        }
      } catch (pairError) {
        console.error(`Error updating ${from}-${to} trends:`, pairError);
      }
    }
    
    console.log('==== Rate trends update process complete ====');
  } catch (error) {
    console.error("Error in main updateRateTrends function:", error);
  }
}