/**
 * Wise API Integration
 * This module handles direct integration with the Wise Transfer API
 * to get real-time exchange rates.
 */

import { log } from '../vite';
import axios from 'axios';

// Interface for Wise API rate response
interface WiseRate {
  source: string; // Currency code (e.g., "GBP")
  target: string; // Currency code (e.g., "NGN")
  rate: number;   // Exchange rate value
  time: string;   // Timestamp
}

// Interface for our standardized rate format
interface StandardizedRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: Date;
}

/**
 * Fetches current exchange rates from the Wise API
 * @returns Array of standardized exchange rates
 */
export async function fetchWiseRates(): Promise<StandardizedRate[]> {
  try {
    // Check if API key is available
    if (!process.env.WISE_API_KEY) {
      log('WISE_API_KEY environment variable not set');
      throw new Error('Wise API key not found. Cannot use API integration.');
    }
    
    log('Fetching exchange rates from Wise API...');
    log(`Using API key: ${process.env.WISE_API_KEY.substring(0, 3)}...${process.env.WISE_API_KEY.substring(process.env.WISE_API_KEY.length - 3)}`);
    
    // Currency pairs we're interested in
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'NGN' },
      { from: 'EUR', to: 'GHS' },
    ];
    
    const rates: StandardizedRate[] = [];
    
    // Fetch rates for each currency pair
    for (const pair of currencyPairs) {
      try {
        const { from, to } = pair;
        
        log(`Requesting Wise API rate for ${from} to ${to}...`);
        
        // Make API request
        const response = await axios.get(
          `https://api.wise.com/v1/rates`, {
            params: {
              source: from,
              target: to
            },
            headers: {
              'Authorization': `Bearer ${process.env.WISE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout to prevent hanging
          }
        );
        
        // Log the response for debugging
        log(`Wise API response status: ${response.status}`);
        
        // Check if we got valid rates
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Get the most recent rate
          const latestRate = response.data[0] as WiseRate;
          
          // Add to our rates array
          rates.push({
            fromCurrency: from,
            toCurrency: to,
            rate: latestRate.rate,
            timestamp: new Date(latestRate.time)
          });
          
          log(`✓ Successfully fetched Wise rate for ${from} to ${to}: ${latestRate.rate}`);
        } else {
          log(`⚠ No rate data returned from Wise API for ${from} to ${to}`);
        }
      } catch (error: any) {
        log(`⚠ Error fetching Wise rate for ${pair.from} to ${pair.to}: ${error.message}`);
        if (error.response) {
          log(`  Status: ${error.response.status}`);
          log(`  Data: ${JSON.stringify(error.response.data)}`);
        }
      }
    }
    
    if (rates.length === 0) {
      throw new Error('No rates retrieved from Wise API');
    }
    
    log(`✓ Successfully fetched ${rates.length} exchange rates from Wise API`);
    return rates;
  } catch (error: any) {
    log(`❌ Error in Wise API integration: ${error.message}`);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

/**
 * Updates exchange rates from Wise API and saves to database
 */
export default async function updateWiseRates(): Promise<boolean> {
  try {
    // Import dependencies
    const { storage } = await import('../storage');
    const { DataSourceType } = await import('../routes/dataSourceRouter');
    
    // Get wise provider from database
    const wiseProvider = (await storage.getProviders()).find(p => 
      p.name.toLowerCase().includes('wise'));
    
    if (!wiseProvider) {
      log('Wise provider not found in database');
      return false;
    }
    
    // Fetch rates from API
    const rates = await fetchWiseRates();
    
    if (rates.length === 0) {
      log('No rates returned from Wise API');
      return false;
    }
    
    // First, delete any existing non-API Wise rates to clean up old web-scraped entries
    try {
      // Import needed modules
      const { db } = await import('../db');
      const { exchangeRates } = await import('@shared/schema');
      const { eq, and, ne } = await import('drizzle-orm');
      
      // Delete all Wise rates that are NOT from API source
      const deleteResult = await db.delete(exchangeRates)
        .where(
          and(
            eq(exchangeRates.provider_id, wiseProvider.id),
            ne(exchangeRates.source, DataSourceType.API)
          )
        );
      
      log(`Cleaned up old non-API Wise rates from database`);
    } catch (cleanupError) {
      log(`Warning: Error cleaning up old Wise rates: ${cleanupError}`);
      // Continue with adding new rates regardless
    }
    
    // Save rates to database
    for (const rate of rates) {
      await storage.createExchangeRate({
        provider_id: wiseProvider.id,
        from_currency: rate.fromCurrency,
        to_currency: rate.toCurrency,
        rate: rate.rate,
        source: DataSourceType.API,
        source_url: 'Wise API',
        verified: true
      });
    }
    
    log(`Successfully updated ${rates.length} Wise rates in database`);
    return true;
  } catch (error) {
    log(`Error updating Wise rates: ${error}`);
    return false;
  }
}