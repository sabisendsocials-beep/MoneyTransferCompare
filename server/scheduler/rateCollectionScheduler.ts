/**
 * Rate Collection Scheduler
 * 
 * Implements automatic scheduled collection of exchange rates
 * from all configured data sources (APIs, web scrapers) at set times
 * throughout the day.
 */

import { collectRatesFromAllSources } from '../services/dataSourceService';

// Define collection schedule times (24-hour format)
// Times are in UTC, so adjust for target markets as needed
const COLLECTION_TIMES = [
  { hour: 6, minute: 0 },   // 6:00 AM 
  { hour: 14, minute: 0 },  // 2:00 PM
  { hour: 22, minute: 0 }   // 10:00 PM
];

/**
 * Checks if the current time matches a scheduled collection time
 * @returns boolean indicating if collection should run now
 */
function isScheduledCollectionTime(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Check if current time matches any scheduled time (within 5 minute window)
  return COLLECTION_TIMES.some(time => {
    return currentHour === time.hour && 
           Math.abs(currentMinute - time.minute) <= 5;
  });
}

/**
 * Initializes the rate collection scheduler
 * Checks every 5 minutes if a collection should be triggered
 */
export function initializeRateCollectionScheduler(): void {
  console.log('Initializing rate collection scheduler...');
  console.log('Collection times scheduled for:');
  COLLECTION_TIMES.forEach(time => {
    console.log(`- ${time.hour}:${time.minute.toString().padStart(2, '0')} UTC`);
  });
  
  // Check every 5 minutes if we should run a collection
  const intervalMinutes = 5;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  setInterval(async () => {
    if (isScheduledCollectionTime()) {
      console.log('Scheduled collection time reached, starting rate collection...');
      
      try {
        const success = await collectRatesFromAllSources();
        if (success) {
          console.log('Scheduled rate collection completed successfully');
        } else {
          console.error('Scheduled rate collection completed with errors');
        }
      } catch (error) {
        console.error('Error during scheduled rate collection:', error);
      }
    }
  }, intervalMs);
  
  console.log(`Rate collection scheduler initialized (checking every ${intervalMinutes} minutes)`);
}