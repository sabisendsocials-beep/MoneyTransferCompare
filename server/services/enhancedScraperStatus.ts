/**
 * Enhanced Scraper Status Service
 * 
 * This service improves scraper status tracking by:
 * 1. Checking the latest exchange rates to determine each scraper's true status
 * 2. Providing accurate information about the last successful run
 * 3. Showing the actual rates retrieved by each scraper
 */

import { storage } from '../storage';
import { recordScraperRun } from './scraperStatus';
import { getMaxRateAgeHoursSync } from '../utils/rateFilter';

// Get maximum age for rates to be considered current
function getMaxRateAgeMs(): number {
  return getMaxRateAgeHoursSync() * 60 * 60 * 1000;
}

/**
 * Updates scraper status based on actual exchange rate data
 * This provides accurate status information without modifying any provider records
 */
export async function updateScraperStatusFromRates(): Promise<boolean> {
  try {
    console.log('Updating scraper status based on actual exchange rate data...');
    
    // Get all providers
    const providers = await storage.getProviders();
    
    for (const provider of providers) {
      // Get the latest rates for this provider
      const gbpNgnRates = await storage.getRatesByProvider(provider.id, 'GBP', 'NGN', 1);
      const eurNgnRates = await storage.getRatesByProvider(provider.id, 'EUR', 'NGN', 1);
      const gbpGhsRates = await storage.getRatesByProvider(provider.id, 'GBP', 'GHS', 1);
      const eurGhsRates = await storage.getRatesByProvider(provider.id, 'EUR', 'GHS', 1);
      
      // Combine all rates
      const allRates = [...gbpNgnRates, ...eurNgnRates, ...gbpGhsRates, ...eurGhsRates];
      
      // Sort by timestamp to get the most recent
      allRates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      let success = false;
      let message = 'No rate data available';
      
      if (allRates.length > 0) {
        const latestRate = allRates[0];
        const rateAgeMs = Date.now() - new Date(latestRate.timestamp).getTime();
        const isRateCurrent = rateAgeMs < getMaxRateAgeMs();
        
        const fromCurrency = latestRate.from_currency;
        const toCurrency = latestRate.to_currency;
        const rate = latestRate.rate;
        const timeAgo = Math.floor(rateAgeMs / (1000 * 60));
        
        if (isRateCurrent) {
          // Rate is current and valid
          success = true;
          
          // Custom messages based on provider
          if (provider.name === 'Wise' || provider.name === 'WorldRemit' || provider.name === 'TransferGo') {
            message = `API integration active - ${fromCurrency}/${toCurrency}: ${rate} (${timeAgo}m ago)`;
          } else if (provider.name === 'Western Union' || provider.name === 'Paysend') {
            message = `Multi-method scraper active - ${fromCurrency}/${toCurrency}: ${rate} (${timeAgo}m ago)`;
          } else if (provider.name === 'Remitly' || provider.name === 'Nala') {
            message = `Web scraping active - ${fromCurrency}/${toCurrency}: ${rate} (${timeAgo}m ago)`;
          } else if (provider.preferred_collection === 'MANUAL') {
            message = `Manual rate - ${fromCurrency}/${toCurrency}: ${rate} (${timeAgo}m ago)`;
          } else {
            message = `Rate collected - ${fromCurrency}/${toCurrency}: ${rate} (${timeAgo}m ago)`;
          }
        } else {
          // Rate exists but is outdated
          success = false;
          const hoursAgo = Math.floor(rateAgeMs / (1000 * 60 * 60));
          message = `Rate outdated - ${fromCurrency}/${toCurrency}: ${rate} (${hoursAgo}h old)`;
        }
      } else if (provider.preferred_collection === 'MANUAL') {
        // Special case for manually updated providers
        success = true;
        message = 'Configured for manual updates only';
      } else {
        // No rates found
        success = false;
        message = 'No rate data available';
      }
      
      // Record the status based on the rate data
      recordScraperRun(provider.name, success, message);
      console.log(`Updated status for ${provider.name}: ${success ? 'Success' : 'Failed'} - ${message}`);
    }
    
    console.log('All scraper statuses updated successfully based on actual rate data');
    return true;
  } catch (error) {
    console.error('Error updating scraper statuses from rates:', error);
    return false;
  }
}