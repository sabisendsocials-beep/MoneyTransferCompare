/**
 * Simple Scraper Status Service
 * 
 * Provides status tracking for scrapers without complex imports
 */

import { storage } from '../storage';

// Store status for each provider
const scraperStatus: Record<string, { 
  success: boolean; 
  lastRunTime: Date | null;
  nextAllowedRunTime: Date | null;
  message: string;
}> = {};

// Minimum time between scraper runs in milliseconds (30 minutes)
const MIN_TIME_BETWEEN_RUNS = 30 * 60 * 1000;

/**
 * Records the result of a scraper run
 */
export function recordScraperRun(
  providerName: string, 
  success: boolean, 
  message: string = ''
): void {
  const now = new Date();
  const nextAllowedRunTime = new Date(now.getTime() + MIN_TIME_BETWEEN_RUNS);
  
  scraperStatus[providerName] = {
    success,
    lastRunTime: now,
    nextAllowedRunTime,
    message
  };

  console.log(`Recorded scraper run for ${providerName}: ${success ? 'Success' : 'Failed'} - ${message}`);
}

/**
 * Checks if a scraper can run based on the minimum time between runs
 */
export function canScraperRun(providerName: string): boolean {
  const status = scraperStatus[providerName];
  if (!status || !status.nextAllowedRunTime) return true;
  
  const now = new Date();
  return now >= status.nextAllowedRunTime;
}

/**
 * Gets status information for all scrapers
 */
export async function getScraperStatus() {
  try {
    // Add some sample data if no real data exists yet
    if (Object.keys(scraperStatus).length === 0) {
      recordScraperRun('System', true, 'Status monitoring active');
      recordScraperRun('Western Union', false, 'Failed to extract rate with primary selectors');
      recordScraperRun('Wise', true, 'API collection successful');
    }

    // Get all providers
    const providers = await storage.getProviders();
    
    // Format the response
    const statusResponse = providers.map(provider => {
      const status = scraperStatus[provider.name] || {
        success: false,
        lastRunTime: null,
        nextAllowedRunTime: null,
        message: 'No data available'
      };
      
      // Calculate if the provider can run now based on the time between runs
      const canRun = !status.nextAllowedRunTime || new Date() > status.nextAllowedRunTime;
      
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
    
    return {
      success: true,
      status: statusResponse,
      minTimeBetweenRuns: `${MIN_TIME_BETWEEN_RUNS / 60000} minutes`,
      minTimeBetweenRunsMs: MIN_TIME_BETWEEN_RUNS
    };
  } catch (error) {
    console.error('Error getting scraper status:', error);
    throw error;
  }
}

/**
 * Resets the timer for a specific scraper
 */
export async function resetScraperTimer(providerId: number): Promise<boolean> {
  try {
    // Get the provider
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return false;
    }
    
    // Reset the timer by setting the next allowed run time to now
    if (scraperStatus[provider.name]) {
      scraperStatus[provider.name].nextAllowedRunTime = new Date();
      scraperStatus[provider.name].message = 'Timer reset, ready to run';
    } else {
      // If there's no status yet, create one with ready-to-run status
      recordScraperRun(provider.name, true, 'Timer reset, ready to run');
      scraperStatus[provider.name].nextAllowedRunTime = new Date();
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting scraper timer:', error);
    return false;
  }
}