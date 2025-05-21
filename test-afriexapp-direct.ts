/**
 * Test script for Afriexapp direct scraper
 * This script tests the direct implementation with the CSS selector from the HTML
 * with NO fallbacks whatsoever
 */
import { storage } from './server/storage';
import { scrapeAfriexappDirect } from './server/scrapers/afriexappDirectScraper';

async function testAfriexappDirectScraper() {
  try {
    console.log('=== TESTING AFRIEXAPP DIRECT SCRAPER ===');
    console.log('This uses ONLY direct scraping with no fallbacks');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const afriexappProvider = providers.find(p => p.name === 'Afriexapp');
    
    if (!afriexappProvider) {
      console.error("❌ Afriexapp provider not found in database");
      return;
    }
    
    console.log(`Found Afriexapp provider with ID: ${afriexappProvider.id}`);
    
    // Get or set the scraping URL
    const scrapeUrl = afriexappProvider.scraping_url || 'https://afriexapp.com';
    
    // Run the direct implementation
    console.log('Running direct scraper with the CSS selector from the HTML...');
    console.log(`Provider URL: ${scrapeUrl}`);
    console.log('CSS Selector: div#converter-exchange-rate.converter-information__text-stm');
    
    const success = await scrapeAfriexappDirect(
      scrapeUrl,
      'div#converter-exchange-rate.converter-information__text-stm',
      afriexappProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      console.log("✅ Afriexapp rate successfully added using direct scraping");
      
      // Fetch the latest rate to verify
      const rates = await storage.getLatestRates('GBP', 'NGN');
      const afriexappRate = rates.find(r => r.provider_id === afriexappProvider.id);
      
      if (afriexappRate) {
        console.log(`Latest Afriexapp rate: 1 GBP = ${afriexappRate.rate} NGN`);
        console.log(`Rate added at: ${afriexappRate.created_at}`);
        console.log(`Rate source: ${afriexappRate.source}`);
      } else {
        console.log("⚠️ Rate was reportedly added but couldn't be found in database");
      }
    } else {
      console.error("❌ Afriexapp rate could not be directly scraped from the website");
      console.log("No fallback rate was used - direct scraping only as requested");
      console.log("Scraping failed - no rate will be recorded as required by policy");
    }
  } catch (error) {
    console.error("Error in test script:", error);
  }
}

// Run the test
testAfriexappDirectScraper()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed with error:', err))
  .finally(() => process.exit(0));