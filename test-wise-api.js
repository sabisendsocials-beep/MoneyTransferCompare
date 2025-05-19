/**
 * Test script to verify the Wise API integration
 */

import axios from 'axios';

async function testWiseApi() {
  try {
    console.log('Testing Wise API integration...');
    
    const apiKey = process.env.WISE_API_KEY;
    
    if (!apiKey) {
      console.error('WISE_API_KEY environment variable not found!');
      return;
    }
    
    console.log(`Using API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
    
    // Test currency pair
    const sourceCurrency = 'GBP';
    const targetCurrency = 'NGN';
    
    console.log(`Fetching exchange rate for ${sourceCurrency} to ${targetCurrency}...`);
    
    const response = await axios.get(
      'https://api.wise.com/v1/rates', {
        params: {
          source: sourceCurrency,
          target: targetCurrency
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', JSON.stringify(response.headers, null, 2));
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const latestRate = response.data[0];
      console.log('Successfully retrieved rate:', latestRate);
      console.log(`Current exchange rate: 1 ${sourceCurrency} = ${latestRate.rate} ${targetCurrency}`);
    } else {
      console.log('No rate data returned. Response:', response.data);
    }
  } catch (error) {
    console.error('Error testing Wise API:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      console.error(`Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from API');
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testWiseApi();