/**
 * Wise (TransferWise) API Integration
 * 
 * This module handles fetching real-time exchange rates directly 
 * from the Wise API for the most accurate data.
 */

import axios from 'axios';
import { log } from '../vite';
import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';

// API endpoints
const WISE_API_BASE = 'https://api.wise.com';
const WISE_EXCHANGE_RATES_ENDPOINT = '/v1/rates';

/**
 * Fetch the latest exchange rate from Wise API
 * @param fromCurrency Source currency (e.g., 'GBP')
 * @param toCurrency Target currency (e.g., 'NGN')
 * @returns Exchange rate or null if not available
 */
export async function getWiseExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  try {
    const apiKey = process.env.WISE_API_KEY;
    
    if (!apiKey) {
      log('Wise API key not found in environment variables');
      return null;
    }
    
    log(`Fetching ${fromCurrency} to ${toCurrency} exchange rate from Wise API...`);
    
    const url = `${WISE_API_BASE}${WISE_EXCHANGE_RATES_ENDPOINT}?source=${fromCurrency}&target=${toCurrency}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      const rateData = response.data[0];
      
      if (rateData && typeof rateData.rate === 'number') {
        log(`Successfully fetched Wise exchange rate: 1 ${fromCurrency} = ${rateData.rate} ${toCurrency}`);
        return rateData.rate;
      }
    }
    
    log(`Unexpected response format from Wise API: ${JSON.stringify(response.data)}`);
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`Wise API request failed: ${error.message}`);
      if (error.response) {
        log(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
    } else {
      log(`Error fetching Wise exchange rate: ${error}`);
    }
    return null;
  }
}

/**
 * Update the Wise exchange rate in our database using the official API
 * @param providerId The database ID of the Wise provider
 * @param fromCurrency Source currency (e.g., 'GBP')
 * @param toCurrency Target currency (e.g., 'NGN')
 * @returns Success status
 */
export async function updateWiseRate(
  providerId: number, 
  fromCurrency: string = 'GBP', 
  toCurrency: string = 'NGN'
): Promise<boolean> {
  try {
    // Get rate from Wise API
    const rate = await getWiseExchangeRate(fromCurrency, toCurrency);
    
    if (!rate) {
      log('Failed to get exchange rate from Wise API');
      return false;
    }
    
    // Remove any existing rates for this provider and currency pair
    await storage.deleteExchangeRatesForProvider(providerId, fromCurrency, toCurrency);
    
    // Insert the new rate
    const exchangeRate: InsertExchangeRate = {
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate
    };
    
    const result = await storage.createExchangeRate(exchangeRate);
    log(`Updated Wise exchange rate via official API: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
    
    return !!result;
  } catch (error) {
    log(`Error updating Wise rate: ${error}`);
    return false;
  }
}

/**
 * Updates exchange rates for Wise if the API key is available
 */
export async function updateWiseRates(): Promise<void> {
  try {
    if (!process.env.WISE_API_KEY) {
      log('Wise API key not configured, skipping API-based rate update');
      return;
    }
    
    // Get the Wise provider from our database
    const providers = await storage.getProviders();
    const wiseProvider = providers.find(p => p.name === 'Wise');
    
    if (!wiseProvider) {
      log('Wise provider not found in database');
      return;
    }
    
    // Update primary currency pair (GBP to NGN)
    const success = await updateWiseRate(wiseProvider.id, 'GBP', 'NGN');
    
    if (success) {
      log('Wise rates successfully updated via official API');
    } else {
      log('Failed to update Wise rates via API');
    }
  } catch (error) {
    log(`Error in Wise API rate update process: ${error}`);
  }
}

export default updateWiseRates;