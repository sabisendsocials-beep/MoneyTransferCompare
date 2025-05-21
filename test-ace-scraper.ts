/**
 * Test script for ACE Money Transfer scraper
 *
 * This script directly tests the scraper with the CSS selector from the screenshot
 */
import { testAceScraper } from './server/scrapers/aceIntegration';

// Run the test
console.log('⏳ Testing ACE Money Transfer scraper...');
testAceScraper()
  .then(success => {
    if (success) {
      console.log('✅ ACE Money Transfer rate successfully updated!');
    } else {
      console.log('❌ Failed to update ACE Money Transfer rate');
    }
  })
  .catch(error => {
    console.error('❌ Error running ACE Money Transfer scraper test:', error);
  });