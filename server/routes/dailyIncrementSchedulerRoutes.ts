/**
 * Daily Increment Scheduler Admin Routes
 * Provides monitoring and control for official base rate collection
 */

import { Router } from 'express';
import { 
  getDailyIncrementSchedulerStatus, 
  updateDailyIncrementScheduledHours,
  manualTriggerDailyIncrement 
} from '../scheduler/dailyIncrementScheduler';

const router = Router();

/**
 * Get current scheduler status and collection history
 */
router.get('/status', async (req, res) => {
  try {
    const status = getDailyIncrementSchedulerStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching daily increment scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduler status'
    });
  }
});

/**
 * Update scheduled collection hours
 */
router.post('/schedule', async (req, res) => {
  try {
    const { hours } = req.body;
    
    if (!Array.isArray(hours) || hours.some(h => typeof h !== 'number' || h < 0 || h > 23)) {
      return res.status(400).json({
        success: false,
        error: 'Hours must be an array of numbers between 0-23'
      });
    }
    
    const result = updateDailyIncrementScheduledHours(hours);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Error updating daily increment schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule'
    });
  }
});

/**
 * Manually trigger daily increment collection
 */
router.post('/trigger', async (req, res) => {
  try {
    console.log('Manual daily increment collection triggered from admin panel');
    
    const result = await manualTriggerDailyIncrement();
    
    res.json({
      success: result.success,
      message: result.message,
      result: result.result
    });
  } catch (error) {
    console.error('Error during manual daily increment trigger:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Manual trigger failed'
    });
  }
});

export default router;