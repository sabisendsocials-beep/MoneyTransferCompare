/**
 * Test script for ACE Money Transfer direct implementation
 * This script tests the direct implementation that extracts rates from the screenshot
 * with NO fallbacks whatsoever
 */
import { storage } from './server/storage';
import { scrapeAceMoneyTransferDirect } from './server/scrapers/aceMoneyTransferDirectImplementation';

async function testAceDirectImplementation() {
  try {
    console.log('=== TESTING ACE MONEY TRANSFER DIRECT IMPLEMENTATION ===');
    console.log('This uses ONLY the exact rate from the screenshot with no fallbacks');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      console.error("❌ ACE Money Transfer provider not found in database");
      return;
    }
    
    console.log(`Found ACE Money Transfer provider with ID: ${aceProvider.id}`);
    
    // Run the direct implementation
    console.log('Running direct implementation...');
    const success = await scrapeAceMoneyTransferDirect(
      aceProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      console.log("✅ ACE Money Transfer rate successfully added using direct implementation");
      
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
      console.error("❌ ACE Money Transfer rate could not be added");
    }
  } catch (error) {
    console.error("Error in test script:", error);
  }
}

// Run the test
testAceDirectImplementation()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed with error:', err))
  .finally(() => process.exit(0));