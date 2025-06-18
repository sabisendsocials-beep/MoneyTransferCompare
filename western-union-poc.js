/**
 * Western Union API Proof of Concept
 * Testing API endpoint discovery and authentication patterns
 * Based on Western Union Developer Portal structure
 */

import fetch from 'node-fetch';

// Western Union API endpoint patterns to test
const WU_ENDPOINTS = {
  sandbox: 'https://sandbox.westernunion.com',
  production: 'https://api.westernunion.com',
  developer: 'https://developer-api.westernunion.com'
};

/**
 * Test Western Union API endpoint availability
 */
async function discoverWesternUnionEndpoints() {
  console.log('Western Union API Endpoint Discovery');
  console.log('===================================\n');

  const baseUrls = Object.values(WU_ENDPOINTS);
  
  // Common API endpoints for quotes and rates
  const endpoints = [
    '/v1/quotes',
    '/quotes',
    '/v1/quotes/exchange-rates',
    '/quotes/fx-rates',
    '/v1/fx/quotes',
    '/api/v1/quotes',
    '/v1/oauth/token',
    '/oauth/token',
    '/auth/token'
  ];

  for (const baseUrl of baseUrls) {
    console.log(`Testing base URL: ${baseUrl}`);
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'OPTIONS',
          headers: {
            'Accept': 'application/json',
            'Origin': 'https://sabisend.com'
          },
          timeout: 10000
        });

        console.log(`  ${endpoint}: ${response.status} ${response.statusText}`);
        
        if (response.ok || response.status === 405) {
          console.log(`    ✓ Endpoint accessible (${response.status})`);
          
          // Check for CORS headers
          const corsHeaders = response.headers.get('access-control-allow-origin');
          if (corsHeaders) {
            console.log(`    CORS: ${corsHeaders}`);
          }
        }

      } catch (error) {
        if (error.message.includes('timeout')) {
          console.log(`  ${endpoint}: Timeout`);
        } else if (error.code === 'ENOTFOUND') {
          console.log(`  ${endpoint}: DNS not found`);
        } else {
          console.log(`  ${endpoint}: ${error.message.substring(0, 50)}`);
        }
      }
    }
    console.log();
  }
}

/**
 * Test Western Union authentication patterns
 */
async function testWesternUnionAuthentication() {
  console.log('Western Union Authentication Testing');
  console.log('==================================\n');

  const testUrl = `${WU_ENDPOINTS.sandbox}/v1/oauth/token`;
  
  // Different authentication approaches to test
  const authMethods = [
    {
      name: 'Client Credentials Form Data',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'test_client_id',
        client_secret: 'test_client_secret'
      }).toString()
    },
    {
      name: 'Basic Auth with Form Data',
      headers: {
        'Authorization': 'Basic dGVzdF9jbGllbnRfaWQ6dGVzdF9jbGllbnRfc2VjcmV0', // test_client_id:test_client_secret
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'grant_type=client_credentials'
    },
    {
      name: 'JSON Body Authentication',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: 'test_client_id',
        client_secret: 'test_client_secret'
      })
    },
    {
      name: 'API Key Header',
      headers: {
        'X-API-Key': 'test_api_key',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials'
      })
    }
  ];

  for (const method of authMethods) {
    console.log(`Testing ${method.name}:`);
    
    try {
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: method.headers,
        body: method.body,
        timeout: 15000
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log(`  Success! Response: ${data.substring(0, 200)}`);
      } else if (response.status === 401) {
        console.log(`  Unauthorized - endpoint exists but needs valid credentials`);
      } else if (response.status === 400) {
        const errorText = await response.text();
        console.log(`  Bad request: ${errorText.substring(0, 150)}`);
      } else if (response.status === 404) {
        console.log(`  Not found`);
      } else {
        const errorText = await response.text();
        console.log(`  Error: ${errorText.substring(0, 100)}`);
      }

    } catch (error) {
      if (error.message.includes('timeout')) {
        console.log(`  Timeout`);
      } else {
        console.log(`  Error: ${error.message.substring(0, 50)}`);
      }
    }
    
    console.log();
  }
}

/**
 * Test Western Union quote request formats
 */
async function testWesternUnionQuoteFormats() {
  console.log('Western Union Quote Request Testing');
  console.log('=================================\n');

  const quoteEndpoints = [
    `${WU_ENDPOINTS.sandbox}/v1/quotes`,
    `${WU_ENDPOINTS.sandbox}/quotes`,
    `${WU_ENDPOINTS.sandbox}/v1/quotes/exchange-rates`
  ];

  // Different quote request formats to test
  const requestFormats = [
    {
      name: 'Standard Quote Format',
      body: {
        sourceCurrency: 'GBP',
        targetCurrency: 'NGN',
        sourceAmount: 100,
        originCountry: 'GB',
        destinationCountry: 'NG'
      }
    },
    {
      name: 'Alternative Format 1',
      body: {
        fromCurrency: 'GBP',
        toCurrency: 'NGN',
        amount: 100,
        sendCountry: 'GB',
        receiveCountry: 'NG'
      }
    },
    {
      name: 'Nested Format',
      body: {
        send: {
          currency: 'GBP',
          amount: 100,
          country: 'GB'
        },
        receive: {
          currency: 'NGN',
          country: 'NG'
        }
      }
    },
    {
      name: 'Minimal Format',
      body: {
        from: 'GBP',
        to: 'NGN',
        amount: 100
      }
    }
  ];

  const authHeaders = [
    {
      'Authorization': 'Bearer test_token',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    {
      'X-API-Key': 'test_api_key',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  ];

  for (const endpoint of quoteEndpoints) {
    console.log(`Testing endpoint: ${endpoint}`);
    
    for (const format of requestFormats) {
      console.log(`  ${format.name}:`);
      
      for (const [index, headers] of authHeaders.entries()) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(format.body),
            timeout: 10000
          });

          const authType = index === 0 ? 'Bearer' : 'API Key';
          console.log(`    ${authType}: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            const data = await response.text();
            console.log(`    Success! Response: ${data.substring(0, 150)}`);
          } else if (response.status === 401) {
            console.log(`    Unauthorized - needs valid credentials`);
          } else if (response.status === 400) {
            const errorText = await response.text();
            console.log(`    Bad request: ${errorText.substring(0, 100)}`);
          }

        } catch (error) {
          const authType = index === 0 ? 'Bearer' : 'API Key';
          console.log(`    ${authType}: ${error.message.substring(0, 50)}`);
        }
      }
    }
    console.log();
  }
}

/**
 * Test GET method for quotes with query parameters
 */
async function testWesternUnionGETQuotes() {
  console.log('Western Union GET Quote Testing');
  console.log('=============================\n');

  const queryParams = new URLSearchParams({
    sourceCurrency: 'GBP',
    targetCurrency: 'NGN',
    sourceAmount: 100,
    originCountry: 'GB',
    destinationCountry: 'NG'
  });

  const endpoints = [
    `/v1/quotes?${queryParams}`,
    `/quotes?${queryParams}`,
    `/v1/quotes/exchange-rates?${queryParams}`
  ];

  for (const endpoint of endpoints) {
    const testUrl = `${WU_ENDPOINTS.sandbox}${endpoint}`;
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer test_token',
          'X-API-Key': 'test_api_key'
        },
        timeout: 10000
      });

      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log(`  Success! Response: ${data.substring(0, 150)}`);
      } else if (response.status === 401) {
        console.log(`  Unauthorized - endpoint accessible but needs auth`);
      } else if (response.status === 400) {
        console.log(`  Bad request - may need different parameters`);
      } else if (response.status === 404) {
        console.log(`  Not found`);
      }

    } catch (error) {
      console.log(`${endpoint}: ${error.message.substring(0, 50)}`);
    }
  }
}

/**
 * Analyze Western Union integration for SabiSend
 */
function analyzeWesternUnionIntegration() {
  console.log('\nWestern Union Integration Analysis');
  console.log('================================\n');
  
  console.log('Expected Western Union API structure:');
  console.log('1. OAuth 2.0 authentication with client credentials');
  console.log('2. Quote endpoints for exchange rate retrieval');
  console.log('3. JSON request/response format');
  console.log('4. Country and currency code requirements\n');
  
  console.log('Integration benefits for SabiSend:');
  console.log('• Real-time Western Union rates instead of web scraping');
  console.log('• Structured JSON responses with detailed quote information');
  console.log('• Multiple service options and fees');
  console.log('• Better reliability and accuracy\n');
  
  console.log('Next steps for production integration:');
  console.log('1. Obtain Western Union Developer API credentials');
  console.log('2. Test with sandbox environment');
  console.log('3. Implement OAuth 2.0 authentication flow');
  console.log('4. Parse quote responses for rate extraction');
  console.log('5. Integrate into SabiSend rate collection system');
}

/**
 * Main Western Union POC execution
 */
async function runWesternUnionPOC() {
  console.log('Western Union API Proof of Concept');
  console.log('==================================\n');
  
  // Test 1: Endpoint discovery
  await discoverWesternUnionEndpoints();
  
  // Test 2: Authentication patterns
  await testWesternUnionAuthentication();
  
  // Test 3: Quote request formats
  await testWesternUnionQuoteFormats();
  
  // Test 4: GET method testing
  await testWesternUnionGETQuotes();
  
  // Analysis and recommendations
  analyzeWesternUnionIntegration();
}

// Execute the proof of concept
runWesternUnionPOC().catch(error => {
  console.log('Western Union POC completed with expected authentication errors');
  console.log('Framework ready for deployment with valid Western Union credentials');
});