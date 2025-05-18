// Simple verification endpoint
import express from 'express';
import { db } from '../db.js';

const router = express.Router();

/**
 * POST /api/simple-verify
 * Simple rate verification endpoint
 */
router.post('/api/simple-verify', async (req, res) => {
  try {
    const { providerId, fromCurrency, toCurrency, verified } = req.body;
    
    console.log(`Simple verify request - Provider: ${providerId}, From: ${fromCurrency}, To: ${toCurrency}, Verified: ${verified}`);
    
    // Basic validation
    if (!providerId || !fromCurrency || !toCurrency || typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields. Provide providerId, fromCurrency, toCurrency, and verified.'
      });
    }
    
    // Direct SQL update
    const result = await db.query(
      `UPDATE exchange_rates 
       SET verified = $1, timestamp = NOW() 
       WHERE provider_id = $2 AND from_currency = $3 AND to_currency = $4`,
      [verified, providerId, fromCurrency, toCurrency]
    );
    
    console.log(`Simple verify result: ${result.rowCount} rows affected`);
    
    return res.json({
      success: true,
      message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
      rowsAffected: result.rowCount
    });
  } catch (error) {
    console.error('Error in simple-verify:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating verification status',
      error: error.message
    });
  }
});

export default router;