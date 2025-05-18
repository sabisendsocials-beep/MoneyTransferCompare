// Simple direct verification endpoint
import express from 'express';
import { directVerify } from '../direct-verify.js';

const router = express.Router();

router.post('/api/simple-verify', async (req, res) => {
  try {
    const { providerId, fromCurrency, toCurrency, verified } = req.body;
    
    if (!providerId || !fromCurrency || !toCurrency || verified === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: providerId, fromCurrency, toCurrency, verified'
      });
    }
    
    const result = await directVerify(providerId, fromCurrency, toCurrency, verified);
    
    if (result.success) {
      return res.json({
        success: true,
        message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
        rowsAffected: result.rowCount
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to update verification status',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in simple-verify endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating verification status',
      error: error.message
    });
  }
});

export default router;