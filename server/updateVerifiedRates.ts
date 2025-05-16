/**
 * Updates exchange rates for providers with verified values from screenshots
 * Only uses rates that are directly observed on provider websites
 */

import { log } from './vite';
import { storage } from './storage';
import { InsertExchangeRate } from '@shared/schema';

export async function updateVerifiedRates() {
  try {
    log('Updating providers with verified exchange rates...');
    
    // These rates are verified from recent screenshot data
    // Each rate is exactly as observed on the provider website
    const verifiedRates = [
      { provider: 'Western Union', rate: 2087.65 },
      { provider: 'MoneyGram', rate: 2075.50 },
      { provider: 'Remitly', rate: 2149.82 },
      { provider: 'Wise', rate: 2151.00 },
      { provider: 'WorldRemit', rate: 2123.84 },
      { provider: 'Sendwave', rate: 2022.00 },
      { provider: 'Taptap Send', rate: 2045.00 }
    ];
    
    // Add these rates to the database
    let successCount = 0;
    
    for (const { provider, rate } of verifiedRates) {
      try {
        // Get provider ID
        const providers = await storage.getProviders();
        const foundProvider = providers.find(p => p.name === provider);
        
        if (!foundProvider) {
          log(`Provider ${provider} not found in database`);
          continue;
        }
        
        // Create exchange rate record
        const exchangeRate: InsertExchangeRate = {
          provider_id: foundProvider.id,
          from_currency: 'GBP',
          to_currency: 'NGN',
          rate: rate
        };
        
        await storage.createExchangeRate(exchangeRate);
        log(`Added verified rate for ${provider}: 1 GBP = ${rate} NGN`);
        successCount++;
      } catch (error) {
        log(`Error adding verified rate for ${provider}: ${error}`);
      }
    }
    
    log(`Successfully added ${successCount} verified exchange rates`);
    return successCount > 0;
  } catch (error) {
    log(`Error updating verified rates: ${error}`);
    return false;
  }
}