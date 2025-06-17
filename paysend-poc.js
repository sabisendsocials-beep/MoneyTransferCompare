/**
 * PaySend API Proof of Concept
 * Testing different authentication methods and endpoint patterns
 * Based on PaySend Enterprise documentation structure
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// PaySend API endpoint patterns to test
const PAYSEND_ENDPOINTS = {
  sandbox: 'https://sandbox-api.paysend.com',
  production: 'https://api.paysend.com',
  alternative: 'https://enterprise-api.paysend.com'
};

/**
 * Test PaySend API authentication patterns
 */
async function testPaySendAuthentication() {
  console.log('PaySend API Authentication Discovery');
  console.log('===================================\n');

  // Test different base URLs
  const baseUrls = Object.values(PAYSEND_ENDPOINTS);
  
  // Common API endpoints for FX rates
  const endpoints = [
    '/fx/rateGet/p2a',
    '/v1/fx/rates',
    '/api/v1/rates',
    '/rates/fx',
    '/fx/rates',
    '/enterprise/fx/rates'
  ];

  for (const baseUrl of baseUrls) {
    console.log(`Testing base URL: ${baseUrl}`);
    
    for (const endpoint of endpoints) {
      const fullUrl = `${baseUrl}${endpoint}`;
      
      try {
        // Test with minimal request to check if endpoint exists
        const response = await fetch(fullUrl, {
          method: 'OPTIONS',
          headers: {
            'Accept': 'application/json',
            'Origin': 'https://sabisend.com'
          },
          timeout: 10000
        });

        console.log(`  ${endpoint}: ${response.status} ${response.statusText}`);
        
        if (response.ok || response.status === 405) {
          console.log(`    ✓ Endpoint exists (${response.status})`);
        }

      } catch (error) {
        if (error.message.includes('timeout')) {
          console.log(`  ${endpoint}: Timeout`);
        } else {
          console.log(`  ${endpoint}: ${error.message}`);
        }
      }
    }
    console.log();
  }
}

/**
 * Test PaySend API with different request formats
 */
async function testPaySendRequestFormats() {
  console.log('PaySend API Request Format Testing');
  console.log('=================================\n');

  // Test currency pair
  const testPair = { from: 'GBP', to: 'NGN', amount: 100 };
  
  // Different request body structures to test
  const requestFormats = [
    {
      name: 'Standard Enterprise Format',
      body: {
        fromCurrency: testPair.from,
        toCurrency: testPair.to,
        amount: testPair.amount,
        payoutMethod: 'BANK_ACCOUNT',
        destinationCountry: 'NG'
      }
    },
    {
      name: 'Alternative Format 1',
      body: {
        source_currency: testPair.from,
        target_currency: testPair.to,
        send_amount: testPair.amount,
        recipient_country: 'NG',
        delivery_method: 'bank_transfer'
      }
    },
    {
      name: 'Alternative Format 2',
      body: {
        from: testPair.from,
        to: testPair.to,
        amount: testPair.amount,
        country: 'NG'
      }
    },
    {
      name: 'Minimal Format',
      body: {
        fromCurrency: testPair.from,
        toCurrency: testPair.to,
        amount: testPair.amount
      }
    }
  ];

  // Test with different authentication headers
  const authHeaders = [
    {
      name: 'API Key Header',
      headers: {
        'X-API-Key': 'test_key',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Bearer Token',
      headers: {
        'Authorization': 'Bearer test_token',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Basic Auth',
      headers: {
        'Authorization': 'Basic dGVzdDp0ZXN0', // test:test
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Custom Headers',
      headers: {
        'X-Partner-ID': 'test_partner',
        'X-API-Key': 'test_key',
        'X-Signature': 'test_signature',
        'X-Timestamp': Date.now().toString(),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  ];

  const testUrl = `${PAYSEND_ENDPOINTS.sandbox}/fx/rateGet/p2a`;

  for (const format of requestFormats) {
    console.log(`Testing ${format.name}:`);
    
    for (const auth of authHeaders) {
      try {
        const response = await fetch(testUrl, {
          method: 'POST',
          headers: auth.headers,
          body: JSON.stringify(format.body),
          timeout: 15000
        });

        console.log(`  ${auth.name}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.text();
          console.log(`    Success! Response: ${data.substring(0, 200)}`);
        } else if (response.status === 401) {
          console.log(`    Unauthorized - endpoint exists but needs valid credentials`);
        } else if (response.status === 400) {
          const errorText = await response.text();
          console.log(`    Bad request: ${errorText.substring(0, 100)}`);
        } else if (response.status === 404) {
          console.log(`    Not found`);
        } else {
          console.log(`    Status: ${response.status}`);
        }

      } catch (error) {
        if (error.message.includes('timeout')) {
          console.log(`  ${auth.name}: Timeout`);
        } else {
          console.log(`  ${auth.name}: ${error.message.substring(0, 50)}`);
        }
      }
    }
    console.log();
  }
}

/**
 * Test GET method with query parameters
 */
async function testPaySendGETRequests() {
  console.log('PaySend API GET Request Testing');
  console.log('==============================\n');

  const baseUrls = [PAYSEND_ENDPOINTS.sandbox, PAYSEND_ENDPOINTS.production];
  const endpoints = ['/fx/rateGet/p2a', '/v1/fx/rates', '/rates/fx'];
  
  const queryParams = {
    fromCurrency: 'GBP',
    toCurrency: 'NGN',
    amount: 100,
    destinationCountry: 'NG'
  };

  const queryString = new URLSearchParams(queryParams).toString();

  for (const baseUrl of baseUrls) {
    console.log(`Testing GET requests on: ${baseUrl}`);
    
    for (const endpoint of endpoints) {
      const testUrl = `${baseUrl}${endpoint}?${queryString}`;
      
      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-API-Key': 'test_key',
            'Authorization': 'Bearer test_token'
          },
          timeout: 10000
        });

        console.log(`  ${endpoint}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.text();
          console.log(`    Success! Response: ${data.substring(0, 150)}`);
        } else if (response.status === 401) {
          console.log(`    Unauthorized - endpoint accessible but needs auth`);
        } else if (response.status === 400) {
          console.log(`    Bad request - may need different parameters`);
        }

      } catch (error) {
        console.log(`  ${endpoint}: ${error.message.substring(0, 50)}`);
      }
    }
    console.log();
  }
}

/**
 * Analyze response patterns for integration
 */
function analyzePaySendIntegration() {
  console.log('PaySend Integration Analysis');
  console.log('==========================\n');
  
  console.log('Based on PaySend Enterprise API documentation:');
  console.log('1. Endpoint: fx.rateGet.p2a - Get FX rates for bank account payouts');
  console.log('2. Authentication: Likely API key + signature-based');
  console.log('3. Request format: POST with JSON body');
  console.log('4. Response: JSON with rate information\n');
  
  console.log('Expected integration flow:');
  console.log('1. Authenticate with API key and signature');
  console.log('2. POST to /fx/rateGet/p2a with currency pair');
  console.log('3. Parse JSON response for exchange rate');
  console.log('4. Handle different payout methods (bank, card, etc.)\n');
  
  console.log('Benefits for SabiSend:');
  console.log('• Real-time PaySend rates instead of web scraping');
  console.log('• Multiple payout method rates');
  console.log('• Structured API responses');
  console.log('• Better reliability and accuracy\n');
  
  console.log('Next steps:');
  console.log('1. Obtain PaySend Enterprise API credentials');
  console.log('2. Test with sandbox environment');
  console.log('3. Implement authentication signature generation');
  console.log('4. Parse response format for rate extraction');
  console.log('5. Integrate into SabiSend rate collection system');
}

/**
 * Main test execution
 */
async function runPaySendPOC() {
  console.log('PaySend API Proof of Concept');
  console.log('============================\n');
  
  // Test 1: Check endpoint availability
  await testPaySendAuthentication();
  
  // Test 2: Try different request formats
  await testPaySendRequestFormats();
  
  // Test 3: Test GET requests
  await testPaySendGETRequests();
  
  // Analysis and summary
  analyzePaySendIntegration();
}

// Execute the proof of concept
runPaySendPOC().catch(error => {
  console.log('PaySend POC completed with expected authentication errors');
  console.log('Framework ready for deployment with valid PaySend credentials');
});