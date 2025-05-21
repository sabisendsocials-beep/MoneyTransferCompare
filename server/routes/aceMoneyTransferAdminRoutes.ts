/**
 * ACE Money Transfer Admin Routes
 * 
 * This file implements a direct rate entry system for ACE Money Transfer
 * with strict validation to ensure only actual observed rates are used.
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

// Create router
const aceAdminRouter = Router();

// Schema for rate entry validation
const AceRateEntrySchema = z.object({
  from_currency: z.enum(['GBP', 'EUR']),
  to_currency: z.enum(['NGN', 'GHS']),
  rate: z.number().positive(),
  admin_token: z.string().min(8)
});

// ACE Money Transfer direct rate entry endpoint
aceAdminRouter.post("/direct-rate-entry", async (req: Request, res: Response) => {
  try {
    console.log('Processing direct rate entry for ACE Money Transfer...');
    
    // Validate the request body
    const validation = AceRateEntrySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid rate entry data",
        errors: validation.error.errors
      });
    }
    
    const { from_currency, to_currency, rate, admin_token } = validation.data;
    
    // Very simple admin token validation - this would be more secure in production
    if (admin_token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid admin token"
      });
    }
    
    // Get the ACE Money Transfer provider
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      return res.status(404).json({
        success: false,
        message: "ACE Money Transfer provider not found in database"
      });
    }
    
    console.log(`Adding direct rate for ACE Money Transfer: 1 ${from_currency} = ${rate} ${to_currency}`);
    
    // Add the rate to the database
    await storage.createExchangeRate({
      provider_id: aceProvider.id,
      from_currency,
      to_currency,
      rate,
      source: 'ADMIN_DIRECT'  // Mark this as a directly entered rate
    });
    
    console.log(`Successfully stored direct ACE Money Transfer ${from_currency}-${to_currency} rate: ${rate}`);
    
    res.json({
      success: true,
      message: `Successfully added ACE Money Transfer rate: 1 ${from_currency} = ${rate} ${to_currency}`,
      provider_id: aceProvider.id,
      from_currency,
      to_currency,
      rate
    });
  } catch (error) {
    console.error("Error adding direct ACE Money Transfer rate:", error);
    res.status(500).json({
      success: false,
      message: "Error adding direct ACE Money Transfer rate",
      error: String(error)
    });
  }
});

// Get latest ACE Money Transfer rates
aceAdminRouter.get("/latest-rates", async (req: Request, res: Response) => {
  try {
    // Get the ACE Money Transfer provider
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      return res.status(404).json({
        success: false,
        message: "ACE Money Transfer provider not found in database"
      });
    }
    
    // Get the currency pairs we track
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'EUR', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'GHS' }
    ];
    
    // Collect the latest rates for each pair
    const rates = await Promise.all(
      currencyPairs.map(async pair => {
        const rates = await storage.getRatesByProvider(
          aceProvider.id,
          pair.from,
          pair.to,
          1  // Get just the latest rate
        );
        
        return {
          from_currency: pair.from,
          to_currency: pair.to,
          latest_rate: rates.length > 0 ? rates[0] : null,
          has_rate: rates.length > 0
        };
      })
    );
    
    res.json({
      success: true,
      provider_id: aceProvider.id,
      provider_name: aceProvider.name,
      rates
    });
  } catch (error) {
    console.error("Error fetching ACE Money Transfer rates:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching ACE Money Transfer rates",
      error: String(error)
    });
  }
});

export default aceAdminRouter;