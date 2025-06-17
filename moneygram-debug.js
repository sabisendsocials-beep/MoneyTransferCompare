/**
 * MoneyGram API Debug - Credential Analysis
 */

import fetch from 'node-fetch';

// Decode the Basic auth token to understand the credentials
function decodeBasicAuth(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [clientId, clientSecret] = decoded.split(':');
    return { clientId, clientSecret };
  } catch (error) {
    console.log('Error decoding token:', error.message);
    return null;
  }
}

// Test different authentication approaches
async function testAuthentication() {
  console.log('MoneyGram API Authentication Debug');
  console.log('=================================\n');

  const basicToken = 'bmliek5oNHR1bXk1ZmZMc3pIYjVPcUtSQVRtcVZLazI6dHZPS1h6eFg4RUNUM05VbQ';
  
  // Decode credentials
  console.log('Decoding provided credentials...');
  const credentials = decodeBasicAuth(basicToken);
  
  if (credentials) {
    console.log(`Client ID: ${credentials.clientId}`);
    console.log(`Client Secret: ${credentials.clientSecret}\n`);
  }

  // Test different endpoint variations
  const endpoints = [
    'https://sandboxapi.moneygram.com/oauth/accesstoken?grant_type=client_credentials',
    'https://sandboxapi.moneygram.com/oauth/token?grant_type=client_credentials',
    'https://sandboxapi.moneygram.com/v1/oauth/token',
    'https://sandboxapi.moneygram.com/auth/token'
  ];

  const methods = ['GET', 'POST'];
  
  for (const endpoint of endpoints) {
    console.log(`Testing endpoint: ${endpoint}`);
    
    for (const method of methods) {
      console.log(`  ${method} method:`);
      
      try {
        const options = {
          method: method,
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${basicToken}`,
            'Content-Type': 'application/json'
          }
        };

        // For POST, add body with credentials
        if (method === 'POST' && credentials) {
          if (endpoint.includes('oauth')) {
            // OAuth format
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.body = new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: credentials.clientId,
              client_secret: credentials.clientSecret
            }).toString();
          } else {
            // JSON format
            options.body = JSON.stringify({
              grant_type: 'client_credentials',
              client_id: credentials.clientId,
              client_secret: credentials.clientSecret
            });
          }
        }

        const response = await fetch(endpoint, options);
        console.log(`    Status: ${response.status} ${response.statusText}`);

        const responseText = await response.text();
        
        if (response.ok) {
          console.log('    ✅ SUCCESS!');
          try {
            const jsonData = JSON.parse(responseText);
            console.log('    Response:', JSON.stringify(jsonData, null, 2));
            return jsonData;
          } catch (e) {
            console.log('    Response (non-JSON):', responseText);
          }
        } else {
          console.log(`    Response: ${responseText.substring(0, 200)}`);
        }

      } catch (error) {
        console.log(`    Error: ${error.message}`);
      }
    }
    console.log();
  }

  // Test alternative credential formats
  console.log('Testing alternative authentication methods...\n');
  
  if (credentials) {
    await testAlternativeAuth(credentials);
  }

  return null;
}

async function testAlternativeAuth(credentials) {
  const endpoint = 'https://sandboxapi.moneygram.com/oauth/accesstoken';
  
  // Test with query parameters
  console.log('Testing with query parameters...');
  const queryUrl = `${endpoint}?grant_type=client_credentials&client_id=${credentials.clientId}&client_secret=${credentials.clientSecret}`;
  
  try {
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Query params: ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ Query params SUCCESS!');
      console.log('Response:', responseText);
      return JSON.parse(responseText);
    } else {
      console.log('Response:', responseText.substring(0, 200));
    }
  } catch (error) {
    console.log('Query params error:', error.message);
  }

  // Test with different headers
  console.log('\nTesting with different header formats...');
  
  const headerVariations = [
    { 'X-API-Key': credentials.clientId, 'X-API-Secret': credentials.clientSecret },
    { 'Client-ID': credentials.clientId, 'Client-Secret': credentials.clientSecret },
    { 'Authorization': `Bearer ${credentials.clientId}:${credentials.clientSecret}` }
  ];

  for (const headers of headerVariations) {
    try {
      const response = await fetch(endpoint + '?grant_type=client_credentials', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...headers
        }
      });

      const headerName = Object.keys(headers)[0];
      console.log(`${headerName}: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('✅ Alternative auth SUCCESS!');
        console.log('Response:', responseText);
        return JSON.parse(responseText);
      }

    } catch (error) {
      console.log(`Header variation error: ${error.message}`);
    }
  }
}

// Main execution
testAuthentication().then(result => {
  if (result) {
    console.log('\n🎉 Successfully authenticated with MoneyGram API!');
    console.log('Access token:', result.access_token || result.token || 'Found in response');
  } else {
    console.log('\n❌ Authentication failed with all methods');
    console.log('\nPossible issues:');
    console.log('1. Credentials might be for production, not sandbox');
    console.log('2. Different authentication flow required');
    console.log('3. Additional registration steps needed');
    console.log('4. API endpoint URL might be different');
  }
}).catch(console.error);