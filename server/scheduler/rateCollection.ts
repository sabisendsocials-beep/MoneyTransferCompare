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
    
    // Get API for Wise
    const { fetchWiseRates } = await import('../api/wiseApi');
    
    // Collect Wise rates (if API key is available)
    try {
      const wiseProvider = (await storage.getProviders()).find(p => 
        p.name.toLowerCase().includes('wise'));
      
      if (wiseProvider) {
        log(`Collecting rates from Wise API for provider ID ${wiseProvider.id}...`);
        const wiseRates = await fetchWiseRates();
        
        // Save each rate to the database with API source type
        for (const rate of wiseRates) {
          await storage.createExchangeRate({
            provider_id: wiseProvider.id,
            from_currency: rate.fromCurrency,
            to_currency: rate.toCurrency,
            rate: rate.rate,
            source: DataSourceType.API,
            source_url: 'Wise API',
            verified: true
          });
        }
        
        log(`Saved ${wiseRates.length} rates from Wise API`);
      } else {
        log('Wise provider not found in database, skipping API collection');
      }
    } catch (error) {
      log(`Error collecting rates from Wise API: ${error}`);
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
  
  // Setup scheduled collections using simple scheduling (since we don't have node-cron)
  // Morning collection - 6 AM
  const morningJob = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 6 && now.getMinutes() === 0) {
      log('Running scheduled morning rate collection (6 AM)...');
      collectAllRates()
        .then(() => log('Morning rate collection completed'))
        .catch(error => log(`Error in morning rate collection: ${error}`));
    }
  }, 60000); // Check every minute
  
  // Afternoon collection - 2 PM
  const afternoonJob = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 14 && now.getMinutes() === 0) {
      log('Running scheduled afternoon rate collection (2 PM)...');
      collectAllRates()
        .then(() => log('Afternoon rate collection completed'))
        .catch(error => log(`Error in afternoon rate collection: ${error}`));
    }
  }, 60000); // Check every minute
  
  // Evening collection - 10 PM
  const eveningJob = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 22 && now.getMinutes() === 0) {
      log('Running scheduled evening rate collection (10 PM)...');
      collectAllRates()
        .then(() => log('Evening rate collection completed'))
        .catch(error => log(`Error in evening rate collection: ${error}`));
    }
  }, 60000); // Check every minute
  
  // Store active jobs
  activeJobs = [morningJob, afternoonJob, eveningJob];
  
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