/**
 * Test script for ACE Money Transfer custom page direct approach
 *
 * This script tests our direct-only implementation with no fallbacks
 */
import { storage } from './server/storage';
import { getAceMoneyTransferRateDirectOnly } from './server/scrapers/aceMoneyTransferCustomPage';

async function testAceDirectScraper() {
  try {
    console.log('Testing ACE Money Transfer direct-only approach...');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      console.error("ACE Money Transfer provider not found in database");
      return;
    }
    
    console.log(`Found ACE Money Transfer provider with ID: ${aceProvider.id}`);
    
    // Run the direct scraper - NO FALLBACKS
    const success = await getAceMoneyTransferRateDirectOnly(
      aceProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      console.log("✅ ACE Money Transfer rate successfully updated using direct-only approach");
      
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
      console.error("❌ ACE Money Transfer rate could not be retrieved directly");
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