// Direct verification endpoint implementation
import express from 'express';
import { db } from '../db.js';
import { exchangeRates } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * POST /api/direct-verify
 * Directly verifies or unverifies an exchange rate
 */
router.post('/api/direct-verify', async (req, res) => {
  try {
    const { id, verified } = req.body;
    
    console.log(`Rate verification request - ID: ${id}, Verified: ${verified}, From: ${req.body.fromCurrency}, To: ${req.body.toCurrency}`);
    
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
    
    // Execute direct SQL for maximum reliability
    try {
      // We need to add additional parameters to identify the specific rate
      // Debug information to help troubleshoot
      console.log(`Executing SQL: UPDATE exchange_rates SET verified = ${verified} WHERE provider_id = ${id} AND from_currency = '${req.body.fromCurrency}' AND to_currency = '${req.body.toCurrency}'`);
      
      // Case sensitive match for currency codes
      const result = await db.execute(
        `UPDATE exchange_rates 
         SET verified = $1, timestamp = NOW() 
         WHERE provider_id = $2 
           AND from_currency = $3
           AND to_currency = $4
         RETURNING *`,
        [verified, id, req.body.fromCurrency, req.body.toCurrency]
      );
      
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Rate not found'
        });
      }
      
      console.log(`Rate ${id} ${verified ? 'verified' : 'unverified'} successfully`);
      
      return res.json({
        success: true,
        message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
        rate: result.rows[0]
      });
    } catch (error) {
      console.error(`Error verifying rate: ${error}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to update rate verification status',
        error: error instanceof Error ? error.message : String(error)
      });
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

export default router;