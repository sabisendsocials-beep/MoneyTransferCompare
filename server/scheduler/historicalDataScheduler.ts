/**
 * Historical Data Scheduler
 * Daily updates for all 15 currency corridors using real exchange rate API data
 * Runs daily to keep historical data current and complete
 */

import { updateAllHistoricalData, populateInitialHistoricalData } from '../services/historicalDataService';

// Schedule for daily historical data updates
const DAILY_UPDATE_TIME = { hour: 2, minute: 0 }; // 2:00 AM UTC daily

let lastUpdateDate: string | null = null;

/**
 * Checks if a daily update should run
 */
function shouldRunDailyUpdate(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDate = now.toISOString().split('T')[0];
  
  // Check if current time matches scheduled time (within 10 minute window)
  const isScheduledTime = currentHour === DAILY_UPDATE_TIME.hour && 
                         Math.abs(currentMinute - DAILY_UPDATE_TIME.minute) <= 10;
  
  // Only run once per day
  const hasNotRunToday = lastUpdateDate !== currentDate;
  
  return isScheduledTime && hasNotRunToday;
}

/**
 * Initializes the historical data scheduler
 * Runs initial population if needed, then schedules daily updates
 */
export async function initializeHistoricalDataScheduler(): Promise<void> {
  console.log('Initializing historical data scheduler...');
  console.log(`Daily updates scheduled for ${DAILY_UPDATE_TIME.hour}:${DAILY_UPDATE_TIME.minute.toString().padStart(2, '0')} UTC`);
  
  // Run initial population on startup (only populates missing data)
  try {
    console.log('Running initial historical data check...');
    await populateInitialHistoricalData();
  } catch (error) {
    console.error('Error during initial historical data population:', error);
  }
  
  // Check every 10 minutes for daily update time
  const intervalMinutes = 10;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  setInterval(async () => {
    if (shouldRunDailyUpdate()) {
      console.log('Daily historical data update time reached...');
      
      try {
        await updateAllHistoricalData();
        lastUpdateDate = new Date().toISOString().split('T')[0];
        console.log('Daily historical data update completed successfully');
      } catch (error) {
        console.error('Error during daily historical data update:', error);
      }
    }
  }, intervalMs);
  
  console.log(`Historical data scheduler initialized (checking every ${intervalMinutes} minutes)`);
}

/**
 * Manual trigger for historical data update (for admin use)
 */
export async function triggerHistoricalDataUpdate(): Promise<void> {
  console.log('Manual trigger: Starting historical data update...');
  
  try {
    await updateAllHistoricalData();
    lastUpdateDate = new Date().toISOString().split('T')[0];
    console.log('Manual historical data update completed successfully');
  } catch (error) {
    console.error('Error during manual historical data update:', error);
    throw error;
  }
}