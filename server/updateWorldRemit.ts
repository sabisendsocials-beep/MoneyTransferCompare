/**
 * This is a standalone script to update the WorldRemit exchange rate
 * with the correct value observed in the screenshot.
 */

import { storage } from './storage';
import type { InsertExchangeRate } from '@shared/schema';

async function updateWorldRemitRate() {
  try {
    console.log('Manually updating WorldRemit rate from screenshot data...');
    
    // Find the WorldRemit provider in database
    const providers = await storage.getProviders();
    const worldRemit = providers.find(p => p.name === 'WorldRemit');
    
    if (!worldRemit) {
      console.error('WorldRemit provider not found in storage');
      return false;
    }
    
    // Calculate rate from screenshot data
    const sendAmount = 100; // GBP (from screenshot)
    const receiveAmount = 211288; // NGN (from screenshot)
    const rate = receiveAmount / sendAmount; // This gives us 2112.88
    
    console.log(`Setting WorldRemit rate to ${rate} based on verified screenshot data`);
    
    // Delete existing rates for this provider/currency pair to ensure fresh data
    try {
      await storage.deleteExchangeRatesForProvider(worldRemit.id, 'GBP', 'NGN');
      console.log('Deleted old WorldRemit rates');
    } catch (error) {
      console.warn('Could not delete old rates, continuing with update');
    }
    
    // Create the new exchange rate
    const rateData: InsertExchangeRate = {
      provider_id: worldRemit.id,
      from_currency: 'GBP',
      to_currency: 'NGN',
      rate: rate
    };
    
    // Save to database
    const newRate = await storage.createExchangeRate(rateData);
    
    console.log(`Successfully added WorldRemit rate: ${rate} NGN per GBP`);
    console.log(`Saved with ID: ${newRate.id}, timestamp: ${newRate.timestamp}`);
    
    // Fetch and display the most recent rate to verify
    const latestRates = await storage.getLatestRates('GBP', 'NGN');
    const worldRemitRate = latestRates.find(r => r.provider_id === worldRemit.id);
    
    if (worldRemitRate) {
      console.log('Latest WorldRemit rate in database:');
      console.log(`- Rate: ${worldRemitRate.rate} NGN per GBP`);
      console.log(`- Last updated: ${worldRemitRate.timestamp}`);
    } else {
      console.log('Could not find WorldRemit rate in latest rates');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating WorldRemit rate:', error);
    return false;
  }
}

// Run the function immediately
updateWorldRemitRate()
  .then(success => {
    if (success) {
      console.log('WorldRemit rate update completed successfully');
    } else {
      console.error('WorldRemit rate update failed');
    }
  })
  .catch(error => {
    console.error('Unhandled error during rate update:', error);
  });