/**
 * Data Source Service
 * 
 * This service implements the prioritized data collection strategy:
 * 1. Provider API data (if available, not older than 24 hours)
 * 2. Manual entry data (if available, not older than 24 hours)
 * 3. Web scraper data (if available, not older than 24 hours)
 */

import { log } from '../vite';
import { storage } from '../storage';
import { ExchangeRate, InsertExchangeRate, Provider } from '@shared/schema';
import { db } from '../db';
import { exchangeRates, providers } from '@shared/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

// Maximum age for rate data to be considered "fresh"
const MAX_DATA_AGE_HOURS = 24;

// Data source types
export enum DataSourceType {
  API = 'API',
  MANUAL = 'MANUAL',
  SCRAPER = 'SCRAPER',
  FALLBACK = 'FALLBACK'
}

/**
 * Options for collecting exchange rates
 */
interface CollectRateOptions {
  providerId: number;
  fromCurrency: string;
  toCurrency: string;
  forceRefresh?: boolean; 
}

/**
 * Exchange rate with source information
 */
interface EnhancedExchangeRate extends ExchangeRate {
  sourceType: DataSourceType;
  isVerified: boolean;
  sourceUrl?: string;
}

/**
 * Service for managing data sources and prioritization
 */
export class DataSourceService {
  /**
   * Get the best available exchange rate based on priority:
   * API -> Manual -> Scraper (all within 24 hours)
   */
  async getBestRate(
    providerId: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<EnhancedExchangeRate | null> {
    try {
      log(`Finding best rate for provider ${providerId} (${fromCurrency} to ${toCurrency})`);
      
      // Get the cutoff timestamp for fresh data (last 24 hours)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - MAX_DATA_AGE_HOURS);
      
      // Get all recent exchange rates for this provider and currency pair
      const rates = await db.select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.provider_id, providerId),
            eq(exchangeRates.from_currency, fromCurrency),
            eq(exchangeRates.to_currency, toCurrency),
            gte(exchangeRates.timestamp, cutoffTime)
          )
        )
        .orderBy(desc(exchangeRates.timestamp));
      
      if (!rates || rates.length === 0) {
        log(`No fresh rates found for provider ${providerId}`);
        return null;
      }
      
      // Helper function to enhance exchange rate with source info
      const enhanceRate = (rate: ExchangeRate): EnhancedExchangeRate => {
        return {
          ...rate,
          sourceType: this.determineSourceType(rate),
          isVerified: this.isRateVerified(rate),
          sourceUrl: rate.source_url ? rate.source_url : undefined
        };
      };
      
      // Check for API-sourced rates first (highest priority)
      const apiRate = rates.find(rate => rate.source === DataSourceType.API);
      if (apiRate) {
        log(`Using API rate for provider ${providerId}`);
        return enhanceRate(apiRate);
      }
      
      // Next, check for manually entered rates
      const manualRate = rates.find(rate => rate.source === DataSourceType.MANUAL);
      if (manualRate) {
        log(`Using manual rate for provider ${providerId}`);
        return enhanceRate(manualRate);
      }
      
      // Finally, use scraped rates
      const scrapedRate = rates.find(rate => rate.source === DataSourceType.SCRAPER);
      if (scrapedRate) {
        log(`Using scraped rate for provider ${providerId}`);
        return enhanceRate(scrapedRate);
      }
      
      // If we still don't have a rate, use the most recent one
      log(`Using most recent rate for provider ${providerId}`);
      return enhanceRate(rates[0]);
      
    } catch (error) {
      log(`Error finding best rate: ${error}`);
      return null;
    }
  }
  
  /**
   * Add a new exchange rate with source information
   */
  async addExchangeRate(
    providerId: number,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    sourceType: DataSourceType,
    sourceUrl?: string,
    isVerified: boolean = false
  ): Promise<ExchangeRate | null> {
    try {
      log(`Adding ${sourceType} rate for provider ${providerId}: ${rate} (${fromCurrency} to ${toCurrency})`);
      
      // Create exchange rate record with source information
      const exchangeRate: InsertExchangeRate = {
        provider_id: providerId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        source: sourceType,
        source_url: sourceUrl,
        verified: isVerified
      };
      
      // Save to database
      return await storage.createExchangeRate(exchangeRate);
      
    } catch (error) {
      log(`Error adding exchange rate: ${error}`);
      return null;
    }
  }
  
  /**
   * Add an API-sourced exchange rate
   */
  async addApiRate(
    providerId: number,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    apiUrl: string
  ): Promise<ExchangeRate | null> {
    return this.addExchangeRate(
      providerId,
      fromCurrency,
      toCurrency,
      rate,
      DataSourceType.API,
      apiUrl,
      true // API rates are considered verified
    );
  }
  
  /**
   * Add a manually entered exchange rate
   */
  async addManualRate(
    providerId: number,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    notes: string = ''
  ): Promise<ExchangeRate | null> {
    return this.addExchangeRate(
      providerId,
      fromCurrency,
      toCurrency,
      rate,
      DataSourceType.MANUAL,
      notes,
      true // Manual rates are considered verified
    );
  }
  
  /**
   * Add a scraped exchange rate
   */
  async addScrapedRate(
    providerId: number,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    sourceUrl: string,
    isVerified: boolean = false
  ): Promise<ExchangeRate | null> {
    return this.addExchangeRate(
      providerId,
      fromCurrency,
      toCurrency,
      rate,
      DataSourceType.SCRAPER,
      sourceUrl,
      isVerified
    );
  }
  
  /**
   * Get all exchange rates for a provider, organized by source type
   */
  async getRatesBySource(
    providerId: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<Record<DataSourceType, ExchangeRate[]>> {
    try {
      // Get the cutoff timestamp for fresh data (last 24 hours)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - MAX_DATA_AGE_HOURS);
      
      // Get all recent exchange rates for this provider and currency pair
      const rates = await db.select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.provider_id, providerId),
            eq(exchangeRates.from_currency, fromCurrency),
            eq(exchangeRates.to_currency, toCurrency),
            gte(exchangeRates.timestamp, cutoffTime)
          )
        )
        .orderBy(desc(exchangeRates.timestamp));
      
      // Organize rates by source type
      const result: Record<DataSourceType, ExchangeRate[]> = {
        [DataSourceType.API]: [],
        [DataSourceType.MANUAL]: [],
        [DataSourceType.SCRAPER]: [],
        [DataSourceType.FALLBACK]: []
      };
      
      // Sort rates into their respective categories
      for (const rate of rates) {
        const sourceType = this.determineSourceType(rate);
        result[sourceType].push(rate);
      }
      
      return result;
      
    } catch (error) {
      log(`Error getting rates by source: ${error}`);
      return {
        [DataSourceType.API]: [],
        [DataSourceType.MANUAL]: [],
        [DataSourceType.SCRAPER]: [],
        [DataSourceType.FALLBACK]: []
      };
    }
  }
  
  /**
   * Schedule collection of rates from all available sources
   * This should be called 3 times daily
   */
  async scheduleRateCollection(): Promise<void> {
    try {
      log('Starting scheduled rate collection');
      
      // Get all active providers
      const providers = await storage.getActiveProviders();
      log(`Found ${providers.length} active providers to update`);
      
      // Define currency pairs to collect
      const currencyPairs = [
        { from: 'GBP', to: 'NGN' },
        { from: 'EUR', to: 'NGN' },
        { from: 'GBP', to: 'GHS' },
        { from: 'EUR', to: 'GHS' }
      ];
      
      // Use existing collection methods in the application
      // This avoids duplicating scraping logic
      const { updateExchangeRates } = await import('../scrapers/providers');
      
      // Collect rates using existing methods
      const results = await updateExchangeRates(false);
      log(`Collected ${results.length} exchange rates via scheduled collection`);
      
      // For future enhancement: 
      // 1. Add API-based collection for providers with APIs
      // 2. Set source to 'API' for API-collected rates
      
    } catch (error) {
      log(`Error in scheduled rate collection: ${error}`);
    }
  }
  
  /**
   * Helper method to determine the source type of an exchange rate
   */
  private determineSourceType(rate: ExchangeRate): DataSourceType {
    if (rate.source === DataSourceType.API) {
      return DataSourceType.API;
    } else if (rate.source === DataSourceType.MANUAL) {
      return DataSourceType.MANUAL;
    } else if (rate.source === DataSourceType.SCRAPER) {
      return DataSourceType.SCRAPER;
    } else {
      return DataSourceType.FALLBACK;
    }
  }
  
  /**
   * Helper method to determine if a rate is verified
   */
  private isRateVerified(rate: ExchangeRate): boolean {
    if (rate.verified) {
      return true;
    }
    
    // API rates and manual rates are always considered verified
    if (rate.source === DataSourceType.API || rate.source === DataSourceType.MANUAL) {
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
export const dataSourceService = new DataSourceService();