/**
 * Data Source Router
 * Handles API routes for managing data sources
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { log } from '../vite';
import { storage } from '../storage';
import { collectAllRates } from '../scheduler/rateCollection';
import { db } from '../db';

// Source types
export enum DataSourceType {
  API = 'API',
  MANUAL = 'MANUAL',
  SCRAPER = 'SCRAPER',
  FALLBACK = 'FALLBACK'
}

// Create the router
const router = express.Router();

// Validation schema for manual rate entry
const manualRateSchema = z.object({
  providerId: z.number(),
  fromCurrency: z.string(),
  toCurrency: z.string(),
  rate: z.number().positive(),
  notes: z.string().optional()
});

/**
 * POST /api/rates/manual
 * Add a manual exchange rate entry
 */
router.post('/api/rates/manual', async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const validation = manualRateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.format()
      });
    }
    
    const { providerId, fromCurrency, toCurrency, rate, notes = '' } = validation.data;
    
    // Verify the provider exists
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: `Provider with ID ${providerId} not found`
      });
    }
    
    // Add the manual rate
    const exchangeRate = await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
      source: DataSourceType.MANUAL,
      source_url: notes,
      verified: true
    });
    
    return res.status(201).json({
      success: true,
      message: `Manual rate added for ${provider.name}`,
      data: {
        provider: provider.name,
        fromCurrency,
        toCurrency,
        rate,
        source: DataSourceType.MANUAL,
        timestamp: exchangeRate.timestamp
      }
    });
  } catch (error) {
    log(`Error adding manual rate: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to add manual rate',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/rates/sources
 * Get exchange rates by source for a provider and currency pair
 */
router.get('/api/rates/sources', async (req: Request, res: Response) => {
  try {
    const { providerId, fromCurrency, toCurrency } = req.query;
    
    // Validate required parameters
    if (!providerId || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: providerId, fromCurrency, toCurrency'
      });
    }
    
    // Get rates from the database
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
      [DataSourceType.SCRAPER]: rates.filter(r => r.source === DataSourceType.SCRAPER || !r.source),
      [DataSourceType.FALLBACK]: rates.filter(r => r.source && 
        r.source !== DataSourceType.API && 
        r.source !== DataSourceType.MANUAL && 
        r.source !== DataSourceType.SCRAPER
      )
    };
    
    // Get the provider information
    const provider = await storage.getProvider(Number(providerId));
    
    return res.json({
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
    log(`Error getting rate sources: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get rate sources',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/rates/collect
 * Manually trigger rate collection
 */
router.post('/api/rates/collect', async (_req: Request, res: Response) => {
  try {
    log('Manual rate collection triggered');
    
    // Update scraper status directly with the imported function
    const { recordScraperRun } = require('../services/scraperStatus');
    recordScraperRun('SYSTEM', true, 'Manual rate collection triggered from admin panel');
    
    // Trigger the rate collection
    collectAllRates()
      .then(() => {
        log('Manual rate collection completed');
        
        // Update scraper status when complete
        recordScraperRun('SYSTEM', true, 'Manual rate collection completed successfully');
        
        // Also update Wise (which is always used)
        recordScraperRun('Wise', true, 'Rates collected via API in manual collection');
      })
      .catch(async (error) => {
        log(`Error in manual rate collection: ${error}`);
        
        // Record error in scraper status
        try {
          const { recordScraperRun } = await import('../api/simpleScraperStatus');
          recordScraperRun('SYSTEM', false, `Manual collection failed: ${error}`);
        } catch (err) {
          log('Could not record error status (non-critical)');
        }
      });
    
    // Return immediately to not block the request
    return res.json({
      success: true,
      message: 'Rate collection triggered',
      timestamp: new Date()
    });
  } catch (error) {
    log(`Error triggering rate collection: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger rate collection',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/rates/latest
 * Fetch the latest rates for all providers
 */
router.get('/api/rates/latest', async (_req: Request, res: Response) => {
  try {
    // Get all active providers
    const providers = await storage.getActiveProviders();
    
    // Common currency pairs we support
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'EUR', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'GHS' },
      { from: 'USD', to: 'NGN' }
    ];
    
    // Result array for all the latest rates
    const latestRates = [];
    
    // For each provider and currency pair, get the latest rate
    for (const provider of providers) {
      for (const pair of currencyPairs) {
        // Fetch the latest rate for this provider and currency pair
        const rates = await storage.getRatesByProvider(
          provider.id,
          pair.from,
          pair.to,
          1 // Only get the most recent rate
        );
        
        // If we have a rate, add it to our results
        if (rates && rates.length > 0) {
          const rate = rates[0];
          latestRates.push({
            providerId: provider.id,
            providerName: provider.name,
            fromCurrency: rate.from_currency,
            toCurrency: rate.to_currency,
            rate: rate.rate,
            source: rate.source,
            sourceUrl: rate.source_url,
            verified: rate.verified,
            timestamp: rate.timestamp,
          });
        }
      }
    }
    
    // Add log to help debug issues with detailed provider information
    log(`Found ${latestRates.length} latest rates from providers`);
    
    // Get detailed information about which providers were found
    const providerNames = latestRates.map(r => `${r.providerName} (${r.source || 'unknown source'})`);
    log(`Providers in response: ${providerNames.join(', ')}`);
    
    // Check if Wise is missing and directly look for it if needed
    const hasWise = latestRates.some(r => r.providerName.toLowerCase().includes('wise'));
    
    if (!hasWise) {
      log('Wise provider missing from results, checking directly in database...');
      
      try {
        // Import required modules
        const { db } = await import('../db');
        const { exchangeRates, providers } = await import('@shared/schema');
        const { eq, and, desc } = await import('drizzle-orm');
        
        // Find the Wise provider
        const wiseProviders = await db.select()
          .from(providers)
          .where(eq(providers.name, 'Wise'));
        
        if (wiseProviders.length > 0) {
          const wiseProvider = wiseProviders[0];
          log(`Found Wise provider with ID ${wiseProvider.id}`);
          
          // Look for Wise rates from API source
          for (const pair of currencyPairs) {
            const wiseRates = await db.select()
              .from(exchangeRates)
              .where(
                and(
                  eq(exchangeRates.provider_id, wiseProvider.id),
                  eq(exchangeRates.from_currency, pair.from),
                  eq(exchangeRates.to_currency, pair.to),
                  eq(exchangeRates.source, DataSourceType.API)
                )
              )
              .orderBy(desc(exchangeRates.timestamp))
              .limit(1);
              
            if (wiseRates.length > 0) {
              const wiseRate = wiseRates[0];
              log(`Found Wise API rate for ${pair.from}/${pair.to}: ${wiseRate.rate}`);
              
              // Add to results
              latestRates.push({
                providerId: wiseProvider.id,
                providerName: wiseProvider.name,
                fromCurrency: wiseRate.from_currency,
                toCurrency: wiseRate.to_currency,
                rate: wiseRate.rate,
                source: wiseRate.source,
                sourceUrl: wiseRate.source_url,
                verified: wiseRate.verified,
                timestamp: wiseRate.timestamp,
              });
            }
          }
        } else {
          log('No Wise provider found in database');
        }
      } catch (wiseError) {
        log(`Error trying to find Wise rates directly: ${wiseError}`);
      }
    }
    
    return res.json(latestRates);
  } catch (error) {
    log(`Error fetching latest rates: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch latest rates',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/rates/verify
 * Verify or unverify a rate entry
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
    
    // Get the rate to find provider and currency details
    const { getExchangeRateById } = await import('../queries/rateQueries');
    const rate = await getExchangeRateById(rateId);
    
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }
    
    // Update the verification status in the database using provider and currency info
    const updated = await storage.updateRateVerification(
      rate.provider_id, 
      rate.from_currency, 
      rate.to_currency, 
      verified
    );
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }
    
    return res.json({
      success: true,
      message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
      rate: updated
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

export default router;