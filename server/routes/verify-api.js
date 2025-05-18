// API routes for rate verification
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// POST /api/verify-rate - Endpoint for verifying rates
router.post('/api/verify-rate', async (req, res) => {
  const { providerId, fromCurrency, toCurrency, verified } = req.body;
  
  if (!providerId || !fromCurrency || !toCurrency || verified === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: providerId, fromCurrency, toCurrency, verified'
    });
  }
  
  try {
    // Direct database update with parameterized query
    const result = await pool.query(
      `UPDATE exchange_rates 
       SET verified = $1
       WHERE provider_id = $2 
         AND from_currency = $3
         AND to_currency = $4
       RETURNING *`,
      [verified, providerId, fromCurrency, toCurrency]
    );
    
    console.log(`Verification result: updated ${result.rowCount} rows`);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching rate found'
      });
    }
    
    return res.json({
      success: true,
      message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
      rate: result.rows[0]
    });
  } catch (error) {
    console.error('Error in rate verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating verification status',
      error: error.message
    });
  }
});

export default router;