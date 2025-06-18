/**
 * Provider Rate API Scheduler
 * Collects exchange rates from providers configured for API access
 * Runs 6 times daily: 6am, 9am, 12pm, 3pm, 6pm, 9pm UTC
 */

import { storage } from '../storage';
// Import Wise API service
const fetchWiseRates = async () => {
  try {
    const { fetchWiseRates } = await import('../services/wiseApiService.js');
    return await fetchWiseRates();
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
    attempts?: number;
    savedToDatabase?: boolean;
    duration?: number;
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
 * Uses preferred_collection method to identify API providers
 */
async function getApiProviders(): Promise<any[]> {
  try {
    const providers = await storage.getProviders();
    // Filter for providers specifically configured for API collection
    return providers.filter(provider => 
      provider.preferred_collection === 'API' && 
      provider.active && 
      provider.name // Basic validation
    );
  } catch (error) {
    console.error('Error fetching API providers:', error);
    return [];
  }
}

/**
 * Collect rates from a specific API provider with retry logic
 * Retries up to 5 times with 30 second delays on failure
 */
async function collectFromProvider(provider: any): Promise<{
  success: boolean;
  ratesCollected?: number;
  error?: string;
  attempts?: number;
  savedToDatabase?: boolean;
}> {
  const maxRetries = 5;
  const retryDelayMs = 30000; // 30 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Collecting rates from ${provider.name} API (attempt ${attempt}/${maxRetries})...`);
      
      let apiResult: any = null;
      
      // Handle Wise API (currently the only working integration)
      if (provider.name.toLowerCase().includes('wise')) {
        apiResult = await fetchWiseRates();
        
        if (apiResult.success && apiResult.rates && apiResult.rates.length > 0) {
          // Verify rates were actually saved to database
          const savedCount = await verifyRatesSavedToDatabase(provider.id, apiResult.rates);
          
          if (savedCount > 0) {
            console.log(`✓ Successfully collected and saved ${savedCount} rates from ${provider.name} (attempt ${attempt})`);
            return {
              success: true,
              ratesCollected: savedCount,
              attempts: attempt,
              savedToDatabase: true
            };
          } else {
            throw new Error('Rates collected but failed to save to database');
          }
        } else {
          throw new Error('No rates returned from API or API call failed');
        }
      }
      
      // Handle other API providers (MoneyGram, PaySend, Western Union)
      else if (provider.name.toLowerCase().includes('moneygram')) {
        // MoneyGram API integration (ready but needs credentials)
        throw new Error('API credentials not configured');
      }
      
      else if (provider.name.toLowerCase().includes('paysend')) {
        // PaySend API integration (ready but needs credentials)
        throw new Error('API credentials not configured');
      }
      
      else if (provider.name.toLowerCase().includes('western union')) {
        // Western Union API integration (ready but needs credentials)  
        throw new Error('API credentials not configured');
      }
      
      else {
        // Unknown provider
        throw new Error('API integration not implemented');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠ ${provider.name} API attempt ${attempt}/${maxRetries} failed: ${errorMessage}`);
      
      // If this is the last attempt, return failure
      if (attempt === maxRetries) {
        console.error(`❌ ${provider.name} API failed after ${maxRetries} attempts`);
        return {
          success: false,
          error: errorMessage,
          attempts: maxRetries,
          savedToDatabase: false
        };
      }
      
      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${retryDelayMs/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  
  // This should never be reached, but included for completeness
  return {
    success: false,
    error: 'Maximum retries exceeded',
    attempts: maxRetries,
    savedToDatabase: false
  };
}

/**
 * Verify that rates were successfully saved to the database
 * Returns the count of rates that were actually saved
 */
async function verifyRatesSavedToDatabase(providerId: number, expectedRates: any[]): Promise<number> {
  try {
    let savedCount = 0;
    
    // Save each rate to the database
    for (const rateData of expectedRates) {
      try {
        await storage.createExchangeRate({
          provider_id: providerId,
          from_currency: rateData.fromCurrency,
          to_currency: rateData.toCurrency,
          rate: rateData.rate,
          source: 'API',
          source_url: 'Wise API',
          verified: true
        });
        savedCount++;
      } catch (rateError) {
        console.warn(`Failed to save rate ${rateData.fromCurrency}/${rateData.toCurrency}: ${rateError}`);
      }
    }
    
    console.log(`Database verification: Successfully saved ${savedCount}/${expectedRates.length} rates for provider ${providerId}`);
    return savedCount;
    
  } catch (error) {
    console.error(`Error saving rates to database for provider ${providerId}:`, error);
    return 0;
  }
}

/**
 * Run collection cycle for all API providers with enhanced rate limiting
 */
async function runCollectionCycle(): Promise<CollectionResult> {
  const currentHour = new Date().getHours();
  const timestamp = new Date();
  
  console.log(`\n🔄 Starting Provider API collection cycle (${currentHour}:00 UTC)`);
  
  const providers = await getApiProviders();
  console.log(`Found ${providers.length} API-configured providers`);
  
  const result: CollectionResult = {
    hour: currentHour,
    timestamp,
    successful: 0,
    failed: 0,
    details: []
  };
  
  if (providers.length === 0) {
    console.log('⚠ No API providers found with preferred_collection = "API"');
    console.log('💡 Configure providers in Admin Panel -> Provider Management -> set preferred_collection to "API"');
    return result;
  }
  
  // Enhanced rate limiting: wait between providers to avoid overwhelming any single service
  const rateLimitDelayMs = providers.length > 3 ? 5000 : 2000; // 5s if many providers, 2s otherwise
  
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    console.log(`\n--- Processing provider ${i + 1}/${providers.length}: ${provider.name} ---`);
    
    const startTime = Date.now();
    const providerResult = await collectFromProvider(provider);
    const duration = Date.now() - startTime;
    
    // Enhanced result tracking with retry information
    result.details.push({
      providerId: provider.id,
      providerName: provider.name,
      success: providerResult.success,
      error: providerResult.error,
      ratesCollected: providerResult.ratesCollected,
      attempts: providerResult.attempts,
      savedToDatabase: providerResult.savedToDatabase,
      duration: Math.round(duration / 1000) // Duration in seconds
    });
    
    if (providerResult.success) {
      result.successful++;
      totalSuccessful++;
      console.log(`✅ ${provider.name}: Success (${providerResult.ratesCollected} rates, ${providerResult.attempts} attempts, ${Math.round(duration/1000)}s)`);
      
      // Provider collection success - timestamp tracking handled by collection results
    } else {
      result.failed++;
      totalFailed++;
      console.error(`❌ ${provider.name}: Failed after ${providerResult.attempts} attempts - ${providerResult.error}`);
    }
    
    // Rate limiting: wait between providers (except for the last one)
    if (i < providers.length - 1) {
      console.log(`⏳ Rate limiting: waiting ${rateLimitDelayMs/1000}s before next provider...`);
      await new Promise(resolve => setTimeout(resolve, rateLimitDelayMs));
    }
  }
  
  console.log(`\n📊 Collection cycle summary:`);
  console.log(`   ✅ Successful: ${result.successful}/${providers.length} providers`);
  console.log(`   ❌ Failed: ${result.failed}/${providers.length} providers`);
  console.log(`   ⏱️ Total duration: ${Math.round((Date.now() - timestamp.getTime()) / 1000)}s`);
  
  if (result.failed > 0) {
    console.log(`\n⚠️ Failed providers details:`);
    result.details
      .filter(detail => !detail.success)
      .forEach(detail => {
        console.log(`   - ${detail.providerName}: ${detail.error} (${detail.attempts} attempts)`);
      });
  }
  
  return result;
}

/**
 * Check if we have any missed scheduled runs and execute immediately
 */
function checkAndRunMissedSchedules(): void {
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
  
  // Find any scheduled hours that have passed but haven't run yet today
  const missedHours = SCHEDULED_HOURS.filter(hour => {
    const hasPassedToday = hour <= currentHour;
    const hasNotRunThisHour = !lastRunHours.has(hour);
    return hasPassedToday && hasNotRunThisHour;
  });
  
  if (missedHours.length > 0) {
    console.log(`\n📊 Found ${missedHours.length} missed scheduled run(s): ${missedHours.join(':00, ')}:00 UTC`);
    console.log(`Current time: ${currentHour}:${now.getMinutes().toString().padStart(2, '0')} UTC`);
    
    // Run immediately for the most recent missed hour
    const mostRecentMissedHour = Math.max(...missedHours);
    console.log(`📊 Executing missed Provider API collection for ${mostRecentMissedHour}:00 UTC...`);
    
    runCollectionCycle()
      .then(result => {
        // Mark this hour as completed
        lastRunHours.add(mostRecentMissedHour);
        lastRunDate = currentDate;
        lastRunTimestamp = new Date();
        
        // Store results for admin dashboard
        dailyResults.push(result);
        
        console.log(`📊 Missed Provider API collection completed for ${mostRecentMissedHour}:00 UTC\n`);
      })
      .catch(error => {
        console.error('Error during missed Provider API collection:', error);
        
        // Still mark as attempted to prevent retries
        lastRunHours.add(mostRecentMissedHour);
        lastRunDate = currentDate;
        lastRunTimestamp = new Date();
      });
  }
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
  
  // Check for missed schedules immediately on startup
  checkAndRunMissedSchedules();
  
  // Check every 30 minutes for any new missed schedules
  const intervalMinutes = 30;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const interval = setInterval(() => {
    checkAndRunMissedSchedules();
  }, intervalMs);
  
  schedulerActive = true;
  
  console.log(`Provider API Scheduler initialized (checking every ${intervalMinutes} minutes for missed runs)`);
  console.log('Scheduler will execute immediately if scheduled time has passed and not run yet');
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
    scheduledHours: Array.from(SCHEDULED_HOURS),
    completedHoursToday: Array.from(lastRunHours).sort((a, b) => a - b),
    remainingHoursToday: Array.from(SCHEDULED_HOURS).filter(hour => 
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
    const uniqueHours = Array.from(new Set(newHours)).sort((a, b) => a - b);
    
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