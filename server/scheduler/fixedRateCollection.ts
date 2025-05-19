/**
 * Rate Collection Scheduler
 * Implements the scheduled collection of exchange rates from multiple sources
 * Running three times daily: 6 AM, 2 PM, and 10 PM
 */

import { log } from '../vite';
import { storage } from '../storage';

// Data source types (matches the enum in dataSourceRouter.ts)
export enum DataSourceType {
  API = 'API',
  MANUAL = 'MANUAL',
  SCRAPER = 'SCRAPER',
  FALLBACK = 'FALLBACK'
}

// Collection task intervals (in milliseconds)
const COLLECTION_INTERVALS = {
  MORNING: '0 6 * * *',    // 6:00 AM
  AFTERNOON: '0 14 * * *', // 2:00 PM
  EVENING: '0 22 * * *'    // 10:00 PM
};

// Active collection jobs
let activeJobs: NodeJS.Timeout[] = [];

// Store which providers have been collected via API to avoid duplication
const providersCollectedViaAPI = new Set<number>();

/**
 * Collects rates from all available data sources with priority
 * Order: API data first, then manual entries, then web scrapers
 */
export async function collectAllRates(): Promise<boolean> {
  try {
    log('Starting rate collection from all sources...');
    
    // Clear the tracking of API-collected providers
    providersCollectedViaAPI.clear();
    
    // Step 1: Collect from direct APIs (highest priority)
    await collectFromAPIs();
    
    // Step 2: Collect from web scrapers (lower priority)
    await collectFromScrapers();
    
    log('Rate collection completed: successfully');
    return true;
  } catch (error) {
    log(`Rate collection error: ${error}`);
    return false;
  }
}

/**
 * Collect rates from direct provider APIs
 */
async function collectFromAPIs(): Promise<void> {
  try {
    log('Collecting rates from provider APIs...');
    
    // Get all providers that prefer API collection
    const apiProviders = await storage.getProviders();
    const preferApiProviders = apiProviders.filter(p => 
      p.active && p.preferred_collection === 'API'
    );
    
    log(`Found ${preferApiProviders.length} providers configured for API collection`);
    
    // Process each API provider
    for (const provider of preferApiProviders) {
      log(`Processing API collection for ${provider.name} (ID: ${provider.id})...`);
      
      // Handle each provider based on its name
      switch (provider.name.toLowerCase()) {
        case 'wise':
          // Import the Wise API implementation
          const { default: updateWiseRates } = await import('../api/wiseApi');
          
          try {
            log(`Collecting rates via API for ${provider.name} (ID: ${provider.id})...`);
            const success = await updateWiseRates();
            
            if (success) {
              log(`✓ Successfully collected rates via API for ${provider.name}`);
              providersCollectedViaAPI.add(provider.id);
            } else {
              log(`⚠ API collection failed for ${provider.name} - STRICT POLICY: not falling back to scraping`);
            }
          } catch (error) {
            log(`❌ Error in API collection for ${provider.name}: ${error}`);
            log(`STRICT POLICY: Not attempting fallback scraping for ${provider.name} as it's configured for API only`);
          }
          break;
          
        // Add more API integrations as they become available
        default:
          log(`⚠ No API implementation available for ${provider.name} despite having API preference`);
      }
    }
    
    log(`API rate collection completed successfully for ${providersCollectedViaAPI.size} providers`);
  } catch (error) {
    log(`Error in API rate collection: ${error}`);
  }
}

/**
 * Collect rates from web scrapers
 */
async function collectFromScrapers(): Promise<void> {
  try {
    log('Collecting rates from web scrapers...');
    
    // Get active providers that prefer scraper collection or have no preference specified
    const allProviders = await storage.getProviders();
    const scraperProviders = allProviders.filter(p => 
      p.active && 
      (p.preferred_collection === 'SCRAPER' || !p.preferred_collection) && 
      !providersCollectedViaAPI.has(p.id)
    );
    
    log(`Found ${scraperProviders.length} providers for scraper collection`);
    
    // Import our enhanced scraper system
    const scrapeAllProviderRates = (await import('../scrapers/enhancedScraperSystem.js')).default;
    
    // Try the robust enhanced scraper
    try {
      // Scrape GBP to NGN
      const gbpToNgnResults = await scrapeAllProviderRates('GBP', 'NGN');
      log(`Enhanced scraper collected ${gbpToNgnResults.length} GBP→NGN rates`);
      
      // Scrape EUR to NGN
      const eurToNgnResults = await scrapeAllProviderRates('EUR', 'NGN');
      log(`Enhanced scraper collected ${eurToNgnResults.length} EUR→NGN rates`);
      
      // Scrape GBP to GHS
      const gbpToGhsResults = await scrapeAllProviderRates('GBP', 'GHS');
      log(`Enhanced scraper collected ${gbpToGhsResults.length} GBP→GHS rates`);
    } catch (error) {
      log(`Error in enhanced scraper system: ${error}`);
    }
    
    log('Scraper collection complete');
  } catch (error) {
    log(`Error in web scraper collection: ${error}`);
  }
}

/**
 * Initialize the rate collection scheduler
 * Sets up jobs to run at specified intervals
 */
export function initializeRateCollectionScheduler(): void {
  // Clear any existing jobs
  stopRateCollectionScheduler();
  
  log('Initializing rate collection scheduler...');
  
  // Setup collection times
  const collectionTimes = [6, 14, 22]; // 6 AM, 2 PM, 10 PM
  log(`Collection times scheduled for:\n- ${collectionTimes.join(' UTC\n- ')} UTC`);
  
  // Track the last run times to avoid duplicate runs
  const lastRunTimes: Record<number, string | null> = {
    6: null,  // 6 AM
    14: null, // 2 PM
    22: null  // 10 PM
  };
  
  // Helper function to determine if a collection should run
  function shouldRunCollection(targetHour: number, lastRunTime: string | null): boolean {
    const now = new Date();
    const today = now.toDateString();
    
    // If it's already past the target hour today and we haven't run today
    if (now.getHours() >= targetHour && 
        (!lastRunTime || new Date(lastRunTime).toDateString() !== today)) {
      return true;
    }
    
    // If we've already passed 30 minutes past the target hour, wait for tomorrow
    if (now.getHours() > targetHour || 
        (now.getHours() === targetHour && now.getMinutes() >= 30)) {
      return false;
    }
    
    // If we're within the target hour window (first 30 minutes) and haven't run today
    if (now.getHours() === targetHour && 
        (!lastRunTime || new Date(lastRunTime).toDateString() !== today)) {
      return true;
    }
    
    return false;
  }
  
  // Check every 5 minutes
  const schedulerJob = setInterval(() => {
    const now = new Date();
    
    // Check each collection time
    for (const hour of collectionTimes) {
      if (shouldRunCollection(hour, lastRunTimes[hour])) {
        log(`Running scheduled rate collection (${hour}:00 UTC)...`);
        collectAllRates()
          .then(() => {
            lastRunTimes[hour] = new Date().toISOString();
            log(`Rate collection at ${hour}:00 UTC completed successfully`);
          })
          .catch(error => log(`Error in rate collection at ${hour}:00 UTC: ${error}`));
      }
    }
  }, 300000); // Check every 5 minutes
  
  // Store active jobs
  activeJobs = [schedulerJob];
  
  log('Rate collection scheduler initialized (checking every 5 minutes)');
}

/**
 * Stop the rate collection scheduler
 */
export function stopRateCollectionScheduler(): void {
  if (activeJobs.length > 0) {
    log('Stopping rate collection scheduler...');
    activeJobs.forEach(job => clearInterval(job));
    activeJobs = [];
    log('Rate collection scheduler stopped');
  }
}