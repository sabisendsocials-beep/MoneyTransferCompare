/**
 * Test script for ACE Money Transfer direct rate extraction
 * This script directly tests extracting rates from their website
 * with NO fallbacks whatsoever - pure direct scraping only
 */
import { storage } from './server/storage';
import { scrapeAceMoneyTransferWithPuppeteer } from './server/scrapers/aceMoneyTransferPuppeteerScraper';

async function testAceDirectScraper() {
  try {
    console.log('=== TESTING ACE MONEY TRANSFER DIRECT SCRAPER ===');
    console.log('This will ONLY use directly scraped values (no fallbacks)');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      console.error("❌ ACE Money Transfer provider not found in database");
      return;
    }
    
    console.log(`Found ACE Money Transfer provider with ID: ${aceProvider.id}`);
    
    // Run the direct scraper with Puppeteer (no fallbacks)
    console.log('Running direct scraper that only uses actual website values...');
    const success = await scrapeAceMoneyTransferWithPuppeteer(
      aceProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      console.log("✅ ACE Money Transfer rate successfully updated using direct scraping");
      
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