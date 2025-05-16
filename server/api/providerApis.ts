/**
 * Provider API Integration Module
 * 
 * This module handles direct API integrations with money transfer providers
 * to get the most accurate and up-to-date exchange rates.
 */

import { log } from '../vite';
import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import axios from 'axios';

// Interface for rate responses from provider APIs
interface ProviderRateResponse {
  rate: number;
  source: string;
  fromCurrency: string;
  toCurrency: string;
  timestamp: Date;
}

/**
 * Get exchange rate from Wise API
 * Requires Wise API key to be set as WISE_API_KEY in environment
 */
export async function getWiseRate(fromCurrency: string, toCurrency: string): Promise<ProviderRateResponse | null> {
  try {
    // The Wise API key from environment
    const wiseApiKey = process.env.WISE_API_KEY;
    
    if (!wiseApiKey) {
      log('Wise API key not configured. Please set WISE_API_KEY environment variable.');
      return null;
    }
    
    const url = `https://api.wise.com/v1/rates?source=${fromCurrency}&target=${toCurrency}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${wiseApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data && response.data.length > 0) {
      const rate = response.data[0].rate;
      return {
        rate,
        source: 'Wise API',
        fromCurrency,
        toCurrency,
        timestamp: new Date()
      };
    } else {
      log(`Wise API returned unexpected response: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log(`Error fetching Wise rate: ${error}`);
    return null;
  }
}

/**
 * Get exchange rate from WorldRemit API
 * Requires WorldRemit API key to be set as WORLDREMIT_API_KEY in environment
 */
export async function getWorldRemitRate(fromCurrency: string, toCurrency: string): Promise<ProviderRateResponse | null> {
  try {
    // The WorldRemit API key from environment
    const worldRemitApiKey = process.env.WORLDREMIT_API_KEY;
    
    if (!worldRemitApiKey) {
      log('WorldRemit API key not configured. Please set WORLDREMIT_API_KEY environment variable.');
      return null;
    }
    
    // Note: This is a placeholder URL - actual WorldRemit API endpoint would need to be used
    const url = `https://api.worldremit.com/v1/quote?sourceCurrency=${fromCurrency}&targetCurrency=${toCurrency}`;
    
    const response = await axios.get(url, {
      headers: {
        'api-key': worldRemitApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data && response.data.rate) {
      return {
        rate: response.data.rate,
        source: 'WorldRemit API',
        fromCurrency,
        toCurrency,
        timestamp: new Date()
      };
    } else {
      log(`WorldRemit API returned unexpected response: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log(`Error fetching WorldRemit rate: ${error}`);
    return null;
  }
}

/**
 * Get exchange rate from Western Union API
 * Requires Western Union API key to be set as WESTERN_UNION_API_KEY in environment
 */
export async function getWesternUnionRate(fromCurrency: string, toCurrency: string): Promise<ProviderRateResponse | null> {
  try {
    // The Western Union API key from environment
    const westernUnionApiKey = process.env.WESTERN_UNION_API_KEY;
    
    if (!westernUnionApiKey) {
      log('Western Union API key not configured. Please set WESTERN_UNION_API_KEY environment variable.');
      return null;
    }
    
    // Note: This is a placeholder URL - actual Western Union API endpoint would need to be used
    const url = `https://api.westernunion.com/v1/pricing/quotes`;
    
    const response = await axios.post(url, {
      sourceCurrency: fromCurrency,
      destinationCurrency: toCurrency,
      amount: 100 // Standard amount for quote
    }, {
      headers: {
        'Authorization': `Bearer ${westernUnionApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data && response.data.exchangeRate) {
      return {
        rate: response.data.exchangeRate,
        source: 'Western Union API',
        fromCurrency,
        toCurrency,
        timestamp: new Date()
      };
    } else {
      log(`Western Union API returned unexpected response: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log(`Error fetching Western Union rate: ${error}`);
    return null;
  }
}

/**
 * Get exchange rate from MoneyGram API
 * Requires MoneyGram API key to be set as MONEYGRAM_API_KEY in environment
 */
export async function getMoneyGramRate(fromCurrency: string, toCurrency: string): Promise<ProviderRateResponse | null> {
  try {
    // The MoneyGram API key from environment
    const moneyGramApiKey = process.env.MONEYGRAM_API_KEY;
    
    if (!moneyGramApiKey) {
      log('MoneyGram API key not configured. Please set MONEYGRAM_API_KEY environment variable.');
      return null;
    }
    
    // Note: This is a placeholder URL - actual MoneyGram API endpoint would need to be used
    const url = `https://api.moneygram.com/v1/quotes`;
    
    const response = await axios.post(url, {
      sendCurrency: fromCurrency,
      receiveCurrency: toCurrency,
      sendAmount: 100 // Standard amount for quote
    }, {
      headers: {
        'X-API-Key': moneyGramApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data && response.data.fxRate) {
      return {
        rate: response.data.fxRate,
        source: 'MoneyGram API',
        fromCurrency,
        toCurrency,
        timestamp: new Date()
      };
    } else {
      log(`MoneyGram API returned unexpected response: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log(`Error fetching MoneyGram rate: ${error}`);
    return null;
  }
}

/**
 * API integration for Lemfi
 * Requires Lemfi API key to be set as LEMFI_API_KEY in environment
 */
export async function getLemfiRate(fromCurrency: string, toCurrency: string): Promise<ProviderRateResponse | null> {
  try {
    // The Lemfi API key from environment
    const lemfiApiKey = process.env.LEMFI_API_KEY;
    
    if (!lemfiApiKey) {
      log('Lemfi API key not configured. Please set LEMFI_API_KEY environment variable.');
      return null;
    }
    
    // Note: This is a placeholder URL - actual Lemfi API endpoint would need to be used
    const url = `https://api.lemfi.com/v1/quotes`;
    
    const response = await axios.post(url, {
      source_currency: fromCurrency,
      destination_currency: toCurrency,
      amount: 100 // Standard amount for quote
    }, {
      headers: {
        'Authorization': `Bearer ${lemfiApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data && response.data.exchange_rate) {
      return {
        rate: response.data.exchange_rate,
        source: 'Lemfi API',
        fromCurrency,
        toCurrency,
        timestamp: new Date()
      };
    } else {
      log(`Lemfi API returned unexpected response: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log(`Error fetching Lemfi rate: ${error}`);
    return null;
  }
}

/**
 * Updates exchange rates for all providers using their APIs
 * Only updates rates where API keys are configured and API calls succeed
 */
export async function updateRatesFromApis(): Promise<void> {
  try {
    log('Starting to update exchange rates from provider APIs...');
    
    // Get all providers from the database
    const providers = await storage.getProviders();
    
    // Keep track of number of rates updated via API
    let apiUpdatesCount = 0;
    
    // Standard currency pair for our application
    const fromCurrency = 'GBP';
    const toCurrency = 'NGN';
    
    // Update Wise rate
    const wiseProvider = providers.find(p => p.name === 'Wise');
    if (wiseProvider) {
      const wiseRate = await getWiseRate(fromCurrency, toCurrency);
      if (wiseRate) {
        // Remove any existing rates
        await storage.deleteExchangeRatesForProvider(wiseProvider.id, fromCurrency, toCurrency);
        
        // Add the new rate
        const exchangeRate: InsertExchangeRate = {
          provider_id: wiseProvider.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: wiseRate.rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        log(`Updated Wise rate via API: 1 ${fromCurrency} = ${wiseRate.rate} ${toCurrency}`);
        apiUpdatesCount++;
      }
    }
    
    // Update WorldRemit rate
    const worldRemitProvider = providers.find(p => p.name === 'WorldRemit');
    if (worldRemitProvider) {
      const worldRemitRate = await getWorldRemitRate(fromCurrency, toCurrency);
      if (worldRemitRate) {
        // Remove any existing rates
        await storage.deleteExchangeRatesForProvider(worldRemitProvider.id, fromCurrency, toCurrency);
        
        // Add the new rate
        const exchangeRate: InsertExchangeRate = {
          provider_id: worldRemitProvider.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: worldRemitRate.rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        log(`Updated WorldRemit rate via API: 1 ${fromCurrency} = ${worldRemitRate.rate} ${toCurrency}`);
        apiUpdatesCount++;
      }
    }
    
    // Update Western Union rate
    const westernUnionProvider = providers.find(p => p.name === 'Western Union');
    if (westernUnionProvider) {
      const westernUnionRate = await getWesternUnionRate(fromCurrency, toCurrency);
      if (westernUnionRate) {
        // Remove any existing rates
        await storage.deleteExchangeRatesForProvider(westernUnionProvider.id, fromCurrency, toCurrency);
        
        // Add the new rate
        const exchangeRate: InsertExchangeRate = {
          provider_id: westernUnionProvider.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: westernUnionRate.rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        log(`Updated Western Union rate via API: 1 ${fromCurrency} = ${westernUnionRate.rate} ${toCurrency}`);
        apiUpdatesCount++;
      }
    }
    
    // Update MoneyGram rate
    const moneyGramProvider = providers.find(p => p.name === 'MoneyGram');
    if (moneyGramProvider) {
      const moneyGramRate = await getMoneyGramRate(fromCurrency, toCurrency);
      if (moneyGramRate) {
        // Remove any existing rates
        await storage.deleteExchangeRatesForProvider(moneyGramProvider.id, fromCurrency, toCurrency);
        
        // Add the new rate
        const exchangeRate: InsertExchangeRate = {
          provider_id: moneyGramProvider.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: moneyGramRate.rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        log(`Updated MoneyGram rate via API: 1 ${fromCurrency} = ${moneyGramRate.rate} ${toCurrency}`);
        apiUpdatesCount++;
      }
    }
    
    // Update Lemfi rate
    const lemfiProvider = providers.find(p => p.name === 'Lemfi');
    if (lemfiProvider) {
      const lemfiRate = await getLemfiRate(fromCurrency, toCurrency);
      if (lemfiRate) {
        // Remove any existing rates
        await storage.deleteExchangeRatesForProvider(lemfiProvider.id, fromCurrency, toCurrency);
        
        // Add the new rate
        const exchangeRate: InsertExchangeRate = {
          provider_id: lemfiProvider.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: lemfiRate.rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        log(`Updated Lemfi rate via API: 1 ${fromCurrency} = ${lemfiRate.rate} ${toCurrency}`);
        apiUpdatesCount++;
      }
    }
    
    log(`Updated ${apiUpdatesCount} provider rates via direct API integration`);
  } catch (error) {
    log(`Error updating rates from provider APIs: ${error}`);
  }
}

export default updateRatesFromApis;