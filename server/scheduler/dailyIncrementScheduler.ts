/**
 * Daily Increment Scheduler
 * Automated collection of current rates using Alpha Vantage API
 * Runs 5 times per day at 3am, 9am, 12pm, 3pm, and 6pm UTC
 */

import { runDailyIncrementCollection, shouldRunDailyCollection } from '../services/dailyIncrementService';

let lastRunHours: Set<number> = new Set();
let schedulerActive = false;
let lastRunDate: string | null = null;

// Scheduled hours (UTC): 3am, 9am, 12pm, 3pm, 6pm
const SCHEDULED_HOURS = [3, 9, 12, 15, 18];

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
 * Initialize the daily increment scheduler
 */
export async function initializeDailyIncrementScheduler(): Promise<void> {
  if (schedulerActive) {
    console.log('Daily increment scheduler already active');
    return;
  }
  
  console.log('Initializing daily increment scheduler...');
  console.log('Daily increments scheduled for 3am, 9am, 12pm, 3pm, and 6pm UTC');
  
  // Check every 10 minutes for the scheduled times
  const intervalMinutes = 10;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const interval = setInterval(async () => {
    if (shouldRunNow()) {
      const currentHour = new Date().getHours();
      console.log(`Daily increment collection time reached (${currentHour}:00 UTC)...`);
      
      try {
        // Double-check if collection should run (prevents duplicate runs)
        const shouldRun = await shouldRunDailyCollection();
        
        if (shouldRun) {
          console.log('Starting automated daily increment collection...');
          
          const result = await runDailyIncrementCollection();
          
          // Mark this hour as completed
          lastRunHours.add(currentHour);
          lastRunDate = new Date().toISOString().split('T')[0];
          
          console.log(`Daily increment collection completed at ${currentHour}:00 UTC: ${result.successful}/${result.totalProcessed} successful`);
          
          if (result.failed > 0) {
            console.warn(`${result.failed} pairs failed during daily collection`);
          }
        } else {
          console.log(`Daily collection already completed for ${currentHour}:00 UTC`);
          lastRunHours.add(currentHour);
          lastRunDate = new Date().toISOString().split('T')[0];
        }
        
      } catch (error) {
        console.error('Error during automated daily increment collection:', error);
      }
    }
  }, intervalMs);
  
  schedulerActive = true;
  
  console.log(`Daily increment scheduler initialized (checking every ${intervalMinutes} minutes)`);
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