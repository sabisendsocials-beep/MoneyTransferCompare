import { Router, Request, Response } from 'express';
import { log } from '../vite';

export const rateSourceRouter = Router();

// Interface for rate source entries
export interface RateSourceEntry {
  providerId: number;
  providerName: string;
  fromCurrency: string;
  toCurrency: string;
  source: 'api' | 'scraping' | 'screenshot' | 'unavailable';
  timestamp: Date;
}

// In-memory storage for rate sources
// This tracks where each provider's rate data comes from
let rateSources: RateSourceEntry[] = [];

// Register a rate was obtained via direct API
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
  
  log(`Registered API-verified rate for ${providerName} (${fromCurrency}/${toCurrency})`);
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

// Register a rate was obtained via web scraping
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
  
  log(`Registered web-scraped rate for ${providerName} (${fromCurrency}/${toCurrency})`);
}

// Get the source of a rate for a specific provider
rateSourceRouter.get('/api/rate-source', (req: Request, res: Response) => {
  try {
    const { providerId, fromCurrency, toCurrency } = req.query;
    
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required'
      });
    }
    
    // Find the rate source for this provider and currency pair
    const source = rateSources.find(rs => 
      rs.providerId === Number(providerId) && 
      rs.fromCurrency === (fromCurrency || 'GBP') && 
      rs.toCurrency === (toCurrency || 'NGN')
    );
    
    if (!source) {
      return res.status(200).json({
        providerId: Number(providerId),
        providerName: '',
        fromCurrency: fromCurrency || 'GBP',
        toCurrency: toCurrency || 'NGN',
        source: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      ...source,
      timestamp: source.timestamp.toISOString()
    });
  } catch (error) {
    log(`Error getting rate source: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate source'
    });
  }
});

// Get the rate source for all providers
rateSourceRouter.get('/api/rate-sources', (_req: Request, res: Response) => {
  try {
    // Return all rate sources
    res.status(200).json(rateSources.map(source => ({
      ...source,
      timestamp: source.timestamp.toISOString()
    })));
  } catch (error) {
    log(`Error getting rate sources: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate sources'
    });
  }
});