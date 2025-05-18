// New simplified verification endpoint
import express from 'express';
import { verifyRate } from '../verify-rates.js';

const router = express.Router();

// POST /api/verify-rate
router.post('/api/verify-rate', async (req, res) => {
  try {
    const { providerId, fromCurrency, toCurrency, verified } = req.body;
    console.log(`Request to verify rate received: ${JSON.stringify(req.body)}`);
    
    if (!providerId || !fromCurrency || !toCurrency || verified === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: providerId, fromCurrency, toCurrency, verified'
      });
    }
    
    const result = await verifyRate(providerId, fromCurrency, toCurrency, verified);
    
    if (result.success) {
      return res.json({
        success: true,
        message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
        rowsUpdated: result.rowsUpdated
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to update rate verification status',
        error: result.error
      });
    }
  } catch (error) {
    console.error(`Error in verify-rate endpoint: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error updating rate verification',
      error: error.message
    });
  }
});

export default router;