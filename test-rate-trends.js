/**
 * Simple script to test the rate-trends API endpoint directly
 * This helps debug issues with the trend chart display
 */

const fetchRateTrends = async (fromCurrency = 'GBP', toCurrency = 'NGN', days = 30) => {
  try {
    console.log(`Fetching ${days}-day rate trends for ${fromCurrency}/${toCurrency}...`);
    const response = await fetch(`http://localhost:5000/api/rate-trends?from=${fromCurrency}&to=${toCurrency}&days=${days}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`Received ${data.length} data points for ${fromCurrency}/${toCurrency}`);
    
    if (data.length > 0) {
      console.log('First point:', data[0]);
      console.log('Last point:', data[data.length - 1]);
      
      // Check if data is sorted
      const isSorted = checkSorting(data);
      console.log(`Data is ${isSorted ? 'properly sorted' : 'NOT sorted'} by date`);
      
      // Analyze data patterns
      analyzeDataPoints(data);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching rate trends:', error);
    return null;
  }
};

// Check if data is sorted by date
function checkSorting(data) {
  for (let i = 1; i < data.length; i++) {
    const prevDate = new Date(data[i-1].date);
    const currDate = new Date(data[i].date);
    if (prevDate > currDate) {
      console.error(`Out of order dates: ${data[i-1].date} comes before ${data[i].date}`);
      return false;
    }
  }
  return true;
}

// Analyze data points for gaps or inconsistencies
function analyzeDataPoints(data) {
  // Check for date gaps
  const dateGaps = [];
  
  for (let i = 1; i < data.length; i++) {
    const prevDate = new Date(data[i-1].date);
    const currDate = new Date(data[i].date);
    
    // Calculate days between dates
    const timeDiff = currDate.getTime() - prevDate.getTime();
    const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));
    
    if (dayDiff > 1) {
      dateGaps.push(`Gap of ${dayDiff} days between ${data[i-1].date} and ${data[i].date}`);
    }
  }
  
  if (dateGaps.length > 0) {
    console.log(`Found ${dateGaps.length} gaps in the data:`);
    dateGaps.forEach(gap => console.log(`- ${gap}`));
  } else {
    console.log('No gaps found in the data points');
  }
  
  // Check for unusual rate changes
  let bigChanges = 0;
  for (let i = 1; i < data.length; i++) {
    const prevRate = data[i-1].rate;
    const currRate = data[i].rate;
    
    const percentChange = Math.abs((currRate - prevRate) / prevRate * 100);
    
    if (percentChange > 3) {
      console.log(`Large rate change (${percentChange.toFixed(2)}%) on ${data[i].date}: ${prevRate.toFixed(2)} → ${currRate.toFixed(2)}`);
      bigChanges++;
    }
  }
  
  if (bigChanges === 0) {
    console.log('No unusual rate changes detected');
  }
  
  // Print summary statistics
  const rates = data.map(d => d.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const avg = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  
  console.log('\nRate Summary:');
  console.log(`- Minimum: ${min.toFixed(2)}`);
  console.log(`- Maximum: ${max.toFixed(2)}`);
  console.log(`- Average: ${avg.toFixed(2)}`);
  console.log(`- Range: ${(max-min).toFixed(2)} (${((max-min)/min*100).toFixed(2)}% of minimum)`);
}

// Test all currency pairs
const testAllPairs = async () => {
  const pairs = [
    { from: 'GBP', to: 'NGN' },
    { from: 'EUR', to: 'NGN' },
    { from: 'GBP', to: 'GHS' },
    { from: 'EUR', to: 'GHS' }
  ];
  
  console.log('Testing Rate Trends API for all currency pairs:');
  
  for (const pair of pairs) {
    console.log(`\n=== Testing ${pair.from} to ${pair.to} ===`);
    const data = await fetchRateTrends(pair.from, pair.to);
    
    if (data && data.length > 0) {
      console.log(`Successfully retrieved ${data.length} points for ${pair.from} to ${pair.to}`);
    } else {
      console.error(`Failed to retrieve data for ${pair.from} to ${pair.to}`);
    }
  }
  
  console.log('\nTesting complete');
};

// Run the tests
testAllPairs();