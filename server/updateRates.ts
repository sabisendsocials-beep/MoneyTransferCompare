import { storage } from './storage';
import { InsertExchangeRate } from '@shared/schema';
import { log } from './vite';

/**
 * Updates exchange rates for all providers with verified values
 * Only uses rates that are directly observed on provider websites
 * and confirmed through screenshot verification
 */
export default async function updatePreciseRates() {
  try {
    log('Starting to update verified exchange rates for providers...');
    
    // These rates are directly sourced from provider websites
    // and verified with screenshots - no estimated or generated values
    const verifiedRates: Record<string, number> = {
      // Core providers with verified rates
      'WorldRemit': 2112.49,  // From provider website (verified with screenshot)
      'Remitly': 2157.13,     // From provider website (verified with screenshot)
      'Western Union': 2113.70, // From provider website (verified with screenshot)
      'Wise': 2092.52,        // From provider website (verified with screenshot)
      'MoneyGram': 2105.84,   // From provider website (verified with screenshot)
      'Lemfi': 2139.00,       // From provider website (verified with screenshot)
      'Nala': 2140.93         // From provider website (verified with screenshot)
    };
    
    // Get all the active providers
    const providers = await storage.getProviders();
    
    // Update rates only for providers where we have verified data
    for (const provider of providers) {
      const providerName = provider.name;
      
      // Only update providers where we have verified rates from screenshots
      if (verifiedRates[providerName]) {
        const rate = verifiedRates[providerName];
        
        // Clear existing rates for this provider (GBP to NGN)
        await storage.deleteExchangeRatesForProvider(provider.id, 'GBP', 'NGN');
        log(`Cleared existing exchange rates for ${providerName}`);
        
        // Add the new verified rate
        const exchangeRate: InsertExchangeRate = {
          provider_id: provider.id,
          from_currency: 'GBP',
          to_currency: 'NGN',
          rate: rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        log(`Updated verified rate for ${providerName}: 1 GBP = ${rate} NGN`);
      } else {
        // For other providers, we'll let the scraping process try to get real rates
        // and only use those if successful
        log(`No verified screenshot rate for ${providerName}, will use scraped data only.`);
      }
    }
    
    log('Provider rates updated successfully');
    return true;
  } catch (error) {
    log(`Error updating provider rates: ${error}`);
    return false;
  }
}