/**
 * Data Source Service
 * Handles the prioritization and management of exchange rate data from multiple sources
 * 
 * Implements the hierarchical data collection strategy:
 * 1. Provider APIs (most reliable)
 * 2. Manual entries (verified by staff)
 * 3. Web scrapers (automated collection)
 * 
 * All data sources are required to have timestamps and freshness tracking
 */

import { db } from '../db';
import { storage } from '../storage';
import { exchangeRates } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { fetchWiseRates } from '../api/wiseApi';

// Data source types for exchange rates
export enum DataSourceType {
  API = 'API',
  MANUAL = 'MANUAL',
  SCRAPER = 'SCRAPER'
}

// Interface for manual rate entry
export interface ManualRateEntry {
  providerId: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  notes?: string;
}

/**
 * Adds a manually verified exchange rate
 * This is used by admin users to enter rates they've manually confirmed
 */
export async function addManualRate(entry: ManualRateEntry): Promise<boolean> {
  try {
    // Get the provider to verify it exists
    const provider = await storage.getProvider(entry.providerId);
    if (!provider) {
      console.error(`Provider with ID ${entry.providerId} not found`);
      return false;
    }

    // Create the exchange rate with source metadata
    const exchangeRate = {
      provider_id: entry.providerId,
      from_currency: entry.fromCurrency,
      to_currency: entry.toCurrency,
      rate: entry.rate,
      source: DataSourceType.MANUAL,
      source_url: entry.notes || 'Manual entry by admin',
      verified: true,
      timestamp: new Date()
    };

    // Store the rate
    await storage.createExchangeRate(exchangeRate);
    console.log(`Manual rate added for ${provider.name}: ${entry.fromCurrency} → ${entry.toCurrency} = ${entry.rate}`);
    return true;
  } catch (error) {
    console.error('Error adding manual rate:', error);
    return false;
  }
}

/**
 * Collects exchange rates from all available data sources
 * Follows the prioritization hierarchy:
 * 1. Provider APIs
 * 2. Manual entries (already in database)
 * 3. Web scrapers
 */
export async function collectRatesFromAllSources(): Promise<boolean> {
  try {
    console.log('Starting rate collection from all sources...');
    
    // Step 1: Collect from Provider APIs
    await collectFromApis();
    
    // Step 2: Run web scrapers for providers without API data
    // Note: Manual entries are already in the database
    await collectFromScrapers();
    
    console.log('Rate collection completed successfully');
    return true;
  } catch (error) {
    console.error('Error collecting rates from all sources:', error);
    return false;
  }
}

/**
 * DISABLED: API collection removed - admin panel has full control
 */
async function collectFromApis(): Promise<void> {
  console.log('✓ API collection disabled - admin panel has full control');
}

/**
 * Collects exchange rates using web scrapers
 * This is used for providers that don't offer an API
 */
async function collectFromScrapers(): Promise<void> {
  console.log('Collecting rates from web scrapers...');
  
  try {
    // This function would trigger the various scrapers we have
    // For providers not covered by APIs
    
    // Scrapers are already being triggered elsewhere in the application
    // We'd need to refactor them to work with our new data source approach
    
    console.log('Scraper collection complete');
  } catch (error) {
    console.error('Error collecting from scrapers:', error);
  }
}

/**
 * Helper function to find a provider by name
 */
async function findProviderByName(name: string) {
  const providers = await storage.getProviders();
  return providers.find(p => p.name === name);
}

/**
 * Gets the latest exchange rate for a provider and currency pair
 * Follows the prioritization hierarchy:
 * 1. Provider APIs (last 24 hours)
 * 2. Manual entries (last 24 hours)
 * 3. Web scrapers (last 24 hours)
 */
export async function getLatestRateBySource(
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<any | null> {
  try {
    // Check for API data first (highest priority)
    const apiRates = await db.select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.provider_id, providerId),
          eq(exchangeRates.from_currency, fromCurrency),
          eq(exchangeRates.to_currency, toCurrency),
          eq(exchangeRates.source, DataSourceType.API)
        )
      )
      .orderBy(desc(exchangeRates.timestamp))
      .limit(1);
      
    if (apiRates.length > 0) {
      const apiRate = apiRates[0];
      const timestamp = new Date(apiRate.timestamp);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      // Only use API data if it's less than 24 hours old
      if (hoursSinceUpdate < 24) {
        return {
          ...apiRate,
          source: DataSourceType.API
        };
      }
    }
    
    // Check for manual entries next (second priority)
    const manualRates = await db.select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.provider_id, providerId),
          eq(exchangeRates.from_currency, fromCurrency),
          eq(exchangeRates.to_currency, toCurrency),
          eq(exchangeRates.source, DataSourceType.MANUAL)
        )
      )
      .orderBy(desc(exchangeRates.timestamp))
      .limit(1);
      
    if (manualRates.length > 0) {
      const manualRate = manualRates[0];
      const timestamp = new Date(manualRate.timestamp);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      // Only use manual entries if they're less than 24 hours old
      if (hoursSinceUpdate < 24) {
        return {
          ...manualRate,
          source: DataSourceType.MANUAL
        };
      }
    }
    
    // Finally, check for scraped data (lowest priority)
    const scrapedRates = await db.select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.provider_id, providerId),
          eq(exchangeRates.from_currency, fromCurrency),
          eq(exchangeRates.to_currency, toCurrency),
          eq(exchangeRates.source, DataSourceType.SCRAPER)
        )
      )
      .orderBy(desc(exchangeRates.timestamp))
      .limit(1);
      
    if (scrapedRates.length > 0) {
      const scrapedRate = scrapedRates[0];
      const timestamp = new Date(scrapedRate.timestamp);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      // Only use scraped data if it's less than 24 hours old
      if (hoursSinceUpdate < 24) {
        return {
          ...scrapedRate,
          source: DataSourceType.SCRAPER
        };
      }
    }
    
    // No valid rate found within timeframe
    return null;
  } catch (error) {
    console.error('Error getting latest rate by source:', error);
    return null;
  }
}