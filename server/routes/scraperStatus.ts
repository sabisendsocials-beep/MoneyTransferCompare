/**
 * Scraper Status Routes
 * 
 * Provides detailed information about scraper runs including:
 * - Last run time for each scraper
 * - Success/failure status of last run
 * - Any rate limiting or minimum time between updates
 */
import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// Store last run times for each provider
const lastRunTimes: Record<string, Date> = {};
// Store success status for each provider
const scraperStatus: Record<string, { 
  success: boolean; 
  lastRunTime: Date | null;
  nextAllowedRunTime: Date | null;
  message: string;
}> = {};

// Minimum time between scraper runs in milliseconds (default: 30 minutes)
const MIN_TIME_BETWEEN_RUNS = 30 * 60 * 1000;

/**
 * Records the result of a scraper run
 * @param providerName Name of the provider
 * @param success Whether the run was successful
 * @param message Additional message about the run
 */
export function recordScraperRun(
  providerName: string, 
  success: boolean, 
  message: string = ''
): void {
  const now = new Date();
  lastRunTimes[providerName] = now;
  
  const nextAllowedRunTime = new Date(now.getTime() + MIN_TIME_BETWEEN_RUNS);
  
  scraperStatus[providerName] = {
    success,
    lastRunTime: now,
    nextAllowedRunTime,
    message
  };
}

/**
 * Checks if a scraper can run based on the minimum time between runs
 * @param providerName Name of the provider
 * @returns Whether the scraper can run
 */
export function canScraperRun(providerName: string): boolean {
  const lastRun = lastRunTimes[providerName];
  if (!lastRun) return true;
  
  const now = new Date();
  const timeSinceLastRun = now.getTime() - lastRun.getTime();
  
  // Allow a scraper to run if it hasn't run in the minimum time
  return timeSinceLastRun >= MIN_TIME_BETWEEN_RUNS;
}

/**
 * Gets all scrapers' status information
 */
router.get('/status', async (_req, res) => {
  console.log("Scraper status endpoint called");
  try {
    // Get all providers
    const providers = await storage.getProviders();
    
    // Format the response
    const statusResponse = providers.map(provider => {
      const status = scraperStatus[provider.name] || {
        success: false,
        lastRunTime: null,
        nextAllowedRunTime: null,
        message: 'Never run'
      };
      
      const canRun = canScraperRun(provider.name);
      
      return {
        id: provider.id,
        name: provider.name,
        lastRun: status.lastRunTime ? status.lastRunTime.toISOString() : null,
        nextRun: status.nextAllowedRunTime ? status.nextAllowedRunTime.toISOString() : null,
        success: status.success,
        message: status.message,
        canRunNow: canRun,
        timeSinceLastRun: status.lastRunTime ? 
          Math.floor((new Date().getTime() - status.lastRunTime.getTime()) / 1000) + ' seconds ago' : 
          'Never run'
      };
    });
    
    return res.json({
      success: true,
      status: statusResponse,
      minTimeBetweenRuns: `${MIN_TIME_BETWEEN_RUNS / 60000} minutes`,
      minTimeBetweenRunsMs: MIN_TIME_BETWEEN_RUNS
    });
  } catch (error) {
    console.error('Error getting scraper status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get scraper status'
    });
  }
});

/**
 * Force a specific scraper to be able to run again, bypassing the time limitation
 */
router.post('/reset-timer/:id', async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider ID'
      });
    }
    
    // Get the provider
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }
    
    // Reset the timer by removing the last run time
    delete lastRunTimes[provider.name];
    
    // Update the status message
    if (scraperStatus[provider.name]) {
      scraperStatus[provider.name].message = 'Timer reset, ready to run';
      scraperStatus[provider.name].nextAllowedRunTime = null;
    }
    
    return res.json({
      success: true,
      message: `Reset timer for ${provider.name} scraper`
    });
  } catch (error) {
    console.error('Error resetting scraper timer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset scraper timer'
    });
  }
});

export default router;