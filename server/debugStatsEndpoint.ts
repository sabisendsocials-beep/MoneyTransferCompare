/**
 * Script to test the rate-stats endpoint functionality
 */
import { storage } from './storage';
import { RateStats } from '@shared/schema';

async function testRateStats() {
  try {
    console.log('Testing rate stats endpoint functionality...');
    
    // Test pairs
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'EUR', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'GHS' }
    ];
    
    // Test each pair
    for (const pair of currencyPairs) {
      console.log(`\nTesting stats for ${pair.from} to ${pair.to}...`);
      
      try {
        const stats: RateStats = await storage.getRateStats(pair.from, pair.to);
        console.log('Results:');
        console.log('  30-day high:', stats.thirtyDayHigh);
        console.log('  30-day high date:', stats.thirtyDayHighDate);
        console.log('  30-day low:', stats.thirtyDayLow);
        console.log('  30-day low date:', stats.thirtyDayLowDate);
        console.log('  30-day average:', stats.thirtyDayAverage);
        console.log('  1-month change:', stats.oneMonthChange, '%');
        console.log('  3-month change:', stats.threeMonthChange, '%');
        console.log('  1-year change:', stats.oneYearChange, '%');
        console.log('  Last updated:', stats.lastUpdated);
      } catch (error) {
        console.error(`Error fetching stats for ${pair.from}-${pair.to}:`, error);
      }
    }
    
    console.log('\nStats testing complete');
    return true;
  } catch (error) {
    console.error('Error during stats testing:', error);
    return false;
  }
}

// Run the test
testRateStats()
  .then(success => {
    console.log(success ? '\nTest completed successfully' : '\nTest failed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
  });