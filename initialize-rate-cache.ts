/**
 * Initialize rate freshness cache to use database setting
 */
import { getMaxRateAgeHours } from './server/utils/rateFilter';

async function initializeRateCache() {
  console.log('Initializing rate freshness cache...');
  
  try {
    const maxAgeHours = await getMaxRateAgeHours();
    console.log(`Rate freshness threshold loaded: ${maxAgeHours} hours (${maxAgeHours / 24} days)`);
    
    // Test the cache by calling it again
    const cachedValue = await getMaxRateAgeHours();
    console.log(`Cached value confirmed: ${cachedValue} hours`);
    
    console.log('✓ Rate freshness cache initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize rate freshness cache:', error);
    throw error;
  }
}

initializeRateCache()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });