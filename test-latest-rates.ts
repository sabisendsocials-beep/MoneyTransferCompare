/**
 * Test the getLatestRates method to verify 168-hour filtering
 */
import { storage } from './server/storage';

async function testLatestRates() {
  try {
    console.log('Testing getLatestRates with 168-hour threshold...');
    
    const rates = await storage.getLatestRates('GBP', 'NGN');
    
    console.log(`Found ${rates.length} rates within 168-hour window:`);
    
    // Group rates by provider
    const providerMap = new Map();
    
    for (const rate of rates) {
      const hoursOld = (Date.now() - new Date(rate.timestamp).getTime()) / (1000 * 60 * 60);
      providerMap.set(rate.provider_id, {
        rate: rate.rate,
        hoursOld: hoursOld.toFixed(1),
        timestamp: rate.timestamp
      });
    }
    
    // Sort by hours old
    const sortedProviders = Array.from(providerMap.entries())
      .sort((a, b) => parseFloat(a[1].hoursOld) - parseFloat(b[1].hoursOld));
    
    sortedProviders.forEach(([providerId, data]) => {
      console.log(`- Provider ${providerId}: ${data.rate} (${data.hoursOld} hours old)`);
    });
    
    // Now test the comparison
    console.log('\n--- Testing compareTransferOptions ---');
    const results = await storage.compareTransferOptions({
      amount: 100,
      fromCurrency: 'GBP',
      toCurrency: 'NGN',
      type: 'send'
    });
    
    console.log(`Comparison returned ${results.length} providers:`);
    results.forEach(result => {
      console.log(`- ${result.providerName} (ID: ${result.providerId}): ${result.exchangeRate}`);
    });
    
  } catch (error) {
    console.error('Error testing rates:', error);
    throw error;
  }
}

testLatestRates()
  .then(() => {
    console.log('✓ Rate testing complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Rate testing failed:', error);
    process.exit(1);
  });