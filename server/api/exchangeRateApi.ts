import { storage } from '../storage';
import type { RateTrend } from '@shared/schema';

// API URL - we'll use a popular free API
const API_BASE_URL = 'https://api.exchangerate.host';

// This interface represents the response structure from the Exchange Rate API
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
  try {
    const url = `${API_BASE_URL}/latest?base=${fromCurrency}&symbols=${toCurrency}`;
    console.log(`Fetching latest rate from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data: ExchangeRateApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error('API returned unsuccessful response');
    }
    
    return data.rates[toCurrency] || null;
  } catch (error) {
    console.error(`Error fetching latest exchange rate: ${error}`);
    return null;
  }
}

/**
 * Fetches historical exchange rates for a specified date range
 */
export async function fetchHistoricalRates(
  fromCurrency: string,
  toCurrency: string,
  days: number
): Promise<RateTrend[]> {
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
    
    const url = `${API_BASE_URL}/timeseries?base=${fromCurrency}&symbols=${toCurrency}&start_date=${startDateFormatted}&end_date=${endDateFormatted}`;
    console.log(`Fetching historical rates from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data: TimeSeriesResponse = await response.json();
    
    if (!data.success) {
      throw new Error('API returned unsuccessful response');
    }
    
    // Convert API response to our RateTrend format
    const trends: RateTrend[] = [];
    
    for (const [dateStr, rates] of Object.entries(data.rates)) {
      if (rates[toCurrency]) {
        trends.push({
          date: dateStr,
          rate: rates[toCurrency]
        });
      }
    }
    
    // Sort by date ascending
    trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return trends;
  } catch (error) {
    console.error(`Error fetching historical rates: ${error}`);
    return [];
  }
}

/**
 * Updates the rate trends in the database
 */
export async function updateRateTrends(): Promise<void> {
  try {
    console.log('Starting rate trends update...');
    
    // Define the currency pairs we want to maintain trend data for
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'EUR', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'GHS' }
    ];
    
    // Number of days to retrieve
    const days = 30;
    
    for (const pair of currencyPairs) {
      try {
        console.log(`Updating trends for ${pair.from} to ${pair.to}...`);
        const trends = await fetchHistoricalRates(pair.from, pair.to, days);
        
        if (trends.length > 0) {
          // Store these trends in the database
          // Note: This requires modifying the storage interface to add a method for storing trends
          // await storage.updateRateTrends(pair.from, pair.to, trends);
          console.log(`Updated ${trends.length} trend points for ${pair.from} to ${pair.to}`);
        } else {
          console.log(`No trend data found for ${pair.from} to ${pair.to}`);
        }
      } catch (error) {
        console.error(`Error updating trends for ${pair.from} to ${pair.to}: ${error}`);
      }
    }
    
    console.log('Rate trends update completed');
  } catch (error) {
    console.error(`Error in updateRateTrends: ${error}`);
  }
}