/**
 * Scheduled Rate Collection System
 * Runs 3 times daily to collect exchange rates from all sources
 */

import { log } from '../vite';
import { storage } from '../storage';
import { db } from '../db';
import { exchangeRates } from '@shared/schema';
import { sql } from 'drizzle-orm';

// Schedule times (in hours, 24-hour format)
const COLLECTION_TIMES = [6, 14, 22]; // 6 AM, 2 PM, 10 PM

// Data source types
export enum DataSourceType {
  API = 'API',
  MANUAL = 'MANUAL',
  SCRAPER = 'SCRAPER'
}

/**
 * Check if it's time to run a collection based on the current hour
 */
function shouldRunCollection(): boolean {
  const currentHour = new Date().getHours();
  return COLLECTION_TIMES.includes(currentHour);
}

/**
 * Collect exchange rates from various sources for all providers
 */
export async function collectAllRates(): Promise<void> {
  try {
    log('Starting scheduled rate collection...');
    
    // Get all active providers
    const providers = await storage.getActiveProviders();
    log(`Found ${providers.length} active providers for rate collection`);
    
    // Define currency pairs to collect
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'EUR', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'GHS' }
    ];
    
    let successCount = 0;
    
    // First try to collect from provider APIs
    for (const provider of providers) {
      if (provider.website_url && provider.website_url.includes('api')) {
        log(`Attempting API collection for ${provider.name}`);
        try {
          for (const pair of currencyPairs) {
            // API collection logic will be implemented in the future
            // For now, we'll just log the attempt
            log(`Would collect ${pair.from}/${pair.to} from API for ${provider.name}`);
          }
        } catch (error) {
          log(`Error collecting rates from API for ${provider.name}: ${error}`);
        }
      }
    }
    
    // Then collect from web scrapers
    try {
      log('Collecting rates from web scrapers...');
      const { updateExchangeRates } = await import('../scrapers/providers');
      
      // Update the rates - this uses the existing scraping infrastructure
      const results = await updateExchangeRates(false);
      
      // Try to update the sources of the newly collected rates
      try {
        // Update the source field to indicate these came from scrapers
        for (const rate of results) {
          try {
            // First try to update using the new column structure
            await db.execute(sql`
              UPDATE exchange_rates 
              SET source = ${DataSourceType.SCRAPER}
              WHERE id = ${rate.id}
            `).catch(() => {
              // If the column doesn't exist, that's okay, we'll add it later
              log(`Source column may not exist yet for rate ${rate.id}`);
            });
          } catch (updateError) {
            log(`Error updating rate source: ${updateError}`);
          }
        }
      } catch (sourceError) {
        log(`Note: Source tracking will be available after schema update: ${sourceError}`);
      }
      
      successCount += results.length;
      log(`Collected ${results.length} rates from web scrapers`);
    } catch (error) {
      log(`Error collecting rates from scrapers: ${error}`);
    }
    
    log(`Scheduled rate collection completed with ${successCount} new rates`);
  } catch (error) {
    log(`Error in scheduled rate collection: ${error}`);
  }
}

/**
 * Initialize the rate collection scheduler
 * Checks every hour if it's time to run a collection
 */
export function initializeRateCollectionScheduler(): void {
  log('Initializing rate collection scheduler');
  
  // Run the first collection immediately
  collectAllRates();
  
  // Set up hourly checks
  setInterval(() => {
    if (shouldRunCollection()) {
      log(`Scheduled collection time reached (${new Date().getHours()}:00)`);
      collectAllRates();
    }
  }, 60 * 60 * 1000); // Check every hour
  
  log(`Rate collection scheduled for ${COLLECTION_TIMES.join(', ')} hours daily`);
}

// Export for manual triggering
export default {
  collectAllRates,
  initializeRateCollectionScheduler
};