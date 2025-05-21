/**
 * Test script for ACE Money Transfer direct scraper
 * This script tests the pure direct implementation with no fallbacks or hard-coded values
 */
import { storage } from './server/storage';
import { scrapeAceMoneyTransfer } from './server/scrapers/aceMoneyTransferDirectScraper';

async function testAceDirectScraper() {
  try {
    console.log('=== TESTING ACE MONEY TRANSFER DIRECT SCRAPER ===');
    console.log('This uses ONLY direct scraping with no fallbacks or hard-coded values');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      console.error("❌ ACE Money Transfer provider not found in database");
      return;
    }
    
    console.log(`Found ACE Money Transfer provider with ID: ${aceProvider.id}`);
    
    // Get or set the scraping URL
    const scrapeUrl = aceProvider.scraping_url || 'https://acemoneytransfer.com/united-kingdom/nigeria';
    
    // Run the direct implementation
    console.log('Running direct scraper with the CSS selector from the screenshot...');
    console.log(`Provider URL: ${scrapeUrl}`);
    console.log('CSS Selector: span.color-000.lt-61C');
    
    const success = await scrapeAceMoneyTransfer(
      scrapeUrl,
      'span.color-000.lt-61C',
      aceProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      console.log("✅ ACE Money Transfer rate successfully added using direct scraping");
      
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
      console.error("❌ ACE Money Transfer rate could not be directly scraped from the website");
      console.log("No fallback rate was used - direct scraping only as requested");
      console.log("Scraping failed - no rate will be recorded as required by policy");
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