/**
 * Routes for managing data sources and manual rate entry
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { DataSourceType } from '../services/dataSourceService';
import { storage } from '../storage';

// Create a router
const router = express.Router();

// Schema for manually adding exchange rates
const manualRateSchema = z.object({
  providerId: z.number(),
  fromCurrency: z.string(),
  toCurrency: z.string(),
  rate: z.number().positive(),
  notes: z.string().optional(),
});

/**
 * POST /api/rates/manual - Add a manual exchange rate
 * This endpoint allows admins to manually enter rates
 */
router.post('/api/rates/manual', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = manualRateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.format()
      });
    }
    
    const { providerId, fromCurrency, toCurrency, rate, notes = '' } = validation.data;
    
    // Get the provider to ensure it exists
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: `Provider with ID ${providerId} not found`
      });
    }
    
    // Create the exchange rate with MANUAL source
    const exchangeRate = await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
      source: DataSourceType.MANUAL,
      source_url: notes,
      verified: true
    });
    
    // Return success response
    return res.status(201).json({
      success: true,
      message: `Manual rate added successfully for ${provider.name}`,
      data: {
        provider: provider.name,
        fromCurrency,
        toCurrency,
        rate,
        timestamp: exchangeRate.timestamp,
        source: DataSourceType.MANUAL
      }
    });
  } catch (error) {
    console.error('Error adding manual rate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add manual rate',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/rates/sources
 * Get all exchange rates organized by source type
 */
router.get('/api/rates/sources', async (req: Request, res: Response) => {
  try {
    const { providerId, fromCurrency, toCurrency } = req.query;
    
    // Validate query parameters
    if (!providerId || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: providerId, fromCurrency, toCurrency'
      });
    }
    
    // Get all rates for this provider and currency pair
    const { db } = await import('../db');
    const { exchangeRates } = await import('@shared/schema');
    const { eq, and, desc } = await import('drizzle-orm');
    
    const rates = await db.select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.provider_id, Number(providerId)),
          eq(exchangeRates.from_currency, String(fromCurrency)),
          eq(exchangeRates.to_currency, String(toCurrency))
        )
      )
      .orderBy(desc(exchangeRates.timestamp));
    
    // Organize rates by source
    const ratesBySource = {
      [DataSourceType.API]: rates.filter(r => r.source === DataSourceType.API),
      [DataSourceType.MANUAL]: rates.filter(r => r.source === DataSourceType.MANUAL),
      [DataSourceType.SCRAPER]: rates.filter(r => r.source === DataSourceType.SCRAPER),
      [DataSourceType.FALLBACK]: rates.filter(r => 
        r.source !== DataSourceType.API && 
        r.source !== DataSourceType.MANUAL && 
        r.source !== DataSourceType.SCRAPER
      )
    };
    
    // Get the provider name
    const provider = await storage.getProvider(Number(providerId));
    
    return res.status(200).json({
      success: true,
      provider: provider?.name || `Provider ${providerId}`,
      fromCurrency,
      toCurrency,
      sources: ratesBySource,
      counts: {
        api: ratesBySource[DataSourceType.API].length,
        manual: ratesBySource[DataSourceType.MANUAL].length,
        scraper: ratesBySource[DataSourceType.SCRAPER].length,
        fallback: ratesBySource[DataSourceType.FALLBACK].length,
        total: rates.length
      }
    });
  } catch (error) {
    console.error('Error fetching rate sources:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rate sources',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export const dataSourceRouter = router;