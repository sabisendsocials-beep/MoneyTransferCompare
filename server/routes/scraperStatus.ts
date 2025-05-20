import { Router } from 'express';
import { getScraperStatus, resetScraperTimer, recordScraperRun } from '../services/scraperStatus';
import { updateAllScraperStatuses } from '../updateScraperStatus';

const router = Router();

/**
 * Gets all scrapers' status information
 */
router.get('/status', async (_req, res) => {
  try {
    console.log("Scraper status endpoint called");
    
    // First check the current status
    const status = await getScraperStatus();
    
    // Count providers with "never ran" status
    const neverRanCount = status.status.filter(s => !s.lastRun).length;
    
    // If most providers show "never ran", initialize them
    if (neverRanCount > 10) {
      console.log(`Found ${neverRanCount} providers with "never ran" status, initializing...`);
      await updateAllScraperStatuses();
      // Get updated status after initialization
      const updatedStatus = await getScraperStatus();
      return res.json(updatedStatus);
    }
    
    res.json(status);
  } catch (error) {
    console.error('Error getting scraper status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scraper status',
      error: (error as Error).message
    });
  }
});

/**
 * Force a specific scraper to be able to run again, bypassing the time limitation
 */
router.post('/reset/:providerId', async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider ID'
      });
    }
    
    const success = await resetScraperTimer(providerId);
    if (success) {
      res.json({
        success: true,
        message: 'Scraper timer reset successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }
  } catch (error) {
    console.error('Error resetting scraper timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset scraper timer',
      error: (error as Error).message
    });
  }
});

export default router;