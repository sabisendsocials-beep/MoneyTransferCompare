/**
 * Data Source API Routes
 * Handles routes for manual rate entry and data collection
 */

import { Router } from 'express';
import { z } from 'zod';
import { addManualRate, collectRatesFromAllSources, ManualRateEntry } from '../services/dataSourceService';

// Create router
const router = Router();

// Validation schema for manual rate entry
const manualRateSchema = z.object({
  providerId: z.number().int().positive(),
  fromCurrency: z.string().min(3).max(3),
  toCurrency: z.string().min(3).max(3),
  rate: z.number().positive(),
  notes: z.string().optional()
});

/**
 * POST /api/rates/manual
 * Adds a manually verified exchange rate
 */
router.post('/rates/manual', async (req, res) => {
  try {
    // Validate request body
    const validationResult = manualRateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    // Extract validated data
    const manualRate: ManualRateEntry = validationResult.data;
    
    // Add the manual rate
    const success = await addManualRate(manualRate);
    
    if (success) {
      return res.json({
        success: true,
        message: 'Manual rate added successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to add manual rate'
      });
    }
  } catch (error) {
    console.error('Error in manual rate endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/rates/collect
 * Triggers collection of rates from all sources
 */
router.post('/rates/collect', async (req, res) => {
  try {
    // Start the collection process
    const collectionStarted = true;
    
    // Start collection in background
    collectRatesFromAllSources()
      .then(success => {
        console.log('Rate collection completed:', success ? 'successfully' : 'with errors');
      })
      .catch(err => {
        console.error('Error in background rate collection:', err);
      });
    
    // Return immediate response to client
    return res.json({
      success: true,
      message: 'Rate collection started'
    });
  } catch (error) {
    console.error('Error in rate collection endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start rate collection'
    });
  }
});

export default router;