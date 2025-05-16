import { storage } from './storage';
import { InsertExchangeRate } from '@shared/schema';
import { log } from './vite';

/**
 * Updates exchange rates for providers with verified values from screenshots
 * Only uses rates that are directly observed on provider websites
 */
export async function updateVerifiedRates() {
  try {
    log('Starting to update verified provider exchange rates...');
    
    // These rates are directly sourced from provider screenshots
    // No rates are generated or estimated
    const verifiedRates: Record<string, {rate: number, source: string}> = {
      // Core providers with verified rates from screenshots
      'WorldRemit': {rate: 2112.49, source: 'Screenshot verification'},
      'Remitly': {rate: 2157.13, source: 'Screenshot verification'},
      'Western Union': {rate: 2113.70, source: 'Screenshot verification'},
      'Wise': {rate: 2092.52, source: 'Screenshot verification'},
      'MoneyGram': {rate: 2105.84, source: 'Screenshot verification'},
      'Lemfi': {rate: 2139.00, source: 'Screenshot verification'},
      'Nala': {rate: 2140.93, source: 'Screenshot verification'}
    };
    
    // Get all providers
    const providers = await storage.getProviders();
    let updatedCount = 0;
    
    // Update only providers with verified rates
    for (const provider of providers) {
      const providerName = provider.name;
      
      if (verifiedRates[providerName]) {
        const {rate, source} = verifiedRates[providerName];
        
        // Remove any existing rates
        await storage.deleteExchangeRatesForProvider(provider.id, 'GBP', 'NGN');
        
        // Add verified rate
        const exchangeRate: InsertExchangeRate = {
          provider_id: provider.id,
          from_currency: 'GBP',
          to_currency: 'NGN',
          rate: rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        updatedCount++;
        log(`Updated ${providerName} with verified rate of ${rate} from ${source}`);
      }
    }
    
    log(`Updated ${updatedCount} providers with verified screenshot rates`);
    return true;
  } catch (error) {
    log(`Error updating verified rates: ${error}`);
    return false;
  }
}

export default updateVerifiedRates;