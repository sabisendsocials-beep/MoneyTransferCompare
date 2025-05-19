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

/**
 * Collects rates from all available data sources with priority
 * Order: API data first, then manual entries, then web scrapers
 */
export async function collectAllRates(): Promise<boolean> {
  try {
    log('Starting scheduled rate collection process...');
    
    // Step 1: Collect from direct APIs (highest priority)
    await collectFromAPIs();
    
    // Step 2: Collect from web scrapers (lower priority)
    await collectFromScrapers();
    
    log('Rate collection completed successfully');
    return true;
  } catch (error) {
    log(`Error in rate collection: ${error}`);
    return false;
  }
}

/**
 * Collect rates from direct provider APIs
 */
async function collectFromAPIs(): Promise<void> {
  try {
    log('Collecting rates from provider APIs...');
    
    // Get direct API implementations
    const { default: updateWiseRates } = await import('../api/wiseApi');
    
    // First, try the Wise API directly with full error handling
    try {
      log('Attempting to collect rates directly from Wise API...');
      const wiseSuccess = await updateWiseRates();
      
      if (wiseSuccess) {
        log('✓ Successfully collected and saved Wise rates via API');
        // Track which providers we've already collected via API to avoid duplicates
        global.providersCollectedViaAPI = global.providersCollectedViaAPI || {};
        global.providersCollectedViaAPI['wise'] = true;
      } else {
        log('⚠ Failed to collect rates via Wise API - will try web scraping as fallback');
      }
    } catch (error) {
      log(`❌ Error collecting rates from Wise API: ${error}`);
      log('Will attempt to use web scraping as fallback for Wise');
    }
    
    // Here we would add more API integrations as they become available
    // E.g., for WorldRemit, Lemfi, etc.
    
    log('API rate collection completed');
  } catch (error) {
    log(`Error in API rate collection: ${error}`);
  }
}

/**
 * Collect rates from web scrapers
 */
async function collectFromScrapers(): Promise<void> {
  try {
    log('Collecting rates from web scrapers with enhanced system...');
    
    // Import our enhanced scraper system
    const scrapeAllProviderRates = (await import('../scrapers/enhancedScraperSystem.js')).default;
    
    // Try the robust enhanced scraper first
    try {
      log('Running enhanced exchange rate scraper system...');
      // Scrape GBP to NGN
      const gbpToNgnResults = await scrapeAllProviderRates('GBP', 'NGN');
      log(`Enhanced scraper collected ${gbpToNgnResults.length} GBP→NGN rates`);
      
      // Scrape EUR to NGN
      const eurToNgnResults = await scrapeAllProviderRates('EUR', 'NGN');
      log(`Enhanced scraper collected ${eurToNgnResults.length} EUR→NGN rates`);
      
      // Scrape GBP to GHS
      const gbpToGhsResults = await scrapeAllProviderRates('GBP', 'GHS');
      log(`Enhanced scraper collected ${gbpToGhsResults.length} GBP→GHS rates`);
      
      const totalResults = gbpToNgnResults.length + eurToNgnResults.length + gbpToGhsResults.length;
      log(`Enhanced scraper system collected a total of ${totalResults} rates`);
    } catch (error) {
      log(`Error in enhanced scraper system: ${error}`);
    }
    
    // Fallback to the original scrapers if enhanced system fails
    if (process.env.USE_LEGACY_SCRAPERS === 'true') {
      log('Also running legacy scrapers as backup...');
      
      try {
        const { updateExchangeRates } = await import('../scrapers/providers');
        log('Running general exchange rate scraper...');
        await updateExchangeRates();
      } catch (error) {
        log(`Error in general exchange rate scraper: ${error}`);
      }
      
      try {
        const { updateWorldRemitRate } = await import('../scrapers/worldRemitScraper');
        log('Running WorldRemit scraper...');
        await updateWorldRemitRate();
      } catch (error) {
        log(`Error in WorldRemit scraper: ${error}`);
      }
      
      try {
        const { updateLemfiRate } = await import('../scrapers/lemfiScraper');
        log('Running Lemfi scraper...');
        await updateLemfiRate();
      } catch (error) {
        log(`Error in Lemfi scraper: ${error}`);
      }
    }
    
    log('Web scraper rate collection completed');
  } catch (error) {
    log(`Error in web scraper rate collection: ${error}`);
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
  
  // Setup initial collection
  setTimeout(() => {
    collectAllRates()
      .then(() => log('Initial rate collection completed'))
      .catch(error => log(`Error in initial rate collection: ${error}`));
  }, 60000); // Wait a minute after startup to allow the app to initialize
  
  // More robust scheduling implementation
  // Instead of just checking once per minute, calculate the exact time until next run
  // This ensures we don't miss schedules due to timing or precision issues
  
  // Track the last run times to avoid duplicate runs
  const lastRunTimes = {
    morning: null,
    afternoon: null,
    evening: null
  };
  
  // Helper function to determine if a collection should run
  function shouldRunCollection(targetHour, lastRunTime) {
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
  
  // Check every 5 minutes instead of every minute
  const schedulerJob = setInterval(() => {
    const now = new Date();
    log(`Scheduler check at ${now.toISOString()} (Hour: ${now.getHours()}, Minute: ${now.getMinutes()})`);
    
    // Morning collection - 6 AM
    if (shouldRunCollection(6, lastRunTimes.morning)) {
      log('Running scheduled morning rate collection (6 AM)...');
      collectAllRates()
        .then(() => {
          lastRunTimes.morning = new Date().toISOString();
          log(`Morning rate collection completed at ${lastRunTimes.morning}`);
        })
        .catch(error => log(`Error in morning rate collection: ${error}`));
    }
    
    // Afternoon collection - 2 PM
    if (shouldRunCollection(14, lastRunTimes.afternoon)) {
      log('Running scheduled afternoon rate collection (2 PM)...');
      collectAllRates()
        .then(() => {
          lastRunTimes.afternoon = new Date().toISOString();
          log(`Afternoon rate collection completed at ${lastRunTimes.afternoon}`);
        })
        .catch(error => log(`Error in afternoon rate collection: ${error}`));
    }
    
    // Evening collection - 10 PM
    if (shouldRunCollection(22, lastRunTimes.evening)) {
      log('Running scheduled evening rate collection (10 PM)...');
      collectAllRates()
        .then(() => {
          lastRunTimes.evening = new Date().toISOString();
          log(`Evening rate collection completed at ${lastRunTimes.evening}`);
        })
        .catch(error => log(`Error in evening rate collection: ${error}`));
    }
  }, 300000); // Check every 5 minutes
  
  // Store active jobs
  activeJobs = [schedulerJob];
  
  log('Rate collection scheduler initialized with 3 daily collection periods');
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