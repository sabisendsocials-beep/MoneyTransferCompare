/**
 * Provider API Scheduler Management Routes
 * Admin endpoints for managing the Provider API Scheduler
 */

import { Router } from 'express';
import { 
  getProviderApiSchedulerStatus, 
  updateScheduledHours, 
  manualTriggerCollection 
} from '../scheduler/providerApiScheduler';

const router = Router();

/**
 * Get Provider API Scheduler status and statistics
 */
router.get('/provider-api-scheduler/status', async (req, res) => {
  try {
    const status = getProviderApiSchedulerStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting Provider API Scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status'
    });
  }
});

/**
 * Update scheduled collection hours
 */
router.post('/provider-api-scheduler/schedule', async (req, res) => {
  try {
    const { hours } = req.body;
    
    if (!Array.isArray(hours)) {
      return res.status(400).json({
        success: false,
        message: 'Hours must be provided as an array'
      });
    }
    
    const result = updateScheduledHours(hours);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error updating scheduled hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduled hours'
    });
  }
});

/**
 * Manually trigger a collection cycle
 */
router.post('/provider-api-scheduler/trigger', async (req, res) => {
  try {
    console.log('Manual collection triggered via admin panel');
    
    const result = await manualTriggerCollection();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error triggering manual collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger manual collection'
    });
  }
});

export default router;