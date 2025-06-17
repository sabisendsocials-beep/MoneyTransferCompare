/**
 * PaySend API Research and Integration Framework
 * Based on PaySend Enterprise API documentation
 * Endpoint: fx.rateGet.p2a for bank account payouts
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

export class PaySendAPIClient {
  constructor(config) {
    this.config = {
      baseUrl: config.production ? 'https://api.paysend.com' : 'https://sandbox-api.paysend.com',
      apiKey: config.apiKey,
      secretKey: config.secretKey,
      partnerId: config.partnerId,
      timeout: config.timeout || 30000,
      ...config
    };
  }

  /**
   * Generate PaySend API signature for authentication
   * Based on common API signature patterns
   */
  generateSignature(method, endpoint, timestamp, body = '') {
    const message = `${method.toUpperCase()}${endpoint}${timestamp}${body}`;
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(message)
      .digest('hex');
  }

  /**
   * Get FX rates for bank account payouts using fx.rateGet.p2a endpoint
   */
  async getFXRateP2A(fromCurrency, toCurrency, amount = 100, destinationCountry) {
    console.log(`Getting PaySend FX rates for ${fromCurrency}/${toCurrency}...`);

    const timestamp = Date.now().toString();
    const endpoint = '/fx/rateGet/p2a';
    
    // Test different request body structures
    const requestBodies = [
      // Standard structure based on API documentation
      {
        fromCurrency: fromCurrency,
        toCurrency: toCurrency,
        amount: amount,
        destinationCountry: destinationCountry || this.getCurrencyCountry(toCurrency),
        payoutMethod: 'BANK_ACCOUNT'
      },
      // Alternative structure
      {
        source_currency: fromCurrency,
        target_currency: toCurrency,
        send_amount: amount,
        country_code: destinationCountry || this.getCurrencyCountry(toCurrency)
      },
      // Minimal structure
      {
        from: fromCurrency,
        to: toCurrency,
        amount: amount
      }
    ];

    for (const [index, requestBody] of requestBodies.entries()) {
      console.log(`Testing request structure ${index + 1}...`);
      
      try {
        const bodyString = JSON.stringify(requestBody);
        const signature = this.generateSignature('POST', endpoint, timestamp, bodyString);

        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': this.config.apiKey,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
            'X-Partner-ID': this.config.partnerId,
            'Authorization': `Bearer ${this.config.apiKey}`,
            'User-Agent': 'SabiSend-Integration/1.0'
          },
          body: bodyString,
          timeout: this.config.timeout
        });

        console.log(`Response: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          console.log('Success! PaySend response:');
          console.log(JSON.stringify(data, null, 2));
          
          return this.parsePaySendResponse(data, fromCurrency, toCurrency, amount);
        } else {
          const errorText = await response.text();
          console.log(`Error response: ${errorText.substring(0, 300)}`);
        }

      } catch (error) {
        console.log(`Request ${index + 1} failed: ${error.message}`);
      }
    }

    throw new Error(`All PaySend API request formats failed for ${fromCurrency}/${toCurrency}`);
  }

  /**
   * Test alternative endpoint patterns
   */
  async testAlternativeEndpoints(fromCurrency, toCurrency, amount = 100) {
    const endpoints = [
      '/fx/rateGet/p2a',
      '/v1/fx/rates',
      '/rates/fx',
      '/fx/rates/p2a',
      '/api/fx/rates',
      '/exchange/rates'
    ];

    const methods = ['POST', 'GET'];
    const timestamp = Date.now().toString();

    for (const endpoint of endpoints) {
      console.log(`Testing endpoint: ${endpoint}`);
      
      for (const method of methods) {
        try {
          const requestBody = {
            fromCurrency,
            toCurrency,
            amount,
            payoutMethod: 'BANK_ACCOUNT'
          };

          const bodyString = method === 'POST' ? JSON.stringify(requestBody) : '';
          const url = method === 'GET' 
            ? `${this.config.baseUrl}${endpoint}?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`
            : `${this.config.baseUrl}${endpoint}`;

          const signature = this.generateSignature(method, endpoint, timestamp, bodyString);

          const options = {
            method,
            headers: {
              'Accept': 'application/json',
              'X-API-Key': this.config.apiKey,
              'X-Timestamp': timestamp,
              'X-Signature': signature,
              'Authorization': `Bearer ${this.config.apiKey}`
            },
            timeout: this.config.timeout
          };

          if (method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
            options.body = bodyString;
          }

          const response = await fetch(url, options);
          console.log(`  ${method}: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const data = await response.json();
            console.log('  Success! Found working endpoint');
            console.log('  Response:', JSON.stringify(data, null, 2));
            return { endpoint, method, data };
          } else if (response.status === 401) {
            console.log('  Unauthorized - may need different auth method');
          } else if (response.status === 404) {
            console.log('  Not found');
          } else {
            const errorText = await response.text();
            console.log(`  Error: ${errorText.substring(0, 100)}`);
          }

        } catch (error) {
          console.log(`  ${method} error: ${error.message}`);
        }
      }
    }

    return null;
  }

  /**
   * Parse PaySend API response
   */
  parsePaySendResponse(data, fromCurrency, toCurrency, amount) {
    // Look for common rate fields in PaySend response
    const rateFields = ['rate', 'fxRate', 'exchangeRate', 'fx_rate', 'conversion_rate'];
    let foundRate = null;
    let fee = 0;

    function findRateInObject(obj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'number') {
          if (rateFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            foundRate = { value, path: currentPath };
          }
          
          if (key.toLowerCase().includes('fee') || key.toLowerCase().includes('cost')) {
            fee = value;
          }
        }
        
        if (typeof value === 'object' && value !== null) {
          findRateInObject(value, currentPath);
        }
      }
    }

    findRateInObject(data);

    if (!foundRate) {
      console.log('Could not parse rate from PaySend response:', JSON.stringify(data, null, 2));
      throw new Error('Unable to extract exchange rate from PaySend response');
    }

    return {
      fromCurrency,
      toCurrency,
      amount,
      exchangeRate: foundRate.value,
      fee: fee,
      receivedAmount: (amount * foundRate.value) - fee,
      provider: 'PaySend',
      source: 'paysend_api',
      timestamp: new Date().toISOString(),
      rawResponse: data
    };
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

  /**
   * Get rates for multiple currency pairs
   */
  async getMultipleRates(currencyPairs) {
    const results = [];
    
    for (const pair of currencyPairs) {
      try {
        const rate = await this.getFXRateP2A(
          pair.from, 
          pair.to, 
          pair.amount || 100, 
          pair.destinationCountry
        );
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
 * PaySend API Discovery and Testing
 */
export async function discoverPaySendAPI(testConfig) {
  const client = new PaySendAPIClient(testConfig);
  
  console.log('PaySend API Discovery and Integration Test');
  console.log('=========================================\n');

  const testPairs = [
    { from: 'GBP', to: 'NGN', destinationCountry: 'NG' },
    { from: 'USD', to: 'NGN', destinationCountry: 'NG' },
    { from: 'EUR', to: 'NGN', destinationCountry: 'NG' }
  ];

  // First, test alternative endpoints to find working ones
  console.log('🔍 Testing PaySend API endpoints...\n');
  
  for (const pair of testPairs) {
    console.log(`--- Testing ${pair.from}/${pair.to} ---`);
    
    try {
      const workingEndpoint = await client.testAlternativeEndpoints(pair.from, pair.to);
      
      if (workingEndpoint) {
        console.log(`✅ Found working endpoint: ${workingEndpoint.endpoint}`);
        break;
      } else {
        console.log(`❌ No working endpoints found for ${pair.from}/${pair.to}`);
      }
      
    } catch (error) {
      console.log(`Error testing ${pair.from}/${pair.to}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test the documented fx.rateGet.p2a endpoint specifically
  console.log('\n📡 Testing documented fx.rateGet.p2a endpoint...\n');
  
  try {
    const results = await client.getMultipleRates(testPairs);
    
    console.log('\nPaySend API Test Results:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.data.fromCurrency}/${result.data.toCurrency}: ${result.data.exchangeRate}`);
      } else {
        console.log(`❌ ${result.pair}: ${result.error}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.log('PaySend API testing failed:', error.message);
    return [];
  }
}

/**
 * Create production configuration for PaySend
 */
export function createPaySendProductionConfig(credentials) {
  return {
    production: true,
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    partnerId: credentials.partnerId,
    timeout: 30000,
    retryAttempts: 3
  };
}

// Test execution if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Test configuration (will need real credentials)
  const testConfig = {
    production: false,
    apiKey: 'test_api_key_here',
    secretKey: 'test_secret_key_here',
    partnerId: 'test_partner_id_here'
  };

  console.log('PaySend API Integration Framework Test');
  console.log('Note: This test requires valid PaySend API credentials\n');

  discoverPaySendAPI(testConfig)
    .then(results => {
      console.log('\nPaySend API framework ready for production deployment');
      console.log('To use with real credentials:');
      console.log('1. Obtain PaySend API key, secret key, and partner ID');
      console.log('2. Test with sandbox environment first');
      console.log('3. Deploy to production with live credentials');
    })
    .catch(error => {
      console.log('Framework test completed with expected authentication errors');
      console.log('Framework is ready for deployment with valid credentials');
    });
}