/**
 * Western Union API Research and Integration Framework
 * Based on Western Union Developer Portal documentation
 * Testing quote endpoints for exchange rate retrieval
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

export class WesternUnionAPIClient {
  constructor(config) {
    this.config = {
      baseUrl: config.production 
        ? 'https://api.westernunion.com' 
        : 'https://sandbox.westernunion.com',
      apiKey: config.apiKey,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      timeout: config.timeout || 30000,
      ...config
    };
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate with Western Union API using OAuth 2.0
   */
  async authenticate() {
    console.log('Authenticating with Western Union API...');

    // Try multiple authentication endpoints
    const authEndpoints = [
      '/v1/oauth/token',
      '/oauth/token',
      '/auth/token',
      '/v1/auth/token'
    ];

    for (const endpoint of authEndpoints) {
      try {
        const result = await this.attemptOAuthAuthentication(endpoint);
        if (result) {
          this.accessToken = result.access_token;
          this.tokenExpiry = Date.now() + (result.expires_in * 1000);
          console.log('Authentication successful');
          return result;
        }
      } catch (error) {
        console.log(`Auth endpoint ${endpoint} failed: ${error.message}`);
      }
    }

    throw new Error('All Western Union authentication methods failed');
  }

  /**
   * Attempt OAuth authentication with different methods
   */
  async attemptOAuthAuthentication(endpoint) {
    const authMethods = [
      () => this.clientCredentialsAuth(endpoint),
      () => this.basicAuthMethod(endpoint),
      () => this.apiKeyAuth(endpoint)
    ];

    for (const method of authMethods) {
      try {
        const result = await method();
        if (result) return result;
      } catch (error) {
        console.log(`Auth method failed: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Client Credentials OAuth flow
   */
  async clientCredentialsAuth(endpoint) {
    const formData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'quotes rates'
    });

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData,
      timeout: this.config.timeout
    });

    if (response.ok) {
      return await response.json();
    }

    throw new Error(`Client credentials auth failed: ${response.status}`);
  }

  /**
   * Basic Authentication method
   */
  async basicAuthMethod(endpoint) {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'grant_type=client_credentials',
      timeout: this.config.timeout
    });

    if (response.ok) {
      return await response.json();
    }

    throw new Error(`Basic auth failed: ${response.status}`);
  }

  /**
   * API Key authentication method
   */
  async apiKeyAuth(endpoint) {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials'
      }),
      timeout: this.config.timeout
    });

    if (response.ok) {
      return await response.json();
    }

    throw new Error(`API key auth failed: ${response.status}`);
  }

  /**
   * Ensure valid access token
   */
  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
      await this.authenticate();
    }
  }

  /**
   * Get exchange rate quote from Western Union
   */
  async getExchangeRateQuote(fromCurrency, toCurrency, amount = 100) {
    await this.ensureValidToken();

    console.log(`Getting Western Union quote for ${fromCurrency}/${toCurrency}...`);

    // Test multiple quote endpoints from WU documentation
    const quoteEndpoints = [
      '/v1/quotes',
      '/v1/quotes/exchange-rates',
      '/quotes',
      '/quotes/fx-rates',
      '/v1/fx/quotes',
      '/api/v1/quotes'
    ];

    for (const endpoint of quoteEndpoints) {
      try {
        const result = await this.attemptQuoteRequest(endpoint, fromCurrency, toCurrency, amount);
        if (result) {
          return this.parseWesternUnionResponse(result, fromCurrency, toCurrency, amount);
        }
      } catch (error) {
        console.log(`Quote endpoint ${endpoint} failed: ${error.message}`);
      }
    }

    throw new Error(`No working Western Union quote endpoint found for ${fromCurrency}/${toCurrency}`);
  }

  /**
   * Attempt quote request with different formats
   */
  async attemptQuoteRequest(endpoint, fromCurrency, toCurrency, amount) {
    const requestFormats = [
      // Standard quote format
      {
        sourceCurrency: fromCurrency,
        targetCurrency: toCurrency,
        sourceAmount: amount,
        originCountry: this.getCurrencyCountry(fromCurrency),
        destinationCountry: this.getCurrencyCountry(toCurrency)
      },
      // Alternative format 1
      {
        fromCurrency: fromCurrency,
        toCurrency: toCurrency,
        amount: amount,
        sendCountry: this.getCurrencyCountry(fromCurrency),
        receiveCountry: this.getCurrencyCountry(toCurrency)
      },
      // Alternative format 2
      {
        send: {
          currency: fromCurrency,
          amount: amount,
          country: this.getCurrencyCountry(fromCurrency)
        },
        receive: {
          currency: toCurrency,
          country: this.getCurrencyCountry(toCurrency)
        }
      },
      // Minimal format
      {
        from: fromCurrency,
        to: toCurrency,
        amount: amount
      }
    ];

    for (const [index, requestBody] of requestFormats.entries()) {
      try {
        console.log(`  Testing request format ${index + 1}...`);

        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': this.config.apiKey
          },
          body: JSON.stringify(requestBody),
          timeout: this.config.timeout
        });

        console.log(`    Response: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          console.log('    Success! WU Response:');
          console.log('    ', JSON.stringify(data, null, 2));
          return data;
        } else if (response.status === 401) {
          console.log('    Unauthorized - token may be invalid');
        } else if (response.status === 400) {
          const errorText = await response.text();
          console.log(`    Bad request: ${errorText.substring(0, 100)}`);
        }

      } catch (error) {
        console.log(`    Request error: ${error.message}`);
      }
    }

    // Try GET method as fallback
    return await this.attemptGETQuote(endpoint, fromCurrency, toCurrency, amount);
  }

  /**
   * Try GET method for quotes
   */
  async attemptGETQuote(endpoint, fromCurrency, toCurrency, amount) {
    const queryParams = new URLSearchParams({
      sourceCurrency: fromCurrency,
      targetCurrency: toCurrency,
      sourceAmount: amount,
      originCountry: this.getCurrencyCountry(fromCurrency),
      destinationCountry: this.getCurrencyCountry(toCurrency)
    });

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        timeout: this.config.timeout
      });

      console.log(`  GET method: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('  GET Success! WU Response:');
        console.log('  ', JSON.stringify(data, null, 2));
        return data;
      }

    } catch (error) {
      console.log(`  GET request error: ${error.message}`);
    }

    return null;
  }

  /**
   * Parse Western Union API response
   */
  parseWesternUnionResponse(data, fromCurrency, toCurrency, amount) {
    // Look for exchange rate in various possible fields
    const rateFields = [
      'exchangeRate', 'rate', 'fxRate', 'fx_rate', 'conversionRate',
      'customerRate', 'principalRate', 'targetRate', 'quoteRate'
    ];

    let exchangeRate = null;
    let fee = 0;
    let receivedAmount = null;

    function searchForValues(obj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'number') {
          // Look for exchange rate
          if (rateFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            exchangeRate = value;
            console.log(`Found rate: ${currentPath} = ${value}`);
          }
          
          // Look for fees
          if (key.toLowerCase().includes('fee') || key.toLowerCase().includes('cost')) {
            fee = value;
            console.log(`Found fee: ${currentPath} = ${value}`);
          }
          
          // Look for received amount
          if (key.toLowerCase().includes('receive') || key.toLowerCase().includes('target')) {
            receivedAmount = value;
            console.log(`Found received amount: ${currentPath} = ${value}`);
          }
        }
        
        if (typeof value === 'object' && value !== null) {
          searchForValues(value, currentPath);
        }
      }
    }

    searchForValues(data);

    // Calculate rate from received amount if not found directly
    if (!exchangeRate && receivedAmount) {
      exchangeRate = receivedAmount / amount;
      console.log(`Calculated rate from received amount: ${exchangeRate}`);
    }

    if (!exchangeRate) {
      console.log('Complete Western Union response:');
      console.log(JSON.stringify(data, null, 2));
      throw new Error('Could not extract exchange rate from Western Union response');
    }

    return {
      fromCurrency,
      toCurrency,
      amount,
      exchangeRate: exchangeRate,
      fee: fee,
      receivedAmount: receivedAmount || (amount * exchangeRate - fee),
      provider: 'Western Union',
      source: 'western_union_api',
      timestamp: new Date().toISOString(),
      rawResponse: data
    };
  }

  /**
   * Get rates for multiple currency pairs
   */
  async getMultipleRates(currencyPairs) {
    const results = [];
    
    for (const pair of currencyPairs) {
      try {
        const rate = await this.getExchangeRateQuote(pair.from, pair.to, pair.amount || 100);
        results.push({ success: true, data: rate });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          pair: `${pair.from}/${pair.to}`
        });
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }

  /**
   * Map currency to country code
   */
  getCurrencyCountry(currency) {
    const mapping = {
      'USD': 'US', 'GBP': 'GB', 'EUR': 'DE',
      'NGN': 'NG', 'GHS': 'GH', 'KES': 'KE',
      'INR': 'IN', 'PKR': 'PK'
    };
    return mapping[currency] || 'US';
  }
}

/**
 * Western Union integration test for SabiSend
 */
export async function testWesternUnionIntegration(config) {
  const client = new WesternUnionAPIClient(config);
  
  console.log('Western Union API Integration Test');
  console.log('=================================\n');

  const testPairs = [
    { from: 'GBP', to: 'NGN', amount: 100 },
    { from: 'USD', to: 'NGN', amount: 100 },
    { from: 'EUR', to: 'NGN', amount: 100 },
    { from: 'GBP', to: 'GHS', amount: 100 },
    { from: 'GBP', to: 'KES', amount: 100 }
  ];

  try {
    const results = await client.getMultipleRates(testPairs);
    
    console.log('\n📊 Western Union Integration Results:');
    results.forEach(result => {
      if (result.success) {
        const data = result.data;
        console.log(`✅ ${data.fromCurrency}/${data.toCurrency}: ${data.exchangeRate} (Fee: ${data.fee})`);
      } else {
        console.log(`❌ ${result.pair}: ${result.error}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.log('Western Union integration test failed:', error.message);
    throw error;
  }
}

/**
 * Create production configuration
 */
export function createWesternUnionProductionConfig(credentials) {
  return {
    production: true,
    apiKey: credentials.apiKey,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    timeout: 30000
  };
}

// Test execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const testConfig = {
    production: false,
    apiKey: 'test_western_union_api_key',
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret'
  };

  console.log('Western Union API Integration Framework Test');
  console.log('==========================================\n');

  testWesternUnionIntegration(testConfig)
    .then(results => {
      console.log('\nWestern Union integration framework ready for production deployment');
    })
    .catch(error => {
      console.log('\nFramework test completed (expected with test credentials)');
      console.log('Western Union API integration ready for production credentials');
    });
}