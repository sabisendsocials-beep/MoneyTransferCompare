/**
 * Test script to simulate the rate trends chart component
 * This script helps debug the chart component without running the full application
 */

// Simulated trend data for testing
const sampleTrendData = [
  {
    "date": "2025-04-16",
    "rate": 2114.3096,
    "from_currency": "GBP",
    "to_currency": "NGN"
  },
  {
    "date": "2025-04-17",
    "rate": 2099.0415,
    "from_currency": "GBP",
    "to_currency": "NGN"
  },
  {
    "date": "2025-04-18",
    "rate": 2099.4766,
    "from_currency": "GBP",
    "to_currency": "NGN"
  },
  {
    "date": "2025-04-19",
    "rate": 2086.776,
    "from_currency": "GBP",
    "to_currency": "NGN"
  },
  {
    "date": "2025-04-20", 
    "rate": 2075.091,
    "from_currency": "GBP",
    "to_currency": "NGN"
  },
  {
    "date": "2025-04-21",
    "rate": 2068.8799,
    "from_currency": "GBP",
    "to_currency": "NGN"
  },
  {
    "date": "2025-04-22",
    "rate": 2067.5232,
    "from_currency": "GBP",
    "to_currency": "NGN"
  },
  {
    "date": "2025-04-23",
    "rate": 2060.6067,
    "from_currency": "GBP",
    "to_currency": "NGN"
  }
];

// Simulate the component's date handling
function formatDateString(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });
}

// Test sorting function to ensure chronological ordering
function sortTrendData(data) {
  return [...data].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

// Log the original data format
console.log('Original data:');
console.log('First point:', sampleTrendData[0]);
console.log('Total points:', sampleTrendData.length);
console.log('Dates:', sampleTrendData.map(d => d.date).join(', '));

// Log the sorted data
const sortedData = sortTrendData(sampleTrendData);
console.log('\nSorted data:');
console.log('First point:', sortedData[0]);
console.log('Total points:', sortedData.length);
console.log('Dates:', sortedData.map(d => d.date).join(', '));

// Check date formatting for chart display
console.log('\nFormatted dates for chart:');
console.log(sortedData.map(d => formatDateString(d.date)));

// Print full data series in chart-ready format
console.log('\nData series for chart:');
console.log(JSON.stringify(sortedData, null, 2));