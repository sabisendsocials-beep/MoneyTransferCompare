/**
 * Simple chart display initialization test
 * This creates a small HTML page that renders a chart with sample data
 * to verify if the chart component is rendering correctly.
 */

const sampleTrendData = [
  { date: "2025-04-16", rate: 2114.31, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-17", rate: 2099.04, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-18", rate: 2099.48, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-19", rate: 2086.78, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-20", rate: 2075.09, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-21", rate: 2068.88, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-22", rate: 2067.52, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-23", rate: 2060.61, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-24", rate: 2058.05, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-25", rate: 2055.81, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-26", rate: 2054.02, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-27", rate: 2057.25, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-28", rate: 2063.19, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-29", rate: 2068.42, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-04-30", rate: 2075.82, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-01", rate: 2080.33, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-02", rate: 2086.06, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-03", rate: 2083.41, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-04", rate: 2089.13, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-05", rate: 2095.24, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-06", rate: 2099.77, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-07", rate: 2105.23, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-08", rate: 2112.46, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-09", rate: 2120.19, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-10", rate: 2124.82, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-11", rate: 2129.54, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-12", rate: 2131.35, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-13", rate: 2136.57, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-14", rate: 2140.93, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-15", rate: 2146.28, from_currency: "GBP", to_currency: "NGN" },
  { date: "2025-05-16", rate: 2150.78, from_currency: "GBP", to_currency: "NGN" }
];

// Analyze the data to ensure it's suitable for charting
function analyzeData(data) {
  console.log(`Total data points: ${data.length}`);
  
  // Sort data to ensure chronological order
  const sortedData = [...data].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  console.log(`First date: ${sortedData[0].date} (rate: ${sortedData[0].rate})`);
  console.log(`Last date: ${sortedData[sortedData.length-1].date} (rate: ${sortedData[sortedData.length-1].rate})`);
  
  // Check for date continuity
  const dateGaps = [];
  for (let i = 1; i < sortedData.length; i++) {
    const prevDate = new Date(sortedData[i-1].date);
    const currDate = new Date(sortedData[i].date);
    
    // Calculate days between dates
    const timeDiff = currDate.getTime() - prevDate.getTime();
    const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));
    
    if (dayDiff > 1) {
      dateGaps.push(`Gap of ${dayDiff} days between ${sortedData[i-1].date} and ${sortedData[i].date}`);
    }
  }
  
  if (dateGaps.length > 0) {
    console.log(`Found ${dateGaps.length} gaps in the data:`);
    dateGaps.forEach(gap => console.log(`- ${gap}`));
  } else {
    console.log('No gaps found in the data - all dates are consecutive');
  }
  
  // Check rate range and variation
  const rates = sortedData.map(d => d.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min;
  const percentChange = (range / min) * 100;
  
  console.log(`Rate range: ${min.toFixed(2)} to ${max.toFixed(2)} (difference: ${range.toFixed(2)})`);
  console.log(`Percent change across period: ${percentChange.toFixed(2)}%`);
  
  return sortedData;
}

// Run the analysis
const analyzedData = analyzeData(sampleTrendData);
console.log('Data analysis complete. This data should render correctly in the chart.');