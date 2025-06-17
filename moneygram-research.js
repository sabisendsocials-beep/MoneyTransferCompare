/**
 * MoneyGram API Research - Enhanced PoC
 * Based on official documentation:
 * - Rate retrieval: https://developer.moneygram.com/moneygram-developer/reference/retrievefxrateanddetails
 * - Access token: https://developer.moneygram.com/moneygram-developer/reference/getaccesstoken
 */

import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

/**
 * Scrape MoneyGram developer documentation to extract API details
 */
async function scrapeApiDocumentation() {
  console.log('🔍 Researching MoneyGram API documentation...\n');

  const endpoints = [
    {
      name: 'Access Token',
      url: 'https://developer.moneygram.com/moneygram-developer/reference/getaccesstoken'
    },
    {
      name: 'FX Rate Retrieval', 
      url: 'https://developer.moneygram.com/moneygram-developer/reference/retrievefxrateanddetails'
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n--- Analyzing ${endpoint.name} Documentation ---`);
    await analyzeEndpointDoc(endpoint.url, endpoint.name);
  }
}

/**
 * Analyze individual endpoint documentation
 */
async function analyzeEndpointDoc(url, endpointName) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SabiSend-Research/1.0)'
      }
    });

    if (!response.ok) {
      console.log(`❌ Failed to fetch ${endpointName} docs: ${response.status}`);
      return;
    }

    const html = await response.text();
    const doc = parse(html);

    // Extract API endpoint information
    const codeBlocks = doc.querySelectorAll('code, pre, .code-block');
    const apiInfo = {
      method: null,
      endpoint: null,
      baseUrl: null,
      headers: [],
      parameters: [],
      sampleRequest: null,
      sampleResponse: null
    };

    console.log(`✅ Successfully loaded ${endpointName} documentation`);
    
    // Look for HTTP method and endpoint patterns
    codeBlocks.forEach(block => {
      const text = block.text;
      
      // Extract HTTP method and endpoint
      const methodMatch = text.match(/(GET|POST|PUT|DELETE)\s+(https?:\/\/[^\s]+|\/[^\s]*)/i);
      if (methodMatch) {
        apiInfo.method = methodMatch[1];
        apiInfo.endpoint = methodMatch[2];
        console.log(`Found endpoint: ${apiInfo.method} ${apiInfo.endpoint}`);
      }

      // Extract base URL patterns
      const baseUrlMatch = text.match(/https?:\/\/[^\/\s]+(\.moneygram\.com[^\/\s]*)/i);
      if (baseUrlMatch) {
        apiInfo.baseUrl = baseUrlMatch[0].split('/')[0] + '//' + baseUrlMatch[0].split('/')[2];
        console.log(`Found base URL: ${apiInfo.baseUrl}`);
      }

      // Look for authorization headers
      if (text.includes('Authorization') || text.includes('Bearer') || text.includes('API-Key')) {
        apiInfo.headers.push(text.trim());
        console.log(`Found auth header pattern: ${text.substring(0, 100)}...`);
      }

      // Look for request parameters
      if (text.includes('fromCurrency') || text.includes('toCurrency') || text.includes('amount')) {
        apiInfo.parameters.push(text.trim());
        console.log(`Found parameter pattern: ${text.substring(0, 100)}...`);
      }
    });

    // Extract any JSON examples
    const jsonBlocks = html.match(/\{[^}]*"[^"]*"[^}]*\}/g);
    if (jsonBlocks) {
      jsonBlocks.forEach(json => {
        try {
          const parsed = JSON.parse(json);
          if (parsed.access_token || parsed.token) {
            apiInfo.sampleResponse = json;
            console.log(`Found token response sample: ${json}`);
          }
          if (parsed.rate || parsed.exchangeRate || parsed.fxRate) {
            apiInfo.sampleResponse = json;
            console.log(`Found rate response sample: ${json}`);
          }
        } catch (e) {
          // Ignore invalid JSON
        }
      });
    }

    return apiInfo;

  } catch (error) {
    console.log(`❌ Error analyzing ${endpointName}: ${error.message}`);
    return null;
  }
}

/**
 * Test OAuth/Token endpoint based on documentation patterns
 */
async function testTokenEndpoint() {
  console.log('\n🔐 Testing OAuth/Token Endpoint Patterns...\n');

  const tokenEndpoints = [
    'https://api.moneygram.com/oauth/token',
    'https://api.moneygram.com/v1/oauth/token', 
    'https://api.moneygram.com/auth/token',
    'https://api.moneygram.com/token',
    'https://gateway.moneygram.com/oauth/token',
    'https://auth.moneygram.com/oauth/token'
  ];

  const tokenPayload = {
    grant_type: 'client_credentials',
    client_id: 'test_client_id',
    client_secret: 'test_client_secret',
    scope: 'fx-rates'
  };

  for (const endpoint of tokenEndpoints) {
    console.log(`Testing token endpoint: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenPayload).toString()
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 400 || response.status === 401) {
        const responseText = await response.text();
        console.log(`  Response: ${responseText.substring(0, 200)}`);
        
        // Look for credential requirements in error messages
        if (responseText.includes('client_id') || responseText.includes('client_secret')) {
          console.log('  ✅ Found credential requirement - this endpoint expects real credentials');
        }
      }

    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        console.log('  ❌ Domain not found');
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
  }
}

/**
 * Test FX Rate endpoints with various authentication patterns
 */
async function testFXRateEndpoints() {
  console.log('\n💱 Testing FX Rate Endpoint Patterns...\n');

  const fxEndpoints = [
    {
      url: 'https://api.moneygram.com/v1/fx-rates',
      method: 'GET',
      params: '?fromCurrency=GBP&toCurrency=NGN&amount=100'
    },
    {
      url: 'https://api.moneygram.com/v1/rates/quote',
      method: 'POST',
      body: { fromCurrency: 'GBP', toCurrency: 'NGN', amount: 100 }
    },
    {
      url: 'https://api.moneygram.com/v2/fx-rates',
      method: 'GET', 
      params: '?from=GBP&to=NGN&amount=100'
    }
  ];

  const authHeaders = [
    { 'Authorization': 'Bearer test_token' },
    { 'X-API-Key': 'test_api_key' },
    { 'Authorization': 'Basic dGVzdDp0ZXN0' }, // test:test in base64
    { 'Client-Id': 'test_client', 'Client-Secret': 'test_secret' }
  ];

  for (const endpoint of fxEndpoints) {
    console.log(`\nTesting ${endpoint.method} ${endpoint.url}`);
    
    for (const authHeader of authHeaders) {
      const url = endpoint.params ? endpoint.url + endpoint.params : endpoint.url;
      const authType = Object.keys(authHeader)[0];
      
      try {
        const options = {
          method: endpoint.method,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...authHeader
          }
        };

        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(url, options);
        console.log(`  ${authType}: ${response.status} ${response.statusText}`);

        if (response.status === 401 || response.status === 403) {
          const errorText = await response.text();
          if (errorText.includes('token') || errorText.includes('credentials')) {
            console.log(`    ✅ Authentication endpoint confirmed - needs valid ${authType}`);
          }
        } else if (response.status === 400) {
          const errorText = await response.text();
          console.log(`    Response: ${errorText.substring(0, 150)}`);
        }

      } catch (error) {
        console.log(`  ${authType}: Error - ${error.message}`);
      }
    }
  }
}

/**
 * Generate integration requirements summary
 */
function generateIntegrationSummary() {
  console.log('\n📋 MoneyGram API Integration Requirements Summary');
  console.log('================================================\n');
  
  console.log('Required for Integration:');
  console.log('1. MoneyGram Developer Account');
  console.log('   - Register at https://developer.moneygram.com');
  console.log('   - Complete business verification process');
  console.log('   - Obtain API credentials\n');
  
  console.log('2. Authentication Credentials:');
  console.log('   - Client ID');
  console.log('   - Client Secret');
  console.log('   - Potentially API Key');
  console.log('   - OAuth 2.0 flow (client_credentials grant)\n');
  
  console.log('3. Expected API Flow:');
  console.log('   Step 1: POST /oauth/token (get access token)');
  console.log('   Step 2: GET /v1/fx-rates (retrieve rates with Bearer token)');
  console.log('   Step 3: Parse response for rate information\n');
  
  console.log('4. Rate Limiting Considerations:');
  console.log('   - Token expiration handling');
  console.log('   - Request rate limits');
  console.log('   - Error handling for auth failures\n');
  
  console.log('5. Integration Benefits:');
  console.log('   - Real-time accurate rates');
  console.log('   - Structured JSON responses');
  console.log('   - No web scraping required');
  console.log('   - Better reliability and performance');
}

/**
 * Main research execution
 */
async function main() {
  console.log('MoneyGram API Research & Enhanced PoC');
  console.log('====================================\n');
  
  // Phase 1: Documentation analysis
  await scrapeApiDocumentation();
  
  // Phase 2: Token endpoint testing
  await testTokenEndpoint();
  
  // Phase 3: FX rate endpoint testing  
  await testFXRateEndpoints();
  
  // Phase 4: Integration summary
  generateIntegrationSummary();
  
  console.log('\nNext Steps:');
  console.log('- Obtain MoneyGram developer credentials');
  console.log('- Test with real authentication');
  console.log('- Implement production integration');
  console.log('- Replace web scraping with API calls');
}

// Execute research
main().catch(console.error);