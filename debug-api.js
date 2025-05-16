/**
 * Simple script to debug the rate-trends API response
 */

const fetchRateTrends = async () => {
  try {
    console.log('Fetching rate trends from API...');
    const response = await fetch('http://localhost:5000/api/rate-trends?from=GBP&to=NGN&days=30');
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    console.log('API Response:');
    console.log('Number of data points:', data.length);
    console.log('First 3 data points:', data.slice(0, 3));
    console.log('Last 3 data points:', data.slice(-3));
    return data;
  } catch (error) {
    console.error('Error fetching rate trends:', error);
    return null;
  }
};

fetchRateTrends();