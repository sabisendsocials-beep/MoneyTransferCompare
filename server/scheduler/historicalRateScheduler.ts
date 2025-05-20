/**
 * Historical Exchange Rate Data Scheduler
 * 
 * This module schedules automatic updates of historical exchange rate data
 * using real data from ExchangeRate-API.
 */

import { updateHistoricalRatesIfNeeded } from '../services/historicalRatesService';
import { log } from '../vite';

// Update intervals (3 times a day, matching rate collection schedule)
const UPDATE_HOURS = [6, 14, 22]; // 6 AM, 2 PM, 10 PM UTC

/**
 * Set up a scheduled task to run at specific hours of the day
 */
function scheduleHistoricalRateUpdates(): void {
  log('Setting up historical rate update schedule...');
  log(`Historical rate updates scheduled for ${UPDATE_HOURS.join(', ')} UTC`);
  
  // Track which hours we've already run today
  const runTracker = new Map<number, boolean>();
  UPDATE_HOURS.forEach(hour => runTracker.set(hour, false));
  
  // Check every 5 minutes if we should run an update
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  setInterval(async () => {
    const now = new Date();
    const currentHour = now.getUTCHours();
    
    // Reset the tracker at the start of a new day
    if (currentHour === 0 && now.getUTCMinutes() < 5) {
      log('New day started, resetting historical rate update schedule');
      UPDATE_HOURS.forEach(hour => runTracker.set(hour, false));
    }
    
    // Check if we need to run an update
    if (UPDATE_HOURS.includes(currentHour) && !runTracker.get(currentHour)) {
      log(`Running scheduled historical rate update at ${currentHour}:00 UTC`);
      
      try {
        // Mark this hour as run
        runTracker.set(currentHour, true);
        
        // Update historical rates if needed
        await updateHistoricalRatesIfNeeded();
        
        log('Scheduled historical rate update completed successfully');
      } catch (error) {
        log(`Error in scheduled historical rate update: ${error}`);
      }
    }
  }, CHECK_INTERVAL);
  
  log('Historical rate update scheduler initialized successfully');
}

export { scheduleHistoricalRateUpdates };