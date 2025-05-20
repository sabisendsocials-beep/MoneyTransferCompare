/**
 * Main scraper integration file
 * Brings together all specialized scrapers and makes them available in one place
 */

import { log } from '../vite';
import { storage } from '../storage';
import { Provider, InsertExchangeRate } from '@shared/schema';
import { updateSendwaveRate } from './sendwaveScraper';
import { updateTapTapRate } from './taptapScraper';
import { updateWesternUnionRates } from './westernUnionScraper';
import { updateMoneyGramRate } from './moneygramScraper';
import { updateRemitlyRate } from './remitlyScraper';

/**
 * Updates exchange rates for additional providers using specialized scrapers
 */
export async function updateAdditionalProviders(): Promise<boolean> {
  try {
    log('Starting specialized scrapers for additional providers...');
    
    // Track successful updates
    let updateCount = 0;
    
    // Run Sendwave scraper
    log('Running specialized Sendwave scraper...');
    const sendwaveSuccess = await updateSendwaveRate();
    if (sendwaveSuccess) {
      log('Successfully updated Sendwave rate');
      updateCount++;
    } else {
      log('Sendwave scraper failed to find rate');
    }
    
    // Run TapTap Send scraper
    log('Running specialized TapTap Send scraper...');
    const taptapSuccess = await updateTapTapRate();
    if (taptapSuccess) {
      log('Successfully updated TapTap Send rate');
      updateCount++;
    } else {
      log('TapTap Send scraper failed to find rate');
    }
    
    // Run Western Union scraper
    log('Running specialized Western Union scraper...');
    const westernUnionSuccess = await updateWesternUnionRates();
    if (westernUnionSuccess) {
      log('Successfully updated Western Union rate');
      updateCount++;
    } else {
      log('Western Union scraper failed to find rate');
    }
    
    // Run MoneyGram scraper
    log('Running specialized MoneyGram scraper...');
    const moneyGramSuccess = await updateMoneyGramRate();
    if (moneyGramSuccess) {
      log('Successfully updated MoneyGram rate');
      updateCount++;
    } else {
      log('MoneyGram scraper failed to find rate');
    }
    
    // Run Remitly scraper
    log('Running specialized Remitly scraper...');
    const remitlySuccess = await updateRemitlyRate();
    if (remitlySuccess) {
      log('Successfully updated Remitly rate');
      updateCount++;
    } else {
      log('Remitly scraper failed to find rate');
    }
    
    // Add more specialized scrapers here
    
    log(`Updated ${updateCount} providers with specialized scrapers`);
    return updateCount > 0;
  } catch (error) {
    log(`Error in specialized scrapers: ${error}`);
    return false;
  }
}

/**
 * Updates exchange rate for a specific provider manually
 * This is useful when standard scrapers fail
 */
export async function updateProviderRate(
  providerName: string,
  rate: number,
  fromCurrency: string = 'GBP',
  toCurrency: string = 'NGN'
): Promise<boolean> {
  try {
    // Find the provider in the database
    const providers = await storage.getProviders();
    const provider = providers.find(p => p.name === providerName);
    
    if (!provider) {
      log(`Provider ${providerName} not found in database`);
      return false;
    }
    
    // Add the rate to database
    const rateData: InsertExchangeRate = {
      provider_id: provider.id,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate
    };
    
    await storage.createExchangeRate(rateData);
    log(`Added manual rate for ${providerName}: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
    return true;
  } catch (error) {
    log(`Error updating manual rate for ${providerName}: ${error}`);
    return false;
  }
}