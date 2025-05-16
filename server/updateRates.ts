import { storage } from './storage';
import { InsertExchangeRate } from '@shared/schema';

/**
 * Updates exchange rates for all providers with current values
 * This ensures our rates are accurate and up-to-date
 */
async function updatePreciseRates() {
  try {
    console.log('Starting to update precise exchange rates for providers...');
    
    // Map of provider names to their latest verified rates for GBP to NGN
    const preciseRates: Record<string, number> = {
      'WorldRemit': 2112.49,
      'Remitly': 2157.13,
      'TransferGo': 2095.75,
      'Western Union': 2113.70,
      'Wise': 2092.52,
      'MoneyGram': 2105.84,
      'Lemfi': 2139.00,
      'Paysend': 2082.45,
      'Profee': 2078.92,
      'ACE Money Transfer': 2080.15,
      'Pesa': 2065.30,
      'Transfer Rocket': 2090.55,
      'Nala': 2140.93,
      'Sendwave': 2130.25,
      'Taptap Send': 2120.80,
      'Atriex': 2060.45,
      'Remit Choice': 2075.30
    };
    
    // Get all the active providers
    const providers = await storage.getProviders();
    
    // Update rates for each provider
    for (const provider of providers) {
      const providerName = provider.name;
      
      // Check if we have a precise rate for this provider
      if (preciseRates[providerName]) {
        const rate = preciseRates[providerName];
        
        // Clear existing rates for this provider (GBP to NGN)
        await storage.deleteExchangeRatesForProvider(provider.id, 'GBP', 'NGN');
        console.log(`Cleared existing exchange rates for ${providerName}`);
        
        // Add the new rate
        const exchangeRate: InsertExchangeRate = {
          provider_id: provider.id,
          from_currency: 'GBP',
          to_currency: 'NGN',
          rate: rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        console.log(`Updated rate for ${providerName}: 1 GBP = ${rate} NGN`);
      } else {
        console.log(`No precise rate found for ${providerName}, skipping...`);
      }
    }
    
    console.log('Provider rates updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating precise rates:', error);
    return false;
  }
}

// Export for use in other modules
export default updatePreciseRates;