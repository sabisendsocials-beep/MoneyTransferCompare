/**
 * Test script for Remit Choice direct scraper
 * This script tests the direct implementation with the CSS selector from the HTML
 * with NO fallbacks whatsoever
 */
import { storage } from './server/storage';
import { scrapeRemitChoiceDirect } from './server/scrapers/remitChoiceDirectScraper';

async function testRemitChoiceDirectScraper() {
  try {
    console.log('=== TESTING REMIT CHOICE DIRECT SCRAPER ===');
    console.log('This uses ONLY direct scraping with no fallbacks');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const remitChoiceProvider = providers.find(p => p.name === 'Remit Choice');
    
    if (!remitChoiceProvider) {
      console.error("❌ Remit Choice provider not found in database");
      return;
    }
    
    console.log(`Found Remit Choice provider with ID: ${remitChoiceProvider.id}`);
    
    // Get or set the scraping URL
    const scrapeUrl = remitChoiceProvider.scraping_url || 'https://www.remitchoice.com';
    
    // Run the direct implementation
    console.log('Running direct scraper with the CSS selector from the HTML...');
    console.log(`Provider URL: ${scrapeUrl}`);
    console.log('CSS Selector: span.cnvt-subl-text');
    
    const success = await scrapeRemitChoiceDirect(
      scrapeUrl,
      'span.cnvt-subl-text',
      remitChoiceProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      console.log("✅ Remit Choice rate successfully added using direct scraping");
      
      // Fetch the latest rate to verify
      const rates = await storage.getLatestRates('GBP', 'NGN');
      const remitChoiceRate = rates.find(r => r.provider_id === remitChoiceProvider.id);
      
      if (remitChoiceRate) {
        console.log(`Latest Remit Choice rate: 1 GBP = ${remitChoiceRate.rate} NGN`);
        console.log(`Rate added at: ${remitChoiceRate.created_at}`);
        console.log(`Rate source: ${remitChoiceRate.source}`);
      } else {
        console.log("⚠️ Rate was reportedly added but couldn't be found in database");
      }
    } else {
      console.error("❌ Remit Choice rate could not be directly scraped from the website");
      console.log("No fallback rate was used - direct scraping only as requested");
      console.log("Scraping failed - no rate will be recorded as required by policy");
    }
  } catch (error) {
    console.error("Error in test script:", error);
  }
}

// Run the test
testRemitChoiceDirectScraper()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed with error:', err))
  .finally(() => process.exit(0));