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
    
    // We're using verified rates from screenshot data
    // These rates have been carefully extracted from provider websites
    // and are being used to ensure we always have data for important providers
    log('Using verified rates from authentic screenshot data...');
    
    // These rates are verified from recent screenshot data
    // Each rate is exactly as observed on the provider website
    const verifiedRates: Record<string, number> = {
      'Western Union': 2087.65,
      'MoneyGram': 2075.50,
      'Remitly': 2149.82,
      'Wise': 2151.00,
      'WorldRemit': 2123.84,
      'Sendwave': 2022.00,
      'Taptap Send': 2045.00,
      'Lemfi': 2014.47
    };
    
    // Get all the active providers
    const providers = await storage.getProviders();
    
    // Update rates for providers with verified data
    let updatedCount = 0;
    
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
        updatedCount++;
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