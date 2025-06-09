/**
 * Rate Alert Scheduler
 * Hourly cron job to check and trigger rate alerts
 * Runs every hour (e.g., 08:00, 09:00, 10:00...)
 */

import { 
  getPendingAlerts, 
  checkAlertTrigger, 
  markAlertTriggered 
} from '../services/rateAlertService';
import { sendRateAlertEmail } from '../services/alertNotificationService';

let schedulerActive = false;
let lastRunHour: number | null = null;

/**
 * Check if it's time to run hourly alert checks
 */
function shouldRunHourlyCheck(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Run at the top of every hour, but only once per hour
  const isTopOfHour = now.getMinutes() < 10; // Within first 10 minutes of the hour
  const hasNotRunThisHour = lastRunHour !== currentHour;
  
  return isTopOfHour && hasNotRunThisHour;
}

/**
 * Process a single rate alert
 */
async function processAlert(alert: any): Promise<void> {
  try {
    console.log(`Checking alert ${alert.id}: ${alert.from_currency}/${alert.to_currency} for ${alert.email}`);
    
    const triggerCheck = await checkAlertTrigger(alert);
    
    if (triggerCheck.shouldTrigger && triggerCheck.currentRate !== null) {
      console.log(`Alert ${alert.id} triggered: Current rate ${triggerCheck.currentRate} >= Target ${triggerCheck.targetRate}`);
      
      // Send email notification
      const emailResult = await sendRateAlertEmail({
        alert,
        currentRate: triggerCheck.currentRate,
        targetRate: triggerCheck.targetRate,
        providerName: triggerCheck.providerName,
      });
      
      if (emailResult.success) {
        // Mark alert as triggered
        await markAlertTriggered(alert.id);
        console.log(`Alert ${alert.id} processed successfully: Email sent and status updated`);
      } else {
        console.error(`Alert ${alert.id}: Email failed - ${emailResult.error}`);
      }
    } else {
      console.log(`Alert ${alert.id}: Not triggered (Current: ${triggerCheck.currentRate}, Target: ${triggerCheck.targetRate})`);
    }
    
  } catch (error) {
    console.error(`Error processing alert ${alert.id}:`, error);
  }
}

/**
 * Run hourly rate alert check
 */
async function runHourlyAlertCheck(): Promise<void> {
  console.log('Starting hourly rate alert check...');
  
  try {
    // Get all pending alerts
    const pendingAlerts = await getPendingAlerts();
    
    if (pendingAlerts.length === 0) {
      console.log('No pending rate alerts to check');
      return;
    }
    
    console.log(`Checking ${pendingAlerts.length} pending rate alerts...`);
    
    let triggeredCount = 0;
    let errorCount = 0;
    
    // Process alerts sequentially to avoid overwhelming the system
    for (const alert of pendingAlerts) {
      try {
        const triggerCheck = await checkAlertTrigger(alert);
        
        if (triggerCheck.shouldTrigger && triggerCheck.currentRate !== null) {
          await processAlert(alert);
          triggeredCount++;
          
          // Small delay between triggered alerts to avoid email rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Hourly alert check completed: ${triggeredCount} triggered, ${errorCount} errors`);
    
  } catch (error) {
    console.error('Error during hourly alert check:', error);
  }
}

/**
 * Initialize the rate alert scheduler
 */
export async function initializeRateAlertScheduler(): Promise<void> {
  if (schedulerActive) {
    console.log('Rate alert scheduler already active');
    return;
  }
  
  console.log('Initializing rate alert scheduler...');
  console.log('Rate alerts will be checked every hour at the top of the hour');
  
  // Check every 5 minutes for the hourly trigger
  const intervalMinutes = 5;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const interval = setInterval(async () => {
    if (shouldRunHourlyCheck()) {
      console.log('Hourly rate alert check time reached...');
      lastRunHour = new Date().getHours();
      
      try {
        await runHourlyAlertCheck();
      } catch (error) {
        console.error('Error during scheduled rate alert check:', error);
      }
    }
  }, intervalMs);
  
  schedulerActive = true;
  
  console.log(`Rate alert scheduler initialized (checking every ${intervalMinutes} minutes for hourly triggers)`);
  
  // Return cleanup function
  return () => {
    clearInterval(interval);
    schedulerActive = false;
    console.log('Rate alert scheduler stopped');
  };
}

/**
 * Manual trigger for rate alert check (admin use)
 */
export async function triggerRateAlertCheck(): Promise<{
  success: boolean;
  message: string;
  pendingCount: number;
  triggeredCount: number;
  errorCount: number;
}> {
  console.log('Manual trigger: Starting rate alert check...');
  
  try {
    const pendingAlerts = await getPendingAlerts();
    
    if (pendingAlerts.length === 0) {
      return {
        success: true,
        message: 'No pending rate alerts to check',
        pendingCount: 0,
        triggeredCount: 0,
        errorCount: 0,
      };
    }
    
    let triggeredCount = 0;
    let errorCount = 0;
    
    for (const alert of pendingAlerts) {
      try {
        const triggerCheck = await checkAlertTrigger(alert);
        
        if (triggerCheck.shouldTrigger && triggerCheck.currentRate !== null) {
          await processAlert(alert);
          triggeredCount++;
        }
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
        errorCount++;
      }
    }
    
    return {
      success: errorCount === 0,
      message: `Alert check completed: ${triggeredCount} triggered, ${errorCount} errors`,
      pendingCount: pendingAlerts.length,
      triggeredCount,
      errorCount,
    };
    
  } catch (error) {
    console.error('Error during manual rate alert check:', error);
    return {
      success: false,
      message: `Alert check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      pendingCount: 0,
      triggeredCount: 0,
      errorCount: 0,
    };
  }
}

/**
 * Get scheduler status
 */
export function getRateAlertSchedulerStatus(): {
  active: boolean;
  lastRunHour: number | null;
  nextCheckTime: string;
} {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  
  return {
    active: schedulerActive,
    lastRunHour,
    nextCheckTime: nextHour.toISOString(),
  };
}