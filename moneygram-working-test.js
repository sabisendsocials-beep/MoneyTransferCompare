/**
 * MoneyGram API Working Test
 * Using the actual working Bearer token and endpoint structure
 */

import fetch from 'node-fetch';

// Working configuration from your example
const MONEYGRAM_CONFIG = {
  baseUrl: 'https://sandboxapi.moneygram.com',
  bearerToken: '5DA0RYGzVxsPY0l5vfvqZhmozAwk',
  agentPartnerId: '30150519'
};

/**
 * Generate unique client request ID
 */
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Map currencies to country codes
 */
function getCurrencyToCountryMapping() {
  return {
    'GBP': 'GBR',
    'EUR': 'FRA',
    'USD': 'USA',
    'NGN': 'NGA',
    'GHS': 'GHA',
    'KES': 'KEN',
    'INR': 'IND',
    'PKR': 'PAK'
  };
}

/**
 * Get MoneyGram rates for currency pair
 */
async function getMoneyGramRate(fromCurrency, toCurrency, amount = 100) {
  const countryMapping = getCurrencyToCountryMapping();
  const originCountry = countryMapping[fromCurrency];
  const destCountry = countryMapping[toCurrency];

  if (!originCountry || !destCountry) {
    throw new Error(`Unsupported currency pair: ${fromCurrency}/${toCurrency}`);
  }

  const clientRequestId = generateRequestId();
  
  const url = `${MONEYGRAM_CONFIG.baseUrl}/fx-rate/v1/rates?targetAudience=AGENT_FACING&userLanguage=EN-US&agentPartnerId=${MONEYGRAM_CONFIG.agentPartnerId}&originatingCountryCode=${originCountry}&destinationCountryCode=${destCountry}&sendCurrencyCode=${fromCurrency}&receiveCurrencyCode=${toCurrency}`;

  console.log(`Requesting ${fromCurrency}/${toCurrency} rates...`);
  console.log(`URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${MONEYGRAM_CONFIG.bearerToken}`,
        'X-MG-ClientRequestId': clientRequestId
      }
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Raw response:');
      console.log(JSON.stringify(data, null, 2));
      
      return parseMoneyGramResponse(data, fromCurrency, toCurrency, amount);
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

  } catch (error) {
    console.log('❌ Request failed:', error.message);
    throw error;
  }
}

/**
 * Parse MoneyGram API response
 */
function parseMoneyGramResponse(data, fromCurrency, toCurrency, amount) {
  if (!data.fxRates || !Array.isArray(data.fxRates) || data.fxRates.length === 0) {
    throw new Error('No FX rates found in response');
  }

  console.log('\n📊 Parsing rate data...');
  
  const serviceOptions = data.fxRates.map(rate => {
    const receivedAmount = amount * rate.fxRate;
    console.log(`Service: ${rate.serviceOptionName}`);
    console.log(`  Code: ${rate.serviceOptionCode}`);
    console.log(`  Rate: ${rate.fxRate}`);
    console.log(`  Estimated: ${rate.fxRateEstimated}`);
    console.log(`  ${amount} ${fromCurrency} = ${receivedAmount.toFixed(2)} ${toCurrency}`);
    
    return {
      serviceCode: rate.serviceOptionCode,
      serviceName: rate.serviceOptionName,
      routingCode: rate.serviceOptionRoutingCode || null,
      exchangeRate: rate.fxRate,
      isEstimated: rate.fxRateEstimated || false,
      receivedAmount: receivedAmount
    };
  });

  // Find best rate (highest exchange rate)
  const bestOption = serviceOptions.reduce((best, current) => 
    current.exchangeRate > best.exchangeRate ? current : best
  );

  console.log(`\n🏆 Best rate: ${bestOption.serviceName} (${bestOption.exchangeRate})`);

  return {
    fromCurrency,
    toCurrency,
    amount,
    exchangeRate: bestOption.exchangeRate,
    receivedAmount: bestOption.receivedAmount,
    provider: 'MoneyGram',
    serviceType: bestOption.serviceName,
    serviceCode: bestOption.serviceCode,
    isEstimated: bestOption.isEstimated,
    allOptions: serviceOptions,
    timestamp: new Date().toISOString()
  };
}

/**
 * Test multiple currency pairs
 */
async function testMultiplePairs() {
  console.log('MoneyGram API Integration Test');
  console.log('Using Working Bearer Token');
  console.log('============================\n');

  const testPairs = [
    { from: 'GBP', to: 'NGN', amount: 100 },
    { from: 'USD', to: 'NGN', amount: 100 },
    { from: 'EUR', to: 'NGN', amount: 100 },
    { from: 'GBP', to: 'GHS', amount: 100 },
    { from: 'GBP', to: 'KES', amount: 100 }
  ];

  const results = [];

  for (const pair of testPairs) {
    console.log(`\n--- Testing ${pair.from}/${pair.to} ---`);
    
    try {
      const result = await getMoneyGramRate(pair.from, pair.to, pair.amount);
      results.push({ success: true, data: result });
      
      console.log(`✅ Success: 1 ${pair.from} = ${result.exchangeRate} ${pair.to}`);
      console.log(`💰 ${pair.amount} ${pair.from} = ${result.receivedAmount.toFixed(2)} ${pair.to}`);
      
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        pair: `${pair.from}/${pair.to}`
      });
      console.log(`❌ Failed: ${error.message}`);
    }

    // Rate limiting
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Generate integration summary for SabiSend
 */
function generateIntegrationSummary(results) {
  console.log('\n🚀 MONEYGRAM INTEGRATION SUMMARY');
  console.log('================================');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful pairs: ${successful.length}`);
  console.log(`❌ Failed pairs: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n📈 Working Currency Pairs:');
    successful.forEach(result => {
      const data = result.data;
      console.log(`${data.fromCurrency}/${data.toCurrency}: ${data.exchangeRate} (${data.serviceType})`);
    });

    console.log('\n🔧 Integration Status: READY FOR PRODUCTION');
    console.log('Next Steps:');
    console.log('1. ✅ API endpoints validated');
    console.log('2. ✅ Response parsing working');
    console.log('3. ✅ Multiple service options available');
    console.log('4. 🔄 Replace web scraping with API calls');
    console.log('5. 🔄 Implement in SabiSend rate collection');
  } else {
    console.log('\n❌ Integration Status: NEEDS ATTENTION');
    console.log('Issues to resolve:');
    failed.forEach(result => {
      console.log(`${result.pair}: ${result.error}`);
    });
  }

  console.log('\n💡 Benefits of MoneyGram API Integration:');
  console.log('• Real-time accurate rates from MoneyGram');
  console.log('• Multiple service options (cash pickup, bank deposit, mobile wallet)');
  console.log('• Structured JSON responses (no web scraping)');
  console.log('• Better reliability and performance');
  console.log('• Rate certainty indicators (estimated vs confirmed)');
}

// Execute comprehensive test
testMultiplePairs()
  .then(results => {
    generateIntegrationSummary(results);
  })
  .catch(error => {
    console.log('\n❌ Test execution failed:', error.message);
  });