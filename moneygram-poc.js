/**
 * MoneyGram API Proof of Concept
 * Testing rate retrieval from MoneyGram developer API
 * Based on: https://developer.moneygram.com/moneygram-developer/reference/retrievefxrateanddetails
 */

import fetch from 'node-fetch';

// API Configuration (from MoneyGram documentation)
const MONEYGRAM_CONFIG = {
  // Try different base URLs based on common patterns
  baseUrls: [
    'https://api.moneygram.com',
    'https://developer.moneygram.com/api',
    'https://gateway.moneygram.com',
    'https://sandbox.moneygram.com',
    'https://api-sandbox.moneygram.com',
    'https://rest.moneygram.com'
  ],
  // Common endpoints from documentation
  endpoints: {
    fxRates: '/v1/fx-rates',
    fxRatesV2: '/v2/fx-rates',
    rates: '/rates',
    exchangeRates: '/exchange-rates',
    quote: '/quote',
    pricing: '/pricing'
  }
};

/**
 * Test MoneyGram FX Rates API
 * Based on their documentation structure
 */
async function testMoneyGramFXAPI() {
  console.log('🔍 Testing MoneyGram FX Rates API...\n');
  
  // Test parameters based on typical FX API patterns
  const testParams = [
    {
      fromCountry: 'US',
      toCountry: 'NG', // Nigeria
      fromCurrency: 'USD',
      toCurrency: 'NGN',
      amount: 100
    },
    {
      fromCountry: 'GB',
      toCountry: 'NG',
      fromCurrency: 'GBP', 
      toCurrency: 'NGN',
      amount: 100
    }
  ];

  for (const params of testParams) {
    console.log(`\n--- Testing ${params.fromCurrency}/${params.toCurrency} ---`);
    await testEndpoint(params);
  }
}

/**
 * Test different endpoint variations across multiple base URLs
 */
async function testEndpoint(params) {
  const { fromCountry, toCountry, fromCurrency, toCurrency, amount } = params;
  
  // Test each base URL with each endpoint pattern
  for (const baseUrl of MONEYGRAM_CONFIG.baseUrls) {
    console.log(`\n🔍 Testing base URL: ${baseUrl}`);
    
    const urlVariations = [
      // Pattern 1: Query parameters
      `${baseUrl}${MONEYGRAM_CONFIG.endpoints.fxRates}?fromCountry=${fromCountry}&toCountry=${toCountry}&fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&amount=${amount}`,
      
      // Pattern 2: Path parameters
      `${baseUrl}${MONEYGRAM_CONFIG.endpoints.fxRates}/${fromCurrency}/${toCurrency}`,
      
      // Pattern 3: Quote endpoint (common in money transfer APIs)
      `${baseUrl}${MONEYGRAM_CONFIG.endpoints.quote}?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`,
      
      // Pattern 4: V2 endpoint
      `${baseUrl}${MONEYGRAM_CONFIG.endpoints.fxRatesV2}?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`,
      
      // Pattern 5: Simple pricing
      `${baseUrl}${MONEYGRAM_CONFIG.endpoints.pricing}/${fromCurrency}/${toCurrency}`
    ];

    for (let i = 0; i < urlVariations.length; i++) {
      const url = urlVariations[i];
      console.log(`  Testing: ${url.split(baseUrl)[1]}`);
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'SabiSend-PoC/1.0',
            // Try common API key headers (without actual key)
            'X-API-Key': 'test',
            'Authorization': 'Bearer test'
          },
          timeout: 8000
        });

        console.log(`    Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('    ✅ Success! Response data:');
          console.log(JSON.stringify(data, null, 2));
          analyzeResponseStructure(data, params);
          return true; // Found working endpoint
          
        } else if (response.status === 401 || response.status === 403) {
          console.log('    🔐 Authentication required');
          const responseText = await response.text();
          if (responseText.length < 500) {
            console.log('    Response:', responseText);
          }
          
        } else if (response.status === 404) {
          console.log('    ❌ Not found');
          
        } else if (response.status === 405) {
          console.log('    ⚠️  Method not allowed - might need POST');
          
        } else {
          console.log(`    ⚠️  Status: ${response.status}`);
          const responseText = await response.text();
          if (responseText.length < 200) {
            console.log('    Response:', responseText);
          }
        }
        
      } catch (error) {
        if (error.code === 'ENOTFOUND') {
          console.log('    ❌ Domain not found');
        } else if (error.code === 'ECONNREFUSED') {
          console.log('    ❌ Connection refused');
        } else {
          console.log(`    ❌ Error: ${error.message}`);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return false; // No working endpoint found
}

/**
 * Analyze successful response structure
 */
function analyzeResponseStructure(data, params) {
  console.log('\n📊 Response Structure Analysis:');
  
  // Look for common rate fields
  const possibleRateFields = [
    'rate', 'exchangeRate', 'fx_rate', 'fxRate', 'price', 'value',
    'send_rate', 'receive_rate', 'customer_rate', 'wholesale_rate'
  ];
  
  const possibleFeeFields = [
    'fee', 'fees', 'transferFee', 'service_fee', 'cost', 'charge'
  ];
  
  console.log('Looking for rate information...');
  findFields(data, possibleRateFields, 'Rate');
  
  console.log('Looking for fee information...');
  findFields(data, possibleFeeFields, 'Fee');
  
  console.log('Full response keys:', Object.keys(data));
}

/**
 * Helper function to find fields in nested objects
 */
function findFields(obj, fieldNames, fieldType) {
  const found = [];
  
  function search(current, path = '') {
    if (typeof current === 'object' && current !== null) {
      for (const [key, value] of Object.entries(current)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (fieldNames.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          found.push({ path: currentPath, value });
        }
        
        if (typeof value === 'object') {
          search(value, currentPath);
        }
      }
    }
  }
  
  search(obj);
  
  if (found.length > 0) {
    console.log(`Found ${fieldType} fields:`, found);
  } else {
    console.log(`No ${fieldType} fields found`);
  }
}

/**
 * Test with authentication (if API key is provided)
 */
async function testWithAuth(apiKey) {
  console.log('\n🔐 Testing with authentication...');
  
  const authHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  const testUrl = `${MONEYGRAM_CONFIG.baseUrl}${MONEYGRAM_CONFIG.endpoints.fxRates}?fromCurrency=USD&toCurrency=NGN&amount=100`;
  
  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: authHeaders,
      timeout: 10000
    });
    
    console.log(`Authenticated request status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authenticated success!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Authentication failed:', errorText);
    }
    
  } catch (error) {
    console.log('Authenticated request error:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('MoneyGram API Proof of Concept');
  console.log('==============================\n');
  
  await testMoneyGramFXAPI();
  
  console.log('\n📋 Summary:');
  console.log('- Tested multiple endpoint patterns');
  console.log('- Checked for authentication requirements');
  console.log('- Analyzed response structures');
  console.log('\nNext steps if API key is available:');
  console.log('1. Test with proper authentication');
  console.log('2. Verify rate accuracy against current market rates');
  console.log('3. Test rate limits and caching requirements');
  console.log('4. Map response structure to our provider interface');
}

// Run the PoC
main().catch(console.error);

export {
  testMoneyGramFXAPI,
  testWithAuth
};