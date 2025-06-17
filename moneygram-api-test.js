/**
 * MoneyGram API Integration Test
 * Using provided sandbox credentials and endpoint
 */

import fetch from 'node-fetch';

// Sandbox credentials from provided example
const MONEYGRAM_CONFIG = {
  sandbox: {
    baseUrl: 'https://sandboxapi.moneygram.com',
    tokenEndpoint: '/oauth/accesstoken?grant_type=client_credentials',
    fxRateEndpoint: '/v1/fx-rates',
    // Basic auth token from your example
    authToken: 'bmliek5oNHR1bXk1ZmZMc3pIYjVPcUtSQVRtcVZLazI6dHZPS1h6eFg4RUNUM05VbQ'
  }
};

/**
 * Step 1: Get OAuth access token
 */
async function getAccessToken() {
  console.log('🔑 Getting OAuth access token from MoneyGram sandbox...\n');

  const url = `${MONEYGRAM_CONFIG.sandbox.baseUrl}${MONEYGRAM_CONFIG.sandbox.tokenEndpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${MONEYGRAM_CONFIG.sandbox.authToken}`
      }
    });

    console.log(`Token request status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const tokenData = await response.json();
      console.log('✅ Access token retrieved successfully!');
      console.log('Token response:', JSON.stringify(tokenData, null, 2));
      return tokenData.access_token;
    } else {
      const errorText = await response.text();
      console.log('❌ Token request failed');
      console.log('Error response:', errorText);
      return null;
    }

  } catch (error) {
    console.log('❌ Token request error:', error.message);
    return null;
  }
}

/**
 * Step 2: Get FX rates using access token
 */
async function getFXRates(accessToken) {
  console.log('\n💱 Getting FX rates from MoneyGram...\n');

  // Test currency pairs from your application
  const testPairs = [
    { from: 'GBP', to: 'NGN', amount: 100 },
    { from: 'USD', to: 'NGN', amount: 100 },
    { from: 'EUR', to: 'NGN', amount: 100 }
  ];

  const results = [];

  for (const pair of testPairs) {
    console.log(`Testing ${pair.from}/${pair.to} for ${pair.amount} ${pair.from}`);

    // Try different endpoint patterns
    const endpoints = [
      `/v1/fx-rates?fromCurrency=${pair.from}&toCurrency=${pair.to}&amount=${pair.amount}`,
      `/v1/fx-rates/${pair.from}/${pair.to}?amount=${pair.amount}`,
      `/fx-rates?from=${pair.from}&to=${pair.to}&amount=${pair.amount}`,
      `/rates/quote?fromCurrency=${pair.from}&toCurrency=${pair.to}&amount=${pair.amount}`
    ];

    for (const endpoint of endpoints) {
      const url = `${MONEYGRAM_CONFIG.sandbox.baseUrl}${endpoint}`;
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`  ${endpoint}: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const rateData = await response.json();
          console.log('  ✅ Success! Rate data:');
          console.log('  ', JSON.stringify(rateData, null, 2));
          
          results.push({
            pair: `${pair.from}/${pair.to}`,
            endpoint,
            data: rateData
          });
          
          break; // Found working endpoint for this pair
          
        } else if (response.status === 401) {
          console.log('  🔐 Unauthorized - token might be invalid');
          
        } else if (response.status === 404) {
          console.log('  ❌ Endpoint not found');
          
        } else {
          const errorText = await response.text();
          console.log(`  ⚠️  Error: ${errorText.substring(0, 200)}`);
        }

      } catch (error) {
        console.log(`  ❌ Request error: ${error.message}`);
      }
    }
  }

  return results;
}

/**
 * Step 3: Test with POST requests (some APIs prefer POST for rate quotes)
 */
async function testPOSTRates(accessToken) {
  console.log('\n📤 Testing POST requests for rate quotes...\n');

  const postEndpoints = [
    '/v1/rates/quote',
    '/v1/fx-rates/quote',
    '/rates/calculate',
    '/quote'
  ];

  const requestBody = {
    fromCurrency: 'GBP',
    toCurrency: 'NGN',
    amount: 100,
    fromCountry: 'GB',
    toCountry: 'NG'
  };

  for (const endpoint of postEndpoints) {
    const url = `${MONEYGRAM_CONFIG.sandbox.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`POST ${endpoint}: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ POST Success! Response:');
        console.log(JSON.stringify(data, null, 2));
        return data;
        
      } else if (response.status === 401) {
        console.log('🔐 Unauthorized');
        
      } else if (response.status === 400) {
        const errorText = await response.text();
        console.log('⚠️  Bad request:', errorText.substring(0, 200));
        
      } else {
        console.log(`❌ Status: ${response.status}`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  return null;
}

/**
 * Analyze rate response structure for integration
 */
function analyzeRateStructure(results) {
  console.log('\n📊 Analyzing Rate Response Structure...\n');

  results.forEach(result => {
    console.log(`Structure for ${result.pair}:`);
    console.log(`Endpoint: ${result.endpoint}`);
    
    const data = result.data;
    
    // Look for rate fields
    const rateFields = [];
    function findRateFields(obj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'number' && (
          key.toLowerCase().includes('rate') ||
          key.toLowerCase().includes('exchange') ||
          key.toLowerCase().includes('price')
        )) {
          rateFields.push({ path: currentPath, value });
        }
        
        if (typeof value === 'object' && value !== null) {
          findRateFields(value, currentPath);
        }
      }
    }
    
    findRateFields(data);
    
    if (rateFields.length > 0) {
      console.log('Rate fields found:');
      rateFields.forEach(field => {
        console.log(`  ${field.path}: ${field.value}`);
      });
    } else {
      console.log('No obvious rate fields found');
    }
    
    console.log('');
  });
}

/**
 * Main test execution
 */
async function main() {
  console.log('MoneyGram API Integration Test');
  console.log('Using Sandbox Environment');
  console.log('=============================\n');

  // Step 1: Get access token
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    console.log('❌ Failed to get access token. Cannot proceed with rate testing.');
    return;
  }

  // Step 2: Test GET requests for rates
  const results = await getFXRates(accessToken);

  // Step 3: Test POST requests
  const postResult = await testPOSTRates(accessToken);

  // Step 4: Analyze structure
  if (results.length > 0) {
    analyzeRateStructure(results);
  }

  if (postResult) {
    console.log('POST request also successful - API supports both GET and POST');
  }

  // Summary
  console.log('\n📋 Integration Summary:');
  console.log(`✅ Token authentication: ${accessToken ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Rate retrieval: ${results.length > 0 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Working endpoints found: ${results.length}`);
  
  if (results.length > 0) {
    console.log('\n🚀 Ready for production integration!');
    console.log('Next steps:');
    console.log('1. Replace sandbox URL with production URL');
    console.log('2. Use production credentials');
    console.log('3. Implement in main application');
    console.log('4. Replace web scraping with API calls');
  }
}

// Execute test
main().catch(console.error);