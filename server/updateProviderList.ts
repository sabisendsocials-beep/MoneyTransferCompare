import { storage } from './storage';
import { additionalProviders } from './scrapers/additionalProviders';
import { InsertProvider } from '@shared/schema';

/**
 * Updates the provider list in the database based on the latest requirements
 * This script ensures our database has all providers as specified in the list
 */
async function updateProviderList() {
  try {
    console.log('Starting provider update process...');
    
    // First, clear existing providers to avoid duplicates
    await storage.deleteAllProviders();
    console.log('Cleared existing providers');
    
    // Add our core providers first - these are the ones that we have special scrapers for
    const coreProviders: InsertProvider[] = [
      {
        name: "WorldRemit",
        website_url: "https://www.worldremit.com",
        logo: "https://www.worldremit.com/favicon.ico",
        rating: 4.5,
        scraping_url: "https://www.worldremit.com/en/gbp-to-ngn-exchange-rate",
        scraping_selector: ".exchange-rate, .rate-value",
        transfer_time: "1 hour or less",
        has_fixed_fee: true,
        fixed_fee: 2.99,
        percentage_fee: 0.8,
        active: true
      },
      {
        name: "Remitly",
        website_url: "https://www.remitly.com",
        logo: "https://www.remitly.com/static/img/logo.svg",
        rating: 4.5,
        scraping_url: "https://www.remitly.com/gb/en/nigeria/pricing",
        scraping_selector: ".exchange-rate, .rate-display",
        transfer_time: "3-5 days (Economy), Minutes (Express)",
        has_fixed_fee: true,
        fixed_fee: 2.49,
        percentage_fee: 0.75,
        active: true
      },
      {
        name: "TransferGo",
        website_url: "https://www.transfergo.com",
        logo: null,
        rating: 4.7,
        scraping_url: "https://www.transfergo.com/en",
        scraping_selector: ".exchange-rate, .converter__rate",
        transfer_time: "0-2 business days",
        has_fixed_fee: true,
        fixed_fee: 0.99,
        percentage_fee: 0.5,
        active: true
      },
      {
        name: "Western Union",
        website_url: "https://www.westernunion.com",
        logo: "https://www.westernunion.com/content/dam/wu/logo/logo.svg",
        rating: 4.2,
        scraping_url: "https://www.westernunion.com/gb/en/currency-converter/gbp-to-ngn-rate.html",
        scraping_selector: ".exchange-rate, .wu-calc-rate",
        transfer_time: "0-2 days",
        has_fixed_fee: true,
        fixed_fee: 2.99,
        percentage_fee: 0.8,
        active: true
      },
      {
        name: "Wise",
        website_url: "https://wise.com",
        logo: "https://wise.com/public-resources/assets/logos/wise.svg",
        rating: 4.8,
        scraping_url: "https://wise.com/gb/currency-converter/gbp-to-ngn-rate",
        scraping_selector: ".cc__source-to-target, .rate-value",
        transfer_time: "1-2 hours",
        has_fixed_fee: true,
        fixed_fee: 3.56,
        percentage_fee: 0.52,
        has_api: true,
        api_url: "https://api.wise.com/v1/rates",
        api_key_required: true,
        api_response_path: "rate",
        preferred_collection: "API",
        active: true
      },
      {
        name: "MoneyGram",
        website_url: "https://www.moneygram.com",
        logo: "https://www.moneygram.com/mgo/assets/images/mg-logo.svg",
        rating: 4.0,
        scraping_url: "https://www.moneygram.com/mgo/gb/en/exchange-rate-calculator",
        scraping_selector: ".exchange-rate-value, .calc-rate",
        transfer_time: "Minutes (cash pickup)",
        has_fixed_fee: true,
        fixed_fee: 2.99,
        percentage_fee: 1.2,
        active: true
      },
      {
        name: "Lemfi",
        website_url: "https://lemfi.com",
        logo: null,
        rating: 4.7,
        scraping_url: "https://lemfi.com/en-gb/send-money-to-nigeria",
        scraping_selector: "span:contains('Rate:'), .exchange-rate",
        transfer_time: "5 minutes",
        has_fixed_fee: false,
        fixed_fee: 0,
        percentage_fee: 0.6,
        active: true
      }
    ];
    
    // Add core providers
    for (const provider of coreProviders) {
      try {
        await storage.createProvider(provider);
        console.log(`Added core provider: ${provider.name}`);
      } catch (error) {
        console.error(`Failed to add provider ${provider.name}:`, error);
      }
    }
    
    // Add additional providers
    for (const provider of additionalProviders) {
      try {
        // Make sure we have all required fields for the database
        const completeProvider: InsertProvider = {
          name: provider.name || '',
          website_url: provider.website_url || '',
          logo: provider.logo || null,
          rating: provider.rating || 4.0,
          scraping_url: provider.scraping_url || '',
          scraping_selector: provider.scraping_selector || '',
          transfer_time: provider.transfer_time || '',
          has_fixed_fee: typeof provider.fixed_fee === 'number' && provider.fixed_fee > 0,
          fixed_fee: typeof provider.fixed_fee === 'number' ? provider.fixed_fee : 0,
          percentage_fee: provider.percentage_fee || 0,
          has_api: provider.has_api || false,
          api_url: provider.api_url || null,
          api_key_required: provider.api_key_required || false,
          api_response_path: provider.api_response_path || null,
          preferred_collection: provider.preferred_collection || 'SCRAPER',
          active: provider.active !== undefined ? provider.active : true
        };
        
        await storage.createProvider(completeProvider);
        console.log(`Added provider: ${provider.name}`);
      } catch (error) {
        console.error(`Failed to add provider ${provider.name}:`, error);
      }
    }
    
    console.log('Provider update process complete');
    return true;
  } catch (error) {
    console.error('Error updating provider list:', error);
    return false;
  }
}

// ESM doesn't have direct require.main === module equivalent
// Instead, we'll export the function for use in other modules

export default updateProviderList;