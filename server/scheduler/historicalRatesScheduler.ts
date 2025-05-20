/**
 * Historical Rates Scheduler
 * 
 * This module sets up scheduled updates of historical exchange rate data.
 * We fetch and store historical rates 3 times per day on a similar schedule to rate updates.
 */

import { updateRecentHistoricalRates } from '../services/historicalRatesService';

/**
 * Set up a scheduled task to run at specific times of day
 * @param task - The task to run
 * @param hours - The hours to run the task (0-23)
 */
function scheduleTaskAtHours(task: () => Promise<void>, hours: number[]): void {
  const checkInterval = 5 * 60 * 1000; // Check every 5 minutes
  
  // Keep track of which hours we've already run for today
  const runTracker = new Map<number, boolean>();
  
  // Initialize tracker with all hours marked as not run
  hours.forEach(hour => runTracker.set(hour, false));
  
  console.log(`Historical rate update scheduled at hours: ${hours.join(', ')} UTC`);
  
  // Set up the interval to check if we should run
  setInterval(() => {
    const now = new Date();
    const currentHour = now.getUTCHours();
    
    // Check if we're at or past one of the scheduled hours and haven't run for it yet today
    if (hours.includes(currentHour) && !runTracker.get(currentHour)) {
      // Mark this hour as run
      runTracker.set(currentHour, true);
      
      // Run the task
      console.log(`Running scheduled historical rate update at ${currentHour}:00 UTC`);
      task().catch(error => {
        console.error(`Error in scheduled historical rate update: ${error}`);
      });
    }
    
    // Reset the tracker at the start of a new day (midnight UTC)
    if (currentHour === 0 && now.getUTCMinutes() < 5) {
      console.log('Resetting historical rate update schedule for the new day');
      hours.forEach(hour => runTracker.set(hour, false));
    }
  }, checkInterval);
}

/**
 * Initialize the historical rates scheduler
 */
export function initializeHistoricalRatesScheduler(): void {
  console.log('Setting up historical rates scheduler...');
  
  // Schedule historical rate updates at the same times as regular rate updates (6, 14, 22 UTC)
  const updateHours = [6, 14, 22];
  
  // Define the task to run at scheduled times
  const updateTask = async (): Promise<void> => {
    try {
      console.log('Running scheduled historical rate update...');
      
      // Only update recent data (last 5 days) for incremental updates
      await updateRecentHistoricalRates(5);
      
      console.log('Scheduled historical rate update completed successfully');
    } catch (error) {
      console.error(`Error in scheduled historical rate update: ${error}`);
    }
  };
  
  // Schedule the task
  scheduleTaskAtHours(updateTask, updateHours);
  
  console.log('Historical rates scheduler initialized successfully');
}