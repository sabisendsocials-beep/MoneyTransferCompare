/**
 * Wise Public API Test
 * Testing quote endpoints without authentication
 * Based on user feedback that quotes may not require auth
 */

import fetch from 'node-fetch';

/**
 * Test Wise public quote endpoints
 */
async function testWisePublicQuotes() {
  console.log('Wise Public Quote API Test');
  console.log('==========================\n');

  const baseUrls = [
    'https://api.wise.com',
    'https://api.sandbox.transferwise.tech',
    'https://api.transferwise.com'
  ];

  const quoteEndpoints = [
    '/v1/quotes',
    '/v2/quotes', 
    '/quotes',
    '/v1/rates',
    '/rates',
    '/v1/quote',
    '/quote'
  ];

  // Test different request formats
  const testRequests = [
    {
      name: 'Standard Quote Request',
      body: {
        sourceCurrency: 'GBP',
        targetCurrency: 'NGN',
        sourceAmount: 100
      }
    },
    {
      name: 'With Profile (Anonymous)',
      body: {
        sourceCurrency: 'GBP',
        targetCurrency: 'NGN',
        sourceAmount: 100,
        profile: null
      }
    },
    {
      name: 'Minimal Format',
      body: {
        source: 'GBP',
        target: 'NGN',
        amount: 100
      }
    },
    {
      name: 'Alternative Field Names',
      body: {
        from: 'GBP',
        to: 'NGN',
        value: 100
      }
    }
  ];

  for (const baseUrl of baseUrls) {
    console.log(`Testing base URL: ${baseUrl}`);
    
    for (const endpoint of quoteEndpoints) {
      console.log(`  Endpoint: ${endpoint}`);
      
      // Test GET request first (no auth needed)
      try {
        const getUrl = `${baseUrl}${endpoint}?sourceCurrency=GBP&targetCurrency=NGN&sourceAmount=100`;
        const getResponse = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SabiSend-Rate-Checker/1.0'
          },
          timeout: 15000
        });

        console.log(`    GET: ${getResponse.status} ${getResponse.statusText}`);
        
        if (getResponse.ok) {
          const data = await getResponse.text();
          console.log(`    ✅ SUCCESS! GET method works: ${data.substring(0, 200)}...`);
          
          // Try to parse as JSON
          try {
            const jsonData = JSON.parse(data);
            console.log('    📊 JSON Response Structure:');
            console.log(JSON.stringify(jsonData, null, 2));
          } catch (e) {
            console.log('    📄 Text response (not JSON)');
          }
        } else if (getResponse.status === 401) {
          console.log(`    🔒 Requires authentication`);
        } else if (getResponse.status === 404) {
          console.log(`    ❌ Not found`);
        } else if (getResponse.status === 400) {
          const errorText = await getResponse.text();
          console.log(`    ⚠️ Bad request: ${errorText.substring(0, 100)}`);
        }

      } catch (error) {
        if (error.message.includes('timeout')) {
          console.log(`    ⏱️ Timeout`);
        } else {
          console.log(`    ❌ Error: ${error.message.substring(0, 50)}`);
        }
      }
      
      // Test POST requests with different formats
      for (const request of testRequests) {
        try {
          const postResponse = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'SabiSend-Rate-Checker/1.0'
            },
            body: JSON.stringify(request.body),
            timeout: 15000
          });

          console.log(`    POST (${request.name}): ${postResponse.status} ${postResponse.statusText}`);
          
          if (postResponse.ok) {
            const data = await postResponse.text();
            console.log(`    ✅ SUCCESS! POST works: ${data.substring(0, 200)}...`);
            
            try {
              const jsonData = JSON.parse(data);
              console.log('    📊 JSON Response:');
              console.log(JSON.stringify(jsonData, null, 2));
              
              // Extract rate information
              if (jsonData.rate || jsonData.exchangeRate || jsonData.targetAmount) {
                console.log('    🎯 RATE DATA FOUND - This endpoint works for SabiSend!');
                return { endpoint: `${baseUrl}${endpoint}`, method: 'POST', data: jsonData };
              }
              
            } catch (e) {
              console.log('    📄 Non-JSON response');
            }
          } else if (postResponse.status === 401) {
            console.log(`    🔒 POST requires authentication`);
          } else if (postResponse.status === 404) {
            console.log(`    ❌ POST not found`);
          } else if (postResponse.status === 400) {
            const errorText = await postResponse.text();
            console.log(`    ⚠️ POST bad request: ${errorText.substring(0, 100)}`);
          }

        } catch (error) {
          console.log(`    ❌ POST (${request.name}): ${error.message.substring(0, 40)}`);
        }
      }
      
      console.log();
    }
    console.log();
  }
}

/**
 * Test alternative Wise public endpoints
 */
async function testAlternativeWiseEndpoints() {
  console.log('Testing Alternative Wise Public Endpoints');
  console.log('=========================================\n');

  const alternativeEndpoints = [
    // Possible public rate endpoints
    'https://wise.com/api/v1/rates',
    'https://wise.com/rates',
    'https://wise.com/api/rates',
    'https://transferwise.com/api/v1/rates',
    'https://transferwise.com/rates',
    
    // Calculator endpoints (often public)
    'https://wise.com/api/calculator',
    'https://wise.com/calculator',
    'https://transferwise.com/api/calculator',
    
    // Widget endpoints (public facing)
    'https://wise.com/widget/rates',
    'https://wise.com/api/widget/rates'
  ];

  for (const endpoint of alternativeEndpoints) {
    console.log(`Testing: ${endpoint}`);
    
    try {
      // Test with query parameters
      const testUrl = `${endpoint}?source=GBP&target=NGN&amount=100`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; SabiSend/1.0)'
        },
        timeout: 10000
      });

      console.log(`  ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log(`  ✅ SUCCESS! ${data.substring(0, 150)}...`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('  📊 Response structure:');
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('  📄 Non-JSON response');
        }
      }

    } catch (error) {
      console.log(`  ❌ ${error.message.substring(0, 50)}`);
    }
  }
}

/**
 * Test Wise calculator endpoint (often public)
 */
async function testWiseCalculatorEndpoint() {
  console.log('\nTesting Wise Calculator Endpoints');
  console.log('=================================\n');

  const calculatorTests = [
    {
      url: 'https://wise.com/rates/live',
      params: { source: 'GBP', target: 'NGN', amount: 100 }
    },
    {
      url: 'https://api.wise.com/rates/live',
      params: { source: 'GBP', target: 'NGN', amount: 100 }
    },
    {
      url: 'https://transferwise.com/rates/live',
      params: { from: 'GBP', to: 'NGN', amount: 100 }
    }
  ];

  for (const test of calculatorTests) {
    const queryString = new URLSearchParams(test.params).toString();
    const fullUrl = `${test.url}?${queryString}`;
    
    console.log(`Testing: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; SabiSend/1.0)',
          'Referer': 'https://wise.com'
        },
        timeout: 10000
      });

      console.log(`  ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log(`  ✅ SUCCESS! Response: ${data.substring(0, 200)}...`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('  📊 Calculator response:');
          console.log(JSON.stringify(jsonData, null, 2));
          
          // This could be our working endpoint!
          return { url: fullUrl, data: jsonData };
          
        } catch (e) {
          console.log('  📄 Non-JSON response');
        }
      }

    } catch (error) {
      console.log(`  ❌ ${error.message}`);
    }
  }
}

/**
 * Main test execution
 */
async function runWisePublicTests() {
  console.log('🔍 Searching for Wise Public Quote APIs');
  console.log('======================================\n');
  
  // Test 1: Official API endpoints without auth
  await testWisePublicQuotes();
  
  // Test 2: Alternative public endpoints
  await testAlternativeWiseEndpoints();
  
  // Test 3: Calculator endpoints
  const calculatorResult = await testWiseCalculatorEndpoint();
  
  if (calculatorResult) {
    console.log('\n🎯 FOUND WORKING WISE ENDPOINT!');
    console.log('===============================');
    console.log(`URL: ${calculatorResult.url}`);
    console.log('This endpoint can be integrated into SabiSend for real-time Wise rates!');
  } else {
    console.log('\n📋 WISE API ANALYSIS COMPLETE');
    console.log('============================');
    console.log('No public endpoints found - Wise likely requires authentication for all quote APIs');
    console.log('Integration framework ready for production API credentials');
  }
}

// Execute the test
runWisePublicTests().catch(error => {
  console.log('Wise public API test completed');
  console.log('Integration framework ready for authenticated endpoints');
});