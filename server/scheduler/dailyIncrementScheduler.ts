/**
 * Daily Increment Scheduler
 * Automated daily collection of current rates using Alpha Vantage API
 * Runs once per day to add new data points without touching historical data
 */

import { runDailyIncrementCollection, shouldRunDailyCollection } from '../services/dailyIncrementService';

let lastRunDate: string | null = null;
let schedulerActive = false;

/**
 * Check if it's time to run daily collection
 */
function shouldRunNow(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];
  
  // Run at 3:00 AM UTC daily (after market close, before most business hours)
  const isScheduledTime = currentHour === 3;
  const hasNotRunToday = lastRunDate !== currentDate;
  
  return isScheduledTime && hasNotRunToday;
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
  console.log('Daily increments scheduled for 3:00 AM UTC');
  
  // Check every 10 minutes for the scheduled time
  const intervalMinutes = 10;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const interval = setInterval(async () => {
    if (shouldRunNow()) {
      console.log('Daily increment collection time reached...');
      
      try {
        // Double-check if collection should run (prevents duplicate runs)
        const shouldRun = await shouldRunDailyCollection();
        
        if (shouldRun) {
          console.log('Starting automated daily increment collection...');
          
          const result = await runDailyIncrementCollection();
          lastRunDate = new Date().toISOString().split('T')[0];
          
          console.log(`Daily increment collection completed: ${result.successful}/${result.totalProcessed} successful`);
          
          if (result.failed > 0) {
            console.warn(`${result.failed} pairs failed during daily collection`);
          }
        } else {
          console.log('Daily collection already completed for today');
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
  
  // Return cleanup function
  return () => {
    clearInterval(interval);
    schedulerActive = false;
    console.log('Daily increment scheduler stopped');
  };
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
} {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(3, 0, 0, 0);
  
  return {
    active: schedulerActive,
    lastRunDate,
    nextScheduledTime: tomorrow.toISOString()
  };
}