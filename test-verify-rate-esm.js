// Test script for our rate verification (ESM version)
import fetch from 'node-fetch';

async function testVerification() {
  try {
    const response = await fetch('http://localhost:5000/api/verify-rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        providerId: 7952,
        fromCurrency: 'GBP',
        toCurrency: 'NGN',
        verified: true
      })
    });
    
    const result = await response.json();
    console.log('Verification result:', result);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testVerification();