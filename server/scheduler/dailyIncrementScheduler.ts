/**
 * Daily Increment Scheduler
 * Automated collection of current rates using Alpha Vantage API
 * Runs 5 times per day at 3am, 9am, 12pm, 3pm, and 6pm UTC
 */

import { runDailyIncrementCollection, shouldRunDailyCollection } from '../services/dailyIncrementService';

let lastRunHours: Set<number> = new Set();
let schedulerActive = false;
let lastRunDate: string | null = null;
let lastRunTimestamp: Date | null = null;
let totalSuccessful = 0;
let totalFailed = 0;

// Scheduled hours (UTC): 3am, 9am, 12pm, 3pm, 6pm
let SCHEDULED_HOURS = [3, 9, 12, 15, 18];

// Collection results for the current day
interface DailyCollectionResult {
  hour: number;
  timestamp: Date;
  successful: number;
  failed: number;
  totalProcessed: number;
  details: {
    fromCurrency: string;
    toCurrency: string;
    success: boolean;
    error?: string;
    rateCollected?: number;
  }[];
}

let dailyResults: DailyCollectionResult[] = [];

/**
 * Check if it's time to run daily collection
 */
function shouldRunNow(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];
  
  // Reset tracking if it's a new day
  if (lastRunDate !== currentDate) {
    lastRunHours.clear();
    lastRunDate = currentDate;
  }
  
  // Check if current hour is a scheduled time and hasn't run yet this hour
  const isScheduledTime = SCHEDULED_HOURS.includes(currentHour);
  const hasNotRunThisHour = !lastRunHours.has(currentHour);
  
  return isScheduledTime && hasNotRunThisHour;
}

/**
 * Check for missed scheduled runs and execute immediately
 */
async function checkAndRunMissedDailyIncrements(): Promise<void> {
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
    console.log(`📊 Found ${missedHours.length} missed daily increment run(s): ${missedHours.join(':00, ')}:00 UTC`);
    console.log(`Current time: ${currentHour}:${now.getMinutes().toString().padStart(2, '0')} UTC`);
    
    // Run immediately for the most recent missed hour
    const mostRecentMissedHour = Math.max(...missedHours);
    console.log(`📊 Executing missed daily increment collection for ${mostRecentMissedHour}:00 UTC...`);
    
    try {
      const shouldRun = await shouldRunDailyCollection();
      
      if (shouldRun) {
        console.log('Starting missed daily increment collection...');
        
        const result = await runDailyIncrementCollection();
        
        // Mark this hour as completed and track results
        lastRunHours.add(mostRecentMissedHour);
        lastRunDate = currentDate;
        lastRunTimestamp = new Date();
        
        // Store collection results
        const collectionResult: DailyCollectionResult = {
          hour: mostRecentMissedHour,
          timestamp: new Date(),
          successful: result.successful || 0,
          failed: result.failed || 0,
          totalProcessed: result.totalProcessed || 0,
          details: (result.results || []).map((r: any) => ({
            fromCurrency: r.pair.split('/')[0],
            toCurrency: r.pair.split('/')[1],
            success: r.success,
            error: r.success ? undefined : r.message,
            rateCollected: r.success ? 1 : undefined
          }))
        };
        
        dailyResults.push(collectionResult);
        totalSuccessful += collectionResult.successful;
        totalFailed += collectionResult.failed;
        
        console.log(`📊 Missed daily increment collection completed for ${mostRecentMissedHour}:00 UTC: ${result.successful}/${result.totalProcessed} successful`);
        
        if (result.failed > 0) {
          console.warn(`${result.failed} pairs failed during missed daily collection`);
        }
      } else {
        console.log(`Daily collection already completed for ${mostRecentMissedHour}:00 UTC`);
        lastRunHours.add(mostRecentMissedHour);
        lastRunDate = currentDate;
      }
      
    } catch (error) {
      console.error('Error during missed daily increment collection:', error);
      
      // Still mark as attempted to prevent retries
      lastRunHours.add(mostRecentMissedHour);
      lastRunDate = currentDate;
      lastRunTimestamp = new Date();
    }
  }
}

/**
 * Initialize the daily increment scheduler
 */
export async function initializeDailyIncrementScheduler(): Promise<void> {
  if (schedulerActive) {
    console.log('Daily increment scheduler already active');
    return;
  }
  
  console.log('Initializing daily increment scheduler...');
  console.log('Daily increments scheduled for 3am, 9am, 12pm, 3pm, and 6pm UTC');
  
  // Check for missed schedules immediately on startup
  await checkAndRunMissedDailyIncrements();
  
  // Check every 30 minutes for any new missed schedules
  const intervalMinutes = 30;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const interval = setInterval(async () => {
    await checkAndRunMissedDailyIncrements();
  }, intervalMs);
  
  schedulerActive = true;
  
  console.log(`Daily increment scheduler initialized (checking every ${intervalMinutes} minutes for missed runs)`);
  console.log('Scheduler will execute immediately if scheduled time has passed and not run yet');
  console.log('Scheduler will add new daily data points without affecting historical Alpha Vantage data');
  console.log(`Next scheduled times: ${SCHEDULED_HOURS.join(':00, ')}:00 UTC`);
  
  // Cleanup function (not returned since this is async void)
  const cleanup = () => {
    clearInterval(interval);
    schedulerActive = false;
    console.log('Daily increment scheduler stopped');
  };
  
  // Store cleanup function for potential future use
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

/**
 * Get scheduler status for admin dashboard
 */
export function getDailyIncrementSchedulerStatus(): {
  active: boolean;
  lastRunDate: string | null;
  lastRunTimestamp: string | null;
  nextScheduledTime: string;
  scheduledHours: number[];
  completedHoursToday: number[];
  remainingHoursToday: number[];
  totalSuccessfulToday: number;
  totalFailedToday: number;
  dailyResults: DailyCollectionResult[];
} {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];
  
  // Reset tracking if it's a new day
  if (lastRunDate !== currentDate) {
    lastRunHours.clear();
    totalSuccessful = 0;
    totalFailed = 0;
    dailyResults.length = 0;
  }
  
  // Calculate next scheduled time
  const nextHour = SCHEDULED_HOURS.find(hour => hour > currentHour) || SCHEDULED_HOURS[0];
  const nextScheduledTime = new Date();
  if (nextHour <= currentHour) {
    nextScheduledTime.setDate(nextScheduledTime.getDate() + 1);
  }
  nextScheduledTime.setHours(nextHour, 0, 0, 0);
  
  return {
    active: schedulerActive,
    lastRunDate,
    lastRunTimestamp: lastRunTimestamp?.toISOString() || null,
    nextScheduledTime: nextScheduledTime.toISOString(),
    scheduledHours: [...SCHEDULED_HOURS],
    completedHoursToday: Array.from(lastRunHours).sort((a, b) => a - b),
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
export function updateDailyIncrementScheduledHours(newHours: number[]): {
  success: boolean;
  message: string;
} {
  try {
    // Validate hours
    for (const hour of newHours) {
      if (typeof hour !== 'number' || hour < 0 || hour > 23) {
        return {
          success: false,
          message: `Invalid hour: ${hour}. Hours must be between 0-23.`
        };
      }
    }
    
    // Remove duplicates and sort
    const uniqueHours = Array.from(new Set(newHours)).sort((a, b) => a - b);
    
    SCHEDULED_HOURS = uniqueHours;
    
    console.log(`Daily Increment Scheduler: Updated scheduled hours to ${SCHEDULED_HOURS.join(':00, ')}:00 UTC`);
    
    return {
      success: true,
      message: `Schedule updated to ${uniqueHours.length} collection times: ${uniqueHours.join(':00, ')}:00 UTC`
    };
  } catch (error) {
    console.error('Error updating daily increment scheduled hours:', error);
    return {
      success: false,
      message: 'Failed to update schedule'
    };
  }
}

/**
 * Manually trigger a daily increment collection (for admin testing)
 */
export async function manualTriggerDailyIncrement(): Promise<{
  success: boolean;
  message: string;
  result?: DailyCollectionResult;
}> {
  try {
    console.log('Manual daily increment collection triggered from admin panel');
    
    const result = await runDailyIncrementCollection();
    const currentHour = new Date().getHours();
    
    // Create collection result
    const collectionResult: DailyCollectionResult = {
      hour: currentHour,
      timestamp: new Date(),
      successful: result.successful || 0,
      failed: result.failed || 0,
      totalProcessed: result.totalProcessed || 0,
      details: (result.results || []).map((r: any) => ({
        fromCurrency: r.pair.split('/')[0],
        toCurrency: r.pair.split('/')[1], 
        success: r.success,
        error: r.success ? undefined : r.message,
        rateCollected: r.success ? 1 : undefined
      }))
    };
    
    // Update tracking
    lastRunTimestamp = new Date();
    lastRunDate = new Date().toISOString().split('T')[0];
    dailyResults.push(collectionResult);
    totalSuccessful += collectionResult.successful;
    totalFailed += collectionResult.failed;
    
    return {
      success: true,
      message: `Manual collection completed: ${collectionResult.successful}/${collectionResult.totalProcessed} successful`,
      result: collectionResult
    };
  } catch (error) {
    console.error('Error during manual daily increment trigger:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Manual trigger failed'
    };
  }
}

/**
 * Manual trigger for daily increment collection (admin use)
 */
export async function triggerDailyIncrementCollection(): Promise<{
  success: boolean;
  message: string;
  totalProcessed: number;
  successful: number;
  failed: number;
}> {
  console.log('Manual trigger: Starting daily increment collection...');
  
  try {
    const result = await runDailyIncrementCollection();
    lastRunDate = new Date().toISOString().split('T')[0];
    
    return {
      success: result.failed === 0,
      message: `Daily increment collection completed: ${result.successful}/${result.totalProcessed} successful`,
      totalProcessed: result.totalProcessed,
      successful: result.successful,
      failed: result.failed
    };
    
  } catch (error) {
    console.error('Error during manual daily increment collection:', error);
    return {
      success: false,
      message: `Daily increment collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      totalProcessed: 0,
      successful: 0,
      failed: 0
    };
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  active: boolean;
  lastRunDate: string | null;
  nextScheduledTime: string;
  completedHoursToday: number[];
  remainingHoursToday: number[];
} {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];
  
  // Reset tracking if it's a new day
  if (lastRunDate !== currentDate) {
    lastRunHours.clear();
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
    nextScheduledTime: nextScheduledTime.toISOString(),
    completedHoursToday: Array.from(lastRunHours).sort(),
    remainingHoursToday: SCHEDULED_HOURS.filter(hour => 
      hour >= currentHour && !lastRunHours.has(hour)
    )
  };
}