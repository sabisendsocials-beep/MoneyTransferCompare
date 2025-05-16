/**
 * Rate Source API
 * 
 * This module handles tracking and exposing the source of exchange rates
 * (API, scraping, or screenshot verification) to the frontend
 */

import { Request, Response, Router } from 'express';
import { log } from '../vite';

// Create the router
const rateSourceRouter = Router();

// Maintain a map of provider rates and their sources
// This allows us to track which rates were obtained via API vs scraping
interface RateSourceEntry {
  providerId: number;
  providerName: string;
  fromCurrency: string;
  toCurrency: string;
  source: 'api' | 'scraping' | 'screenshot' | 'unavailable';
  timestamp: Date;
}

// In-memory store of rate sources (in production this would be database-backed)
let rateSources: RateSourceEntry[] = [];

// Register a rate was obtained via API
export function registerApiRate(
  providerId: number,
  providerName: string,
  fromCurrency: string,
  toCurrency: string
): void {
  const entry: RateSourceEntry = {
    providerId,
    providerName,
    fromCurrency,
    toCurrency,
    source: 'api',
    timestamp: new Date()
  };
  
  // Remove any existing entry for this provider and currency pair
  rateSources = rateSources.filter(rs => 
    !(rs.providerId === providerId && 
      rs.fromCurrency === fromCurrency && 
      rs.toCurrency === toCurrency)
  );
  
  // Add the new entry
  rateSources.push(entry);
  
  log(`Registered API-based rate for ${providerName} (${fromCurrency}/${toCurrency})`);
}

// Register a rate was obtained via scraping
export function registerScrapedRate(
  providerId: number,
  providerName: string,
  fromCurrency: string,
  toCurrency: string
): void {
  const entry: RateSourceEntry = {
    providerId,
    providerName,
    fromCurrency,
    toCurrency,
    source: 'scraping',
    timestamp: new Date()
  };
  
  // Remove any existing entry for this provider and currency pair
  rateSources = rateSources.filter(rs => 
    !(rs.providerId === providerId && 
      rs.fromCurrency === fromCurrency && 
      rs.toCurrency === toCurrency)
  );
  
  // Add the new entry
  rateSources.push(entry);
  
  log(`Registered scraped rate for ${providerName} (${fromCurrency}/${toCurrency})`);
}

// Register a rate was verified via screenshot
export function registerScreenshotRate(
  providerId: number,
  providerName: string,
  fromCurrency: string,
  toCurrency: string
): void {
  const entry: RateSourceEntry = {
    providerId,
    providerName,
    fromCurrency,
    toCurrency,
    source: 'screenshot',
    timestamp: new Date()
  };
  
  // Remove any existing entry for this provider and currency pair
  rateSources = rateSources.filter(rs => 
    !(rs.providerId === providerId && 
      rs.fromCurrency === fromCurrency && 
      rs.toCurrency === toCurrency)
  );
  
  // Add the new entry
  rateSources.push(entry);
  
  log(`Registered screenshot-verified rate for ${providerName} (${fromCurrency}/${toCurrency})`);
}

// Get the rate source for all providers
rateSourceRouter.get('/api/rate-sources', (_req: Request, res: Response) => {
  try {
    // Return all rate sources
    res.status(200).json(rateSources);
  } catch (error) {
    log(`Error getting rate sources: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate sources'
    });
  }
});

// Get the rate source for a specific provider
rateSourceRouter.get('/api/rate-source/:providerId', (req: Request, res: Response) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const fromCurrency = req.query.from as string || 'GBP';
    const toCurrency = req.query.to as string || 'NGN';
    
    // Find the rate source for this provider and currency pair
    const rateSource = rateSources.find(rs => 
      rs.providerId === providerId && 
      rs.fromCurrency === fromCurrency && 
      rs.toCurrency === toCurrency
    );
    
    if (rateSource) {
      res.status(200).json(rateSource);
    } else {
      res.status(200).json({
        providerId,
        providerName: '',
        fromCurrency,
        toCurrency,
        source: 'unavailable',
        timestamp: new Date()
      });
    }
  } catch (error) {
    log(`Error getting rate source: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate source'
    });
  }
});

export default rateSourceRouter;