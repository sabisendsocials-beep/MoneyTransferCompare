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
    const { id, verified, fromCurrency, toCurrency } = req.body;
    
    console.log(`Rate verification request - Provider ID: ${id}, From: ${fromCurrency}, To: ${toCurrency}, Verified: ${verified}`);
    
    if (!id || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID, fromCurrency, and toCurrency are all required'
      });
    }
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Verified status must be a boolean'
      });
    }
    
    // Simple approach: execute raw SQL to update directly
    try {
      // Direct SQL update, verified to work in tests
      await db.execute(
        `UPDATE exchange_rates 
         SET verified = $1 
         WHERE provider_id = $2 AND from_currency = $3 AND to_currency = $4`,
        [verified, id, fromCurrency, toCurrency]
      );
      
      console.log(`Rate for ${fromCurrency}/${toCurrency} from provider ${id} ${verified ? 'verified' : 'unverified'} successfully`);
      
      return res.json({
        success: true,
        message: `Rate ${verified ? 'verified' : 'unverified'} successfully`
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