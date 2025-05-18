import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { exchangeRates, ExchangeRate } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Function to log messages with timestamp
function log(message: string) {
  console.log(`${new Date().toISOString()} [Rate Verification] ${message}`);
}

/**
 * POST /api/rates/verify
 * Update the verification status of an exchange rate
 */
router.post('/api/rates/verify', async (req: Request, res: Response) => {
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
    
    log(`Updating verification status for rate ${rateId} to ${verified}`);
    
    // Direct database update since we're having issues with the storage interface
    const [updatedRate] = await db
      .update(exchangeRates)
      .set({ 
        verified,
        timestamp: new Date() // Update timestamp to show it was verified recently
      })
      .where(eq(exchangeRates.id, rateId))
      .returning();
    
    if (!updatedRate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }
    
    log(`Rate ${rateId} ${verified ? 'verified' : 'unverified'} successfully`);
    
    return res.json({
      success: true,
      message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
      rate: updatedRate
    });
  } catch (error) {
    log(`Error verifying rate: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update rate verification status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/rates/verified
 * Get all verified rates
 */
router.get('/api/rates/verified', async (_req: Request, res: Response) => {
  try {
    const verifiedRates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.verified, true))
      .orderBy(eq(exchangeRates.timestamp, 'DESC'));
    
    return res.json(verifiedRates);
  } catch (error) {
    log(`Error fetching verified rates: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verified rates',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;