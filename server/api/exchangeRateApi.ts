import { storage } from '../storage';
import type { RateTrendResponse } from '@shared/schema';

// Primary API - using exchangerate-api.com which is more reliable for our needs
const EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6';
// Fallback options if primary fails
const FALLBACK_API_OPTIONS = [
  'https://api.exchangerate-api.com/v4',
  'https://open.er-api.com/v6'
];

// Check if we have an API key for enhanced API access
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY || 'open-access-key';
const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY || '';

// Define known API endpoints and how to extract rates from them
interface ApiKeyOption {
  url: string;
  keyParam: string;
  latestEndpoint: (from: string, to: string) => string;
  parseLatest: (data: any, toCurrency: string) => number | null;
}

const API_OPTIONS: ApiKeyOption[] = [
  {
    url: EXCHANGERATE_API_URL,
    keyParam: 'api_key',
    latestEndpoint: (from: string, to: string) => 
      `/${EXCHANGE_API_KEY}/latest/${from}`,
    parseLatest: (data: any, toCurrency: string) => 
      data.result === "success" && data.conversion_rates && data.conversion_rates[toCurrency] 
        ? data.conversion_rates[toCurrency] 
        : null
  },
  {
    url: 'https://api.exchangerate.host',
    keyParam: 'access_key',
    latestEndpoint: (from: string, to: string) => 
      `/latest?base=${from}&symbols=${to}`,
    parseLatest: (data: any, toCurrency: string) => 
      data.success && data.rates && data.rates[toCurrency] ? data.rates[toCurrency] : null
  },
  {
    url: 'https://api.exchangerate-api.com/v4',
    keyParam: 'api_key',
    latestEndpoint: (from: string, to: string) => 
      `/latest/${from}`,
    parseLatest: (data: any, toCurrency: string) => 
      data.rates && data.rates[toCurrency] ? data.rates[toCurrency] : null
  },
  {
    url: 'https://open.er-api.com/v6',
    keyParam: 'api_key',
    latestEndpoint: (from: string, to: string) => 
      `/latest/${from}`,
    parseLatest: (data: any, toCurrency: string) => 
      data.rates && data.rates[toCurrency] ? data.rates[toCurrency] : null
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
      const rate = apiOption.parseLatest(data, toCurrency);
      
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
  // DISABLED: No longer fetching from external APIs at read time
  // All historical data should be pre-populated in the database via Alpha Vantage
  console.log(`Historical rate fetching disabled - using database data only for ${fromCurrency}/${toCurrency}`);
  return [];
}

/**
 * Updates the rate trends in the database
 * DISABLED: All trend data is now pre-populated via Alpha Vantage
 */
export async function updateRateTrends(): Promise<void> {
  console.log('Rate trends update disabled - using pre-populated Alpha Vantage data only');
  return;
}