/**
 * Simple script to test the rate-stats API endpoint directly
 */

const fetchRateStats = async (fromCurrency = 'GBP', toCurrency = 'NGN') => {
  try {
    const response = await fetch(`http://localhost:5000/api/rate-stats?from=${fromCurrency}&to=${toCurrency}`);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    console.log('Rate Stats API Response:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error fetching rate stats:', error);
    return null;
  }
};

// Test all currency pairs
const testAllPairs = async () => {
  const pairs = [
    { from: 'GBP', to: 'NGN' },
    { from: 'EUR', to: 'NGN' },
    { from: 'GBP', to: 'GHS' },
    { from: 'EUR', to: 'GHS' }
  ];
  
  console.log('Testing Rate Stats API for all currency pairs:');
  
  for (const pair of pairs) {
    console.log(`\nTesting ${pair.from} to ${pair.to}...`);
    await fetchRateStats(pair.from, pair.to);
  }
  
  console.log('\nTesting complete');
};

// Run the tests
testAllPairs();