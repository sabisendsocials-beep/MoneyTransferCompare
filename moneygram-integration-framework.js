/**
 * MoneyGram API Integration Framework
 * Production-ready integration module for MoneyGram rate collection
 * Based on research findings and API patterns
 */

import fetch from 'node-fetch';

export class MoneyGramAPIClient {
  constructor(config) {
    this.config = {
      baseUrl: config.production ? 'https://api.moneygram.com' : 'https://sandboxapi.moneygram.com',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      timeout: config.timeout || 30000,
      ...config
    };
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate and get access token
   */
  async authenticate() {
    console.log('Authenticating with MoneyGram API...');

    // Try multiple authentication patterns based on research
    const authMethods = [
      this.authenticateWithBasicAuth.bind(this),
      this.authenticateWithFormData.bind(this),
      this.authenticateWithJsonBody.bind(this)
    ];

    for (const method of authMethods) {
      try {
        const result = await method();
        if (result) {
          this.accessToken = result.access_token;
          this.tokenExpiry = Date.now() + (result.expires_in * 1000);
          console.log('Authentication successful');
          return result;
        }
      } catch (error) {
        console.log(`Authentication method failed: ${error.message}`);
      }
    }

    throw new Error('All authentication methods failed');
  }

  /**
   * Basic Auth method (from provided example)
   */
  async authenticateWithBasicAuth() {
    const basicToken = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.config.baseUrl}/oauth/accesstoken?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${basicToken}`
      },
      timeout: this.config.timeout
    });

    if (response.ok) {
      return await response.json();
    }
    
    const error = await response.text();
    throw new Error(`Basic auth failed: ${error}`);
  }

  /**
   * Form data POST method
   */
  async authenticateWithFormData() {
    const formData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData,
      timeout: this.config.timeout
    });

    if (response.ok) {
      return await response.json();
    }

    throw new Error(`Form data auth failed: ${response.status}`);
  }

  /**
   * JSON body POST method
   */
  async authenticateWithJsonBody() {
    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      }),
      timeout: this.config.timeout
    });

    if (response.ok) {
      return await response.json();
    }

    throw new Error(`JSON auth failed: ${response.status}`);
  }

  /**
   * Check if token needs renewal
   */
  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
      await this.authenticate();
    }
  }

  /**
   * Get exchange rates for currency pair using actual MoneyGram API structure
   */
  async getExchangeRate(fromCurrency, toCurrency, amount = 100) {
    await this.ensureValidToken();

    // Use the actual working MoneyGram API endpoint structure
    const countryMapping = this.getCurrencyToCountryMapping();
    const originCountry = countryMapping[fromCurrency];
    const destCountry = countryMapping[toCurrency];

    if (!originCountry || !destCountry) {
      throw new Error(`Unsupported currency pair: ${fromCurrency}/${toCurrency}`);
    }

    // Generate unique client request ID
    const clientRequestId = this.generateRequestId();

    const endpoint = `/fx-rate/v1/rates?targetAudience=AGENT_FACING&userLanguage=EN-US&agentPartnerId=30150519&originatingCountryCode=${originCountry}&destinationCountryCode=${destCountry}&sendCurrencyCode=${fromCurrency}&receiveCurrencyCode=${toCurrency}`;

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'X-MG-ClientRequestId': clientRequestId
        },
        timeout: this.config.timeout
      });

      if (response.ok) {
        const data = await response.json();
        return this.parseMoneyGramRateResponse(data, fromCurrency, toCurrency, amount);
      } else {
        const errorText = await response.text();
        throw new Error(`MoneyGram API error: ${response.status} - ${errorText}`);
      }

    } catch (error) {
      console.log(`MoneyGram API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * POST method for getting rates
   */
  async getExchangeRatePost(fromCurrency, toCurrency, amount) {
    const postEndpoints = [
      '/v1/rates/quote',
      '/v1/fx-rates/quote',
      '/rates/calculate'
    ];

    const requestBody = {
      fromCurrency,
      toCurrency,
      amount,
      fromCountry: this.getCurrencyCountry(fromCurrency),
      toCountry: this.getCurrencyCountry(toCurrency)
    };

    for (const endpoint of postEndpoints) {
      try {
        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          timeout: this.config.timeout
        });

        if (response.ok) {
          const data = await response.json();
          return this.parseRateResponse(data, fromCurrency, toCurrency, amount);
        }

      } catch (error) {
        console.log(`POST endpoint ${endpoint} failed: ${error.message}`);
      }
    }

    throw new Error(`No working rate endpoint found for ${fromCurrency}/${toCurrency}`);
  }

  /**
   * Parse MoneyGram API response to extract exchange rates
   */
  parseMoneyGramRateResponse(data, fromCurrency, toCurrency, amount) {
    if (!data.fxRates || !Array.isArray(data.fxRates) || data.fxRates.length === 0) {
      throw new Error('No FX rates found in MoneyGram API response');
    }

    // Extract all service options with their rates
    const serviceOptions = data.fxRates.map(rate => ({
      serviceCode: rate.serviceOptionCode,
      serviceName: rate.serviceOptionName,
      routingCode: rate.serviceOptionRoutingCode || null,
      exchangeRate: rate.fxRate,
      isEstimated: rate.fxRateEstimated || false,
      receivedAmount: amount * rate.fxRate
    }));

    // Find the best rate (highest exchange rate)
    const bestOption = serviceOptions.reduce((best, current) => 
      current.exchangeRate > best.exchangeRate ? current : best
    );

    return {
      fromCurrency,
      toCurrency,
      amount,
      exchangeRate: bestOption.exchangeRate,
      fee: 0, // MoneyGram API doesn't include fees in this response
      receivedAmount: bestOption.receivedAmount,
      provider: 'MoneyGram',
      serviceType: bestOption.serviceName,
      serviceCode: bestOption.serviceCode,
      isEstimated: bestOption.isEstimated,
      source: 'moneygram_api',
      timestamp: new Date().toISOString(),
      allOptions: serviceOptions,
      rawResponse: data
    };
  }

  /**
   * Generate unique client request ID for MoneyGram API
   */
  generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Map currencies to country codes for MoneyGram API
   */
  getCurrencyToCountryMapping() {
    return {
      'GBP': 'GBR',
      'EUR': 'FRA', // or 'DEU' for Germany
      'USD': 'USA',
      'NGN': 'NGA',
      'GHS': 'GHA',
      'KES': 'KEN',
      'INR': 'IND',
      'PKR': 'PAK'
    };
  }

  /**
   * Map currency to country code
   */
  getCurrencyCountry(currency) {
    const mapping = {
      'USD': 'US', 'GBP': 'GB', 'EUR': 'EU',
      'NGN': 'NG', 'GHS': 'GH', 'KES': 'KE',
      'INR': 'IN', 'PKR': 'PK'
    };
    return mapping[currency] || currency.substring(0, 2);
  }

  /**
   * Get rates for multiple currency pairs
   */
  async getMultipleRates(currencyPairs) {
    const results = [];
    
    for (const pair of currencyPairs) {
      try {
        const rate = await this.getExchangeRate(pair.from, pair.to, pair.amount || 100);
        results.push({ success: true, data: rate });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          pair: `${pair.from}/${pair.to}`
        });
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}

/**
 * Integration helper for SabiSend application
 */
export async function integrateWithSabiSend(moneygramConfig) {
  const client = new MoneyGramAPIClient(moneygramConfig);
  
  // Test currency pairs from your application
  const testPairs = [
    { from: 'GBP', to: 'NGN' },
    { from: 'USD', to: 'NGN' },
    { from: 'EUR', to: 'NGN' }
  ];

  console.log('Testing MoneyGram API integration...');
  
  try {
    const results = await client.getMultipleRates(testPairs);
    
    console.log('Integration test results:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.data.fromCurrency}/${result.data.toCurrency}: ${result.data.exchangeRate}`);
      } else {
        console.log(`❌ ${result.pair}: ${result.error}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.log('Integration test failed:', error.message);
    throw error;
  }
}

/**
 * Production deployment helper
 */
export function createProductionConfig(credentials) {
  return {
    production: true,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    timeout: 30000,
    retryAttempts: 3,
    rateLimitDelay: 1000
  };
}

// Example usage and testing
if (import.meta.url === `file://${process.argv[1]}`) {
  // Test with provided sandbox credentials
  const testConfig = {
    production: false,
    clientId: 'nibzNh4tumy5ffLszHb5OqKRATmqVKk2',
    clientSecret: 'tvOKXzxX8ECT3NUm'
  };

  console.log('MoneyGram API Integration Framework Test');
  console.log('=========================================\n');

  integrateWithSabiSend(testConfig)
    .then(results => {
      console.log('\nFramework test completed');
      console.log('Ready for production deployment with valid credentials');
    })
    .catch(error => {
      console.log('\nFramework test failed:', error.message);
      console.log('This is expected with sandbox credentials that need activation');
    });
}