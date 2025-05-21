/**
 * Test script for ACE Money Transfer direct scraper
 *
 * This script tests the direct scraper with the CSS selector from the screenshot
 * without any fallback mechanisms
 */
import { storage } from './server/storage';
import { scrapeAceMoneyTransfer } from './server/scrapers/aceMoneyTransferDirectScraper';

async function testAceDirectScraper() {
  try {
    console.log('Testing ACE Money Transfer direct scraper...');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      console.error("ACE Money Transfer provider not found in database");
      return;
    }
    
    console.log(`Found ACE Money Transfer provider with ID: ${aceProvider.id}`);
    
    // Get the admin-configured URL
    const aceUrl = aceProvider.scraping_url;
    // Use the selector from the screenshot
    const aceSelector = 'span.color-000.lt-61C';
    
    if (!aceUrl) {
      console.error("ACE Money Transfer provider missing required URL in admin config");
      return;
    }
    
    console.log(`Using admin-configured URL for ACE Money Transfer: ${aceUrl}`);
    console.log(`Using CSS selector: ${aceSelector}`);
    
    // Run the scraper - DIRECT SCRAPING ONLY, NO FALLBACKS
    const success = await scrapeAceMoneyTransfer(
      aceUrl,
      aceSelector,
      aceProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      console.log("✅ ACE Money Transfer rate successfully updated using direct scraping only");
      
      // Fetch the latest rate to verify
      const rates = await storage.getLatestRates('GBP', 'NGN');
      const aceRate = rates.find(r => r.provider_id === aceProvider.id);
      
      if (aceRate) {
        console.log(`Latest ACE Money Transfer rate: 1 GBP = ${aceRate.rate} NGN`);
        console.log(`Rate added at: ${aceRate.created_at}`);
        console.log(`Rate source: ${aceRate.source}`);
      } else {
        console.log("⚠️ Rate was reportedly added but couldn't be found in database");
      }
    } else {
      console.error("❌ ACE Money Transfer rate could not be scraped from the website");
    }
  } catch (error) {
    console.error("Error in test script:", error);
  }
}

// Run the test
testAceDirectScraper()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed with error:', err))
  .finally(() => process.exit(0));