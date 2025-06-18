/**
 * Provider Rate API Scheduler
 * Collects exchange rates from providers configured for API access
 * Runs 6 times daily: 6am, 9am, 12pm, 3pm, 6pm, 9pm UTC
 */

import { storage } from '../storage';
// Import Wise API service (will be created if needed)
const fetchWiseRates = async () => {
  try {
    const { fetchWiseRates: wiseApi } = await import('../services/wiseApiService');
    return await wiseApi();
  } catch (error) {
    console.warn('Wise API service not available:', error);
    return { success: false, rates: [], error: 'Service not available' };
  }
};

// Default schedule times (UTC hours)
let SCHEDULED_HOURS = [6, 9, 12, 15, 18, 21];

// Scheduler state tracking
let schedulerActive = false;
let lastRunHours: Set<number> = new Set();
let lastRunDate: string | null = null;
let lastRunTimestamp: Date | null = null;
let totalSuccessful = 0;
let totalFailed = 0;

// Collection results for the current day
interface CollectionResult {
  hour: number;
  timestamp: Date;
  successful: number;
  failed: number;
  details: {
    providerId: number;
    providerName: string;
    success: boolean;
    error?: string;
    ratesCollected?: number;
  }[];
}

let dailyResults: CollectionResult[] = [];

/**
 * Check if current time matches a scheduled collection time
 */
function shouldRunNow(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];
  
  // Reset tracking if it's a new day
  if (lastRunDate !== currentDate) {
    lastRunHours.clear();
    lastRunDate = currentDate;
    dailyResults = [];
    totalSuccessful = 0;
    totalFailed = 0;
  }
  
  // Check if current hour is scheduled and hasn't run yet
  const isScheduledTime = SCHEDULED_HOURS.includes(currentHour);
  const hasNotRunThisHour = !lastRunHours.has(currentHour);
  
  return isScheduledTime && hasNotRunThisHour;
}

/**
 * Get all providers configured for API collection
 */
async function getApiProviders(): Promise<any[]> {
  try {
    const providers = await storage.getProviders();
    // Filter for providers that have API integration
    return providers.filter(provider => 
      provider.has_api && 
      provider.active && 
      provider.name // Basic validation
    );
  } catch (error) {
    console.error('Error fetching API providers:', error);
    return [];
  }
}

/**
 * Collect rates from a specific API provider
 */
async function collectFromProvider(provider: any): Promise<{
  success: boolean;
  ratesCollected?: number;
  error?: string;
}> {
  try {
    console.log(`Collecting rates from ${provider.name} API...`);
    
    // Handle Wise API (currently the only working integration)
    if (provider.name.toLowerCase().includes('wise')) {
      const result = await fetchWiseRates();
      
      if (result.success && result.rates.length > 0) {
        console.log(`✓ Collected ${result.rates.length} rates from ${provider.name}`);
        return {
          success: true,
          ratesCollected: result.rates.length
        };
      } else {
        console.warn(`⚠ ${provider.name} API returned no rates`);
        return {
          success: false,
          error: 'No rates returned from API'
        };
      }
    }
    
    // Handle other API providers (MoneyGram, PaySend, Western Union)
    // These would be implemented when credentials are available
    if (provider.name.toLowerCase().includes('moneygram')) {
      console.log(`⏳ MoneyGram API integration ready (needs credentials)`);
      return {
        success: false,
        error: 'API credentials not configured'
      };
    }
    
    if (provider.name.toLowerCase().includes('paysend')) {
      console.log(`⏳ PaySend API integration ready (needs credentials)`);
      return {
        success: false,
        error: 'API credentials not configured'
      };
    }
    
    if (provider.name.toLowerCase().includes('western union')) {
      console.log(`⏳ Western Union API integration ready (needs credentials)`);
      return {
        success: false,
        error: 'API credentials not configured'
      };
    }
    
    // Default case for unknown providers
    console.warn(`⚠ No API integration available for ${provider.name}`);
    return {
      success: false,
      error: 'API integration not implemented'
    };
    
  } catch (error) {
    console.error(`Error collecting from ${provider.name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run collection cycle for all API providers
 */
async function runCollectionCycle(): Promise<CollectionResult> {
  const currentHour = new Date().getHours();
  const timestamp = new Date();
  
  console.log(`\n🔄 Starting Provider API collection cycle (${currentHour}:00 UTC)`);
  
  const providers = await getApiProviders();
  console.log(`Found ${providers.length} API-enabled providers`);
  
  const result: CollectionResult = {
    hour: currentHour,
    timestamp,
    successful: 0,
    failed: 0,
    details: []
  };
  
  if (providers.length === 0) {
    console.log('⚠ No API providers found for collection');
    return result;
  }
  
  // Collect from each provider with rate limiting
  for (const provider of providers) {
    const providerResult = await collectFromProvider(provider);
    
    result.details.push({
      providerId: provider.id,
      providerName: provider.name,
      success: providerResult.success,
      error: providerResult.error,
      ratesCollected: providerResult.ratesCollected
    });
    
    if (providerResult.success) {
      result.successful++;
      totalSuccessful++;
    } else {
      result.failed++;
      totalFailed++;
    }
    
    // Rate limiting: wait 2 seconds between provider API calls
    if (providers.indexOf(provider) < providers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`✅ Collection cycle completed: ${result.successful}/${providers.length} successful`);
  
  if (result.failed > 0) {
    console.warn(`⚠ ${result.failed} providers failed during collection`);
    result.details
      .filter(detail => !detail.success)
      .forEach(detail => {
        console.warn(`  - ${detail.providerName}: ${detail.error}`);
      });
  }
  
  return result;
}

/**
 * Initialize the Provider API Scheduler
 */
export async function initializeProviderApiScheduler(): Promise<void> {
  if (schedulerActive) {
    console.log('Provider API scheduler already active');
    return;
  }
  
  console.log('Initializing Provider API Scheduler...');
  console.log(`Scheduled collection times: ${SCHEDULED_HOURS.join(':00, ')}:00 UTC`);
  
  // Check every 5 minutes for scheduled times
  const intervalMinutes = 5;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const interval = setInterval(async () => {
    if (shouldRunNow()) {
      const currentHour = new Date().getHours();
      console.log(`\n📊 Provider API collection time reached (${currentHour}:00 UTC)...`);
      
      try {
        const result = await runCollectionCycle();
        
        // Mark this hour as completed
        lastRunHours.add(currentHour);
        lastRunDate = new Date().toISOString().split('T')[0];
        lastRunTimestamp = new Date();
        
        // Store results for admin dashboard
        dailyResults.push(result);
        
        console.log(`📊 Provider API collection completed at ${currentHour}:00 UTC\n`);
        
      } catch (error) {
        console.error('Error during Provider API collection cycle:', error);
        
        // Still mark as attempted to prevent retries
        lastRunHours.add(currentHour);
        lastRunDate = new Date().toISOString().split('T')[0];
        lastRunTimestamp = new Date();
      }
    }
  }, intervalMs);
  
  schedulerActive = true;
  
  console.log(`Provider API Scheduler initialized (checking every ${intervalMinutes} minutes)`);
  console.log('Scheduler will collect rates from API-enabled providers only');
  
  // Return cleanup function
  const cleanup = () => {
    clearInterval(interval);
    schedulerActive = false;
    console.log('Provider API Scheduler stopped');
  };
}

/**
 * Get scheduler status for admin dashboard
 */
export function getProviderApiSchedulerStatus(): {
  active: boolean;
  lastRunDate: string | null;
  lastRunTimestamp: string | null;
  nextScheduledTime: string;
  scheduledHours: number[];
  completedHoursToday: number[];
  remainingHoursToday: number[];
  totalSuccessfulToday: number;
  totalFailedToday: number;
  dailyResults: CollectionResult[];
} {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];
  
  // Reset tracking if it's a new day
  if (lastRunDate !== currentDate) {
    lastRunHours.clear();
    dailyResults = [];
    totalSuccessful = 0;
    totalFailed = 0;
  }
  
  // Find next scheduled time
  let nextScheduledTime: Date;
  const remainingToday = SCHEDULED_HOURS.filter(hour => hour > currentHour);
  
  if (remainingToday.length > 0) {
    // Next run today
    nextScheduledTime = new Date(now);
    nextScheduledTime.setHours(remainingToday[0], 0, 0, 0);
  } else {
    // Next run tomorrow (first scheduled hour)
    nextScheduledTime = new Date(now);
    nextScheduledTime.setDate(nextScheduledTime.getDate() + 1);
    nextScheduledTime.setHours(SCHEDULED_HOURS[0], 0, 0, 0);
  }
  
  return {
    active: schedulerActive,
    lastRunDate,
    lastRunTimestamp: lastRunTimestamp?.toISOString() || null,
    nextScheduledTime: nextScheduledTime.toISOString(),
    scheduledHours: [...SCHEDULED_HOURS],
    completedHoursToday: [...lastRunHours].sort(),
    remainingHoursToday: SCHEDULED_HOURS.filter(hour => 
      hour >= currentHour && !lastRunHours.has(hour)
    ),
    totalSuccessfulToday: totalSuccessful,
    totalFailedToday: totalFailed,
    dailyResults: [...dailyResults]
  };
}

/**
 * Update scheduled hours (for admin configuration)
 */
export function updateScheduledHours(newHours: number[]): {
  success: boolean;
  message: string;
} {
  try {
    // Validate hours
    if (!Array.isArray(newHours) || newHours.length === 0) {
      return {
        success: false,
        message: 'Scheduled hours must be a non-empty array'
      };
    }
    
    // Validate each hour is between 0-23
    for (const hour of newHours) {
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        return {
          success: false,
          message: `Invalid hour: ${hour}. Hours must be integers between 0-23`
        };
      }
    }
    
    // Remove duplicates and sort
    const uniqueHours = [...new Set(newHours)].sort((a, b) => a - b);
    
    SCHEDULED_HOURS = uniqueHours;
    
    console.log(`Provider API Scheduler: Updated scheduled hours to ${SCHEDULED_HOURS.join(':00, ')}:00 UTC`);
    
    return {
      success: true,
      message: `Scheduled hours updated to: ${SCHEDULED_HOURS.join(':00, ')}:00 UTC`
    };
    
  } catch (error) {
    console.error('Error updating scheduled hours:', error);
    return {
      success: false,
      message: 'Failed to update scheduled hours'
    };
  }
}

/**
 * Manually trigger a collection cycle (for admin testing)
 */
export async function manualTriggerCollection(): Promise<{
  success: boolean;
  message: string;
  result?: CollectionResult;
}> {
  try {
    console.log('Manual collection cycle triggered by admin');
    
    const result = await runCollectionCycle();
    
    // Update tracking (but don't mark as scheduled run)
    lastRunTimestamp = new Date();
    
    return {
      success: true,
      message: `Manual collection completed: ${result.successful} successful, ${result.failed} failed`,
      result
    };
    
  } catch (error) {
    console.error('Error during manual collection:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}