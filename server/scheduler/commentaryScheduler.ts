/**
 * Daily Commentary Generation Scheduler
 * Generates 3-5 AI commentaries per day per currency pair to optimize OpenAI quota usage
 */

let schedulerActive = false;
let lastRunDate: string | null = null;
let lastRunTimestamp: Date | null = null;

/**
 * Start the daily commentary generation scheduler
 */
export function startCommentaryScheduler(): void {
  if (schedulerActive) {
    console.log('Commentary scheduler already active');
    return;
  }

  schedulerActive = true;
  console.log('Starting daily commentary generation scheduler...');

  // Check every 30 minutes for the scheduled time
  const checkInterval = 30 * 60 * 1000; // 30 minutes

  const schedulerInterval = setInterval(async () => {
    try {
      if (shouldRunDailyCommentaryGeneration()) {
        console.log('Starting daily commentary generation batch...');
        await runDailyCommentaryGeneration();
        lastRunDate = getTodayDate();
        lastRunTimestamp = new Date();
      }
    } catch (error) {
      console.error('Error in commentary scheduler:', error);
    }
  }, checkInterval);

  // Also run immediately if we haven't run today
  setTimeout(async () => {
    try {
      if (shouldRunDailyCommentaryGeneration()) {
        console.log('Running missed daily commentary generation...');
        await runDailyCommentaryGeneration();
        lastRunDate = getTodayDate();
        lastRunTimestamp = new Date();
      }
    } catch (error) {
      console.error('Error in initial commentary generation:', error);
    }
  }, 60000); // Wait 1 minute after startup

  console.log('Commentary scheduler initialized - will generate daily at 12:00 PM UTC');
}

/**
 * Stop the commentary scheduler
 */
export function stopCommentaryScheduler(): void {
  schedulerActive = false;
  console.log('Commentary scheduler stopped');
}

/**
 * Check if it's time to run daily commentary generation
 */
function shouldRunDailyCommentaryGeneration(): boolean {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentDate = getTodayDate();

  // Scheduled for 12:00 PM UTC (within 30 minute window)
  const isScheduledTime = currentHour === 12 && currentMinute <= 30;
  
  // Only run once per day
  const hasNotRunToday = lastRunDate !== currentDate;

  return isScheduledTime && hasNotRunToday;
}

/**
 * Run the daily commentary generation batch
 */
async function runDailyCommentaryGeneration(): Promise<void> {
  try {
    const { generateDailyCommentaryBatch, cleanupOldCommentary } = await import('../services/commentaryCache');
    
    // Clean up old commentary first
    await cleanupOldCommentary();
    
    // Generate new daily commentary for all pairs
    await generateDailyCommentaryBatch();
    
    console.log('✅ Daily commentary generation completed successfully');
  } catch (error) {
    console.error('❌ Error in daily commentary generation:', error);
    throw error;
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Manual trigger for commentary generation (for admin use)
 */
export async function manualTriggerCommentaryGeneration(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Manual trigger: Starting daily commentary generation...');
    await runDailyCommentaryGeneration();
    lastRunDate = getTodayDate();
    lastRunTimestamp = new Date();
    
    return {
      success: true,
      message: 'Daily commentary generation completed successfully'
    };
  } catch (error) {
    console.error('Manual trigger failed:', error);
    return {
      success: false,
      message: `Commentary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get scheduler status for admin monitoring
 */
export function getCommentarySchedulerStatus(): {
  active: boolean;
  lastRunDate: string | null;
  lastRunTimestamp: string | null;
  nextScheduledTime: string;
  scheduledTime: string;
} {
  const now = new Date();
  const nextScheduledTime = new Date();
  
  // Set to next 12:00 PM UTC
  nextScheduledTime.setUTCHours(12, 0, 0, 0);
  if (nextScheduledTime <= now) {
    nextScheduledTime.setUTCDate(nextScheduledTime.getUTCDate() + 1);
  }

  return {
    active: schedulerActive,
    lastRunDate,
    lastRunTimestamp: lastRunTimestamp?.toISOString() || null,
    nextScheduledTime: nextScheduledTime.toISOString(),
    scheduledTime: '12:00 UTC'
  };
}