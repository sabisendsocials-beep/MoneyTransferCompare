/**
 * Rate verification router
 * Endpoints for verifying exchange rates in the admin interface
 */

import express from 'express';
import { db } from '../db.js';
import { exchangeRates } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * POST /api/rate-verify
 * Verifies or unverifies an exchange rate
 */
router.post('/api/rate-verify', async (req, res) => {
  try {
    const { id, verified } = req.body;
    
    console.log(`Rate verification request - ID: ${id}, Verified: ${verified}`);
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Rate ID is required'
      });
    }
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Verified status must be a boolean'
      });
    }
    
    // Try direct SQL approach first for maximum reliability
    try {
      const result = await db.execute(
        `UPDATE exchange_rates 
         SET verified = $1, timestamp = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [verified, id]
      );
      
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Rate not found'
        });
      }
      
      return res.json({
        success: true,
        message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
        rate: result.rows[0]
      });
    } catch (sqlError) {
      console.error(`SQL approach failed: ${sqlError}`);
      
      // Fall back to ORM approach
      try {
        const [updatedRate] = await db
          .update(exchangeRates)
          .set({ 
            verified,
            timestamp: new Date()
          })
          .where(eq(exchangeRates.id, id))
          .returning();
        
        if (!updatedRate) {
          return res.status(404).json({
            success: false,
            message: 'Rate not found'
          });
        }
        
        return res.json({
          success: true,
          message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
          rate: updatedRate
        });
      } catch (ormError) {
        throw new Error(`Both SQL and ORM approaches failed: ${ormError}`);
      }
    }
  } catch (error) {
    console.error(`Error verifying rate: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update rate verification status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/verified-rates
 * Gets all verified rates
 */
router.get('/api/verified-rates', async (req, res) => {
  try {
    const verifiedRates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.verified, true))
      .orderBy(exchangeRates.timestamp);
    
    return res.json(verifiedRates);
  } catch (error) {
    console.error(`Error fetching verified rates: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verified rates',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/refresh-rates
 * Manually triggers a rate update
 */
router.post('/api/refresh-rates', async (_req, res) => {
  try {
    // Schedule the update in the background
    setTimeout(async () => {
      try {
        const updateWiseRates = (await import('../api/wiseApi.js')).default;
        await updateWiseRates();
        console.log("Manual rate update completed successfully");
      } catch (error) {
        console.error(`Error in manual rate update: ${error}`);
      }
    }, 100);
    
    return res.json({
      success: true,
      message: "Rate update has been triggered in the background"
    });
  } catch (error) {
    console.error(`Error triggering rate update: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to trigger rate update",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/refresh-ratings
 * Manually triggers a TrustPilot rating update
 */
router.post('/api/refresh-ratings', async (_req, res) => {
  try {
    // Schedule the update in the background
    setTimeout(async () => {
      try {
        const { updateTrustpilotRatings } = await import('../trustpilotRatings.js');
        await updateTrustpilotRatings();
        console.log("Manual TrustPilot update completed successfully");
      } catch (error) {
        console.error(`Error in manual TrustPilot update: ${error}`);
      }
    }, 100);
    
    return res.json({
      success: true,
      message: "TrustPilot rating update has been triggered in the background"
    });
  } catch (error) {
    console.error(`Error triggering TrustPilot update: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to trigger TrustPilot update",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;