import { scrapeExchangeRate, scrapeWorldRemitRate } from './scrapers/robustScraper';

/**
 * Test function to validate the robust scraper on multiple providers
 */
async function testRobustScraper() {
  console.log('=== TESTING ROBUST SCRAPER WITH MULTIPLE PROVIDERS ===');
  
  // Test providers with their URLs
  const providers = [
    {
      name: 'WorldRemit',
      url: 'https://www.worldremit.com/en/gbp-to-ngn-exchange-rate',
      from: 'GBP',
      to: 'NGN',
      scrapeFunction: scrapeWorldRemitRate
    },
    {
      name: 'Wise',
      url: 'https://wise.com/gb/currency-converter/gbp-to-ngn-rate',
      from: 'GBP',
      to: 'NGN',
      scrapeFunction: async () => scrapeExchangeRate('https://wise.com/gb/currency-converter/gbp-to-ngn-rate', 'GBP', 'NGN')
    }
  ];
  
  // Test each provider
  for (const provider of providers) {
    console.log(`\nTesting ${provider.name}...`);
    try {
      console.log(`Using specialized scraper for ${provider.name}`);
      const rate = await provider.scrapeFunction();
      
      if (rate !== null) {
        console.log(`✅ SUCCESS: Got ${provider.name} rate: ${rate} ${provider.to} per ${provider.from}`);
      } else {
        console.log(`❌ FAILED: Could not get ${provider.name} rate`);
      }
    } catch (error) {
      console.error(`Error testing ${provider.name}:`, error);
    }
  }
  
  console.log('\n=== ROBUST SCRAPER TESTING COMPLETE ===');
}

// Run tests
testRobustScraper().catch(console.error);