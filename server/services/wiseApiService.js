/**
 * Wise API Service
 * Handles rate collection from Wise live rates API
 * Uses the public endpoint: https://wise.com/rates/live
 */

import fetch from 'node-fetch';

export class WiseApiService {
  constructor() {
    this.baseUrl = 'https://wise.com/rates/live';
    this.timeout = 30000;
    this.retryAttempts = 3;
    this.retryDelay = 2000;
  }

  /**
   * Get exchange rate from Wise API
   */
  async getExchangeRate(fromCurrency, toCurrency, amount = 100) {
    console.log(`[Wise API] Getting rate for ${fromCurrency}/${toCurrency}...`);

    const params = new URLSearchParams({
      source: fromCurrency,
      target: toCurrency,
      amount: amount
    });

    const url = `${this.baseUrl}?${params}`;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; SabiSend/1.0)',
            'Referer': 'https://wise.com'
          },
          timeout: this.timeout
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Wise API] Success: ${JSON.stringify(data)}`);
          
          return this.parseWiseResponse(data, fromCurrency, toCurrency, amount);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

      } catch (error) {
        console.log(`[Wise API] Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === this.retryAttempts) {
          throw new Error(`Wise API failed after ${this.retryAttempts} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  /**
   * Parse Wise API response and extract rate
   */
  parseWiseResponse(data, fromCurrency, toCurrency, amount) {
    // Wise response format: {"source":"GBP","target":"NGN","value":2121.26,"time":1750264246705}
    if (!data.value || typeof data.value !== 'number') {
      throw new Error('Invalid Wise API response: missing or invalid rate value');
    }

    if (data.source !== fromCurrency || data.target !== toCurrency) {
      throw new Error(`Currency mismatch: expected ${fromCurrency}/${toCurrency}, got ${data.source}/${data.target}`);
    }

    // Use the API value directly without any transformation
    const exchangeRate = data.value;
    
    console.log(`[Wise API] Using direct API value: ${exchangeRate}`);

    return {
      rate: exchangeRate,
      targetAmount: data.value,
      sourceAmount: amount,
      timestamp: data.time ? new Date(data.time) : new Date(),
      rawResponse: data
    };
  }

  /**
   * Test connection to Wise API
   */
  async testConnection() {
    try {
      const result = await this.getExchangeRate('GBP', 'NGN', 100);
      console.log('[Wise API] Connection test successful');
      return { success: true, rate: result.rate };
    } catch (error) {
      console.log(`[Wise API] Connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get multiple rates with rate limiting
   */
  async getMultipleRates(currencyPairs) {
    const results = [];
    
    for (const pair of currencyPairs) {
      try {
        const result = await this.getExchangeRate(pair.from, pair.to, pair.amount || 100);
        results.push({
          success: true,
          fromCurrency: pair.from,
          toCurrency: pair.to,
          rate: result.rate,
          data: result
        });
      } catch (error) {
        console.log(`[Wise API] Failed to get rate for ${pair.from}/${pair.to}: ${error.message}`);
        results.push({
          success: false,
          fromCurrency: pair.from,
          toCurrency: pair.to,
          error: error.message
        });
      }
      
      // Rate limiting: 1.5 second delay between requests
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    return results;
  }
}

// Create singleton instance
export const wiseApiService = new WiseApiService();

// Export default for easy importing
export default wiseApiService;

/**
 * Fetch rates for all supported currency pairs
 * This is the main function used by the Provider API Scheduler
 */
export async function fetchWiseRates() {
  const currencyPairs = [
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
    { from: 'USD', to: 'PKR' }
  ];

  try {
    console.log('[Wise API] Fetching rates for all currency pairs...');
    const results = await wiseApiService.getMultipleRates(currencyPairs);
    
    const successfulRates = results.filter(r => r.success);
    const failedRates = results.filter(r => !r.success);
    
    console.log(`[Wise API] Successfully fetched ${successfulRates.length}/${results.length} rates`);
    
    if (failedRates.length > 0) {
      console.log(`[Wise API] Failed rates:`, failedRates.map(r => `${r.fromCurrency}/${r.toCurrency}: ${r.error}`));
    }
    
    return {
      success: successfulRates.length > 0,
      rates: successfulRates,
      totalRequested: results.length,
      totalSuccessful: successfulRates.length,
      totalFailed: failedRates.length,
      errors: failedRates
    };
    
  } catch (error) {
    console.error('[Wise API] Critical error during rate collection:', error);
    return {
      success: false,
      rates: [],
      error: error.message,
      totalRequested: currencyPairs.length,
      totalSuccessful: 0,
      totalFailed: currencyPairs.length
    };
  }
}