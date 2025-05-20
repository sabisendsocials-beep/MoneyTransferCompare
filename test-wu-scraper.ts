/**
 * Test script for Western Union scraper
 */
import { updateWesternUnionRateFromConfig } from './server/scrapers/westernUnionScraper';
import { getWesternUnionRateFromApi, updateWesternUnionRateViaApi } from './server/scrapers/westernUnionApiScraper';

async function testWesternUnionScraper() {
  console.log('========================================');
  console.log('TESTING WESTERN UNION SCRAPER');
  console.log('========================================');
  
  try {
    // First test the API approach
    console.log('\nTesting Western Union API extraction:');
    const providerId = 10004; // Adjust this to your Western Union provider ID
    const apiSuccess = await updateWesternUnionRateViaApi(providerId, 'GBP', 'NGN');
    console.log(`API extraction result: ${apiSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    // Then test the full scraper with fallbacks
    console.log('\nTesting full Western Union scraper with all fallback methods:');
    const fullSuccess = await updateWesternUnionRateFromConfig();
    console.log(`Full scraper result: ${fullSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    console.log('\nTest complete!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testWesternUnionScraper();