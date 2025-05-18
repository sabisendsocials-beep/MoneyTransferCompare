// Routes for rate verification
import express from 'express';
import { verifyRate, getVerifiedRates } from '../verifyRate.js';

const router = express.Router();

/**
 * POST /api/rates/verify
 * Verifies or unverifies a rate
 */
router.post('/api/rates/verify', async (req, res) => {
  try {
    const { rateId, verified } = req.body;
    
    if (!rateId) {
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
    
    const updatedRate = await verifyRate(rateId, verified);
    
    if (!updatedRate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found or verification failed'
      });
    }
    
    return res.json({
      success: true,
      message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
      rate: updatedRate
    });
  } catch (error) {
    console.error('Error handling rate verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update rate verification status',
      error: error.message
    });
  }
});

/**
 * GET /api/rates/verified
 * Gets all verified rates
 */
router.get('/api/rates/verified', async (req, res) => {
  try {
    const verifiedRates = await getVerifiedRates();
    
    return res.json(verifiedRates);
  } catch (error) {
    console.error('Error fetching verified rates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verified rates',
      error: error.message
    });
  }
});

export default router;