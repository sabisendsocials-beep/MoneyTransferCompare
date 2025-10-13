/**
 * Admin Historical Data Routes
 * API endpoints for admin-triggered historical data management
 */

import express from 'express';
import { 
  adminPopulateHistoricalPair, 
  adminPopulateAllHistoricalData, 
  getHistoricalDataStatus 
} from '../services/adminHistoricalService';
import { runDailyIncrementCollection, shouldRunDailyCollection } from '../services/dailyIncrementService';
import { getDataCoverageSummary } from '../services/chartDataService';
import { backfillHistoricalData } from '../services/historicalBackfillService';

const router = express.Router();

// Admin endpoint to populate historical data for a specific currency pair
router.post('/admin/historical/populate/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    const fromCurrency = from.toUpperCase();
    const toCurrency = to.toUpperCase();
    
    console.log(`Admin request: Populate historical data for ${fromCurrency}/${toCurrency}`);
    
    const result = await adminPopulateHistoricalPair(fromCurrency, toCurrency);
    
    res.json({
      success: result.success,
      recordsAdded: result.recordsAdded,
      message: result.message,
      pair: `${fromCurrency}/${toCurrency}`
    });
    
  } catch (error) {
    console.error('Error in admin historical population:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during historical data population'
    });
  }
});

// Admin endpoint to populate historical data for all currency pairs
router.post('/admin/historical/populate-all', async (req, res) => {
  try {
    console.log('Admin request: Populate historical data for all currency pairs');
    
    const result = await adminPopulateAllHistoricalData();
    
    res.json({
      success: result.failed === 0,
      totalProcessed: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
      totalRecordsAdded: result.totalRecordsAdded,
      results: result.results
    });
    
  } catch (error) {
    console.error('Error in admin bulk historical population:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk historical data population'
    });
  }
});

// Get status of historical data for all currency pairs
router.get('/admin/historical/status', async (req, res) => {
  try {
    const status = await getHistoricalDataStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting historical data status:', error);
    res.status(500).json({
      error: 'Internal server error getting historical data status'
    });
  }
});

// Get data coverage summary
router.get('/admin/historical/coverage', async (req, res) => {
  try {
    const coverage = await getDataCoverageSummary();
    res.json(coverage);
  } catch (error) {
    console.error('Error getting data coverage summary:', error);
    res.status(500).json({
      error: 'Internal server error getting data coverage summary'
    });
  }
});

// Admin endpoint to trigger daily increment collection manually
router.post('/admin/daily/collect', async (req, res) => {
  try {
    console.log('Admin request: Manual daily increment collection');
    
    const result = await runDailyIncrementCollection();
    
    res.json({
      success: result.failed === 0,
      totalProcessed: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
      results: result.results
    });
    
  } catch (error) {
    console.error('Error in manual daily increment collection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during daily increment collection'
    });
  }
});

// Check if daily collection should run
router.get('/admin/daily/should-run', async (req, res) => {
  try {
    const shouldRun = await shouldRunDailyCollection();
    res.json({ shouldRun });
  } catch (error) {
    console.error('Error checking daily collection status:', error);
    res.status(500).json({
      error: 'Internal server error checking daily collection status'
    });
  }
});

// Admin endpoint to backfill historical data for a date range
router.post('/admin/historical/backfill', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Both startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }
    
    console.log(`Admin request: Backfill historical data from ${startDate} to ${endDate}`);
    
    const result = await backfillHistoricalData(startDate, endDate);
    
    res.json({
      success: result.failedPairs === 0,
      totalPairs: result.totalPairs,
      successfulPairs: result.successfulPairs,
      failedPairs: result.failedPairs,
      totalDatesInserted: result.totalDatesInserted,
      results: result.results
    });
    
  } catch (error) {
    console.error('Error in historical backfill:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during historical backfill'
    });
  }
});

export default router;