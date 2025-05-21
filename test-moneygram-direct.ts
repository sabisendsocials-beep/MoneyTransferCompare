/**
 * Test script for MoneyGram direct scraper
 * This script tests the direct implementation with the CSS selector from the HTML
 * with NO fallbacks whatsoever
 */
import { storage } from './server/storage';
import { scrapeMoneygramDirect } from './server/scrapers/moneygramDirectScraper';

async function testMoneygramDirectScraper() {
  try {
    console.log('=== TESTING MONEYGRAM DIRECT SCRAPER ===');
    console.log('This uses ONLY direct scraping with no fallbacks');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const moneygramProvider = providers.find(p => p.name === 'MoneyGram');
    
    if (!moneygramProvider) {
      console.error("❌ MoneyGram provider not found in database");
      return;
    }
    
    console.log(`Found MoneyGram provider with ID: ${moneygramProvider.id}`);
    
    // Get or set the scraping URL
    const scrapeUrl = moneygramProvider.scraping_url || 'https://www.moneygram.com/mgo/gb/en/send-money-to-nigeria';
    
    // Run the direct implementation
    console.log('Running direct scraper with the CSS selector from the HTML...');
    console.log(`Provider URL: ${scrapeUrl}`);
    console.log('CSS Selector: span.break-words.hyphens-manual.text-mgSuccess-500.leading-4.font-regular');
    
    const success = await scrapeMoneygramDirect(
      scrapeUrl,
      'span.break-words.hyphens-manual.text-mgSuccess-500.leading-4.font-regular',
      moneygramProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      console.log("✅ MoneyGram rate successfully added using direct scraping");
      
      // Fetch the latest rate to verify
      const rates = await storage.getLatestRates('GBP', 'NGN');
      const moneygramRate = rates.find(r => r.provider_id === moneygramProvider.id);
      
      if (moneygramRate) {
        console.log(`Latest MoneyGram rate: 1 GBP = ${moneygramRate.rate} NGN`);
        console.log(`Rate added at: ${moneygramRate.created_at}`);
        console.log(`Rate source: ${moneygramRate.source}`);
      } else {
        console.log("⚠️ Rate was reportedly added but couldn't be found in database");
      }
    } else {
      console.error("❌ MoneyGram rate could not be directly scraped from the website");
      console.log("No fallback rate was used - direct scraping only as requested");
      console.log("Scraping failed - no rate will be recorded as required by policy");
    }
  } catch (error) {
    console.error("Error in test script:", error);
  }
}

// Run the test
testMoneygramDirectScraper()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed with error:', err))
  .finally(() => process.exit(0));