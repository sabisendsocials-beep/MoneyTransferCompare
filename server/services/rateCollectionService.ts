/**
 * Rate Collection Service
 * 
 * This service implements the data collection strategy with three tiers:
 * 1. Provider API (Priority 1)
 * 2. Manual Entry (Priority 2)
 * 3. Web Scraping (Priority 3)
 * 
 * It ensures data is fresh (not older than 24 hours) and follows
 * the prioritization logic for selecting the most reliable source.
 */

import { log } from '../vite';
import { storage } from '../storage';
import { RateSourceType, ExchangeRate, InsertExchangeRate, Provider } from '@shared/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { getMaxRateAgeHoursSync } from '../utils/rateFilter'; 

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
 * Service for collecting and managing exchange rates
 */
export class RateCollectionService {
  /**
   * Get the best available exchange rate for a provider and currency pair
   * Uses the prioritization logic: API > Manual > Scraper
   * Only returns rates newer than the configured rate age threshold
   */
  async getBestRate(
    providerId: number, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    try {
      log(`Getting best rate for provider ${providerId} (${fromCurrency} to ${toCurrency})`);
      
      // Get the cutoff timestamp for fresh data
      const maxAgeHours = getMaxRateAgeHoursSync();
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
      
      // Get all rates for this provider/currency pair newer than cutoff time
      const { db } = await import('../db');
      const { exchangeRates } = await import('@shared/schema');
      
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
      
      // First look for API-sourced rates (highest priority)
      const apiRate = rates.find(rate => rate.source === RateSourceType.API);
      if (apiRate) {
        log(`Using API rate for provider ${providerId} (${fromCurrency} to ${toCurrency})`);
        return apiRate;
      }
      
      // Next, look for manually entered rates
      const manualRate = rates.find(rate => rate.source === RateSourceType.MANUAL);
      if (manualRate) {
        log(`Using manual rate for provider ${providerId} (${fromCurrency} to ${toCurrency})`);
        return manualRate;
      }
      
      // Finally, use scraped rates
      const scrapedRate = rates.find(rate => rate.source === RateSourceType.SCRAPER);
      if (scrapedRate) {
        log(`Using scraped rate for provider ${providerId} (${fromCurrency} to ${toCurrency})`);
        return scrapedRate;
      }
      
      // If we still have nothing, return the most recent rate regardless of source
      log(`Using most recent rate for provider ${providerId} (source: ${rates[0].source})`);
      return rates[0];
      
    } catch (error) {
      log(`Error getting best rate: ${error}`);
      return null;
    }
  }
  
  /**
   * Collect exchange rates using the provider's preferred method
   * Will attempt to use API first, then fall back to scraping
   */
  async collectRates(options: CollectRateOptions): Promise<ExchangeRate | null> {
    try {
      const { providerId, fromCurrency, toCurrency, forceRefresh = false } = options;
      
      // Get the provider to check collection preferences
      const provider = await storage.getProvider(providerId);
      if (!provider) {
        log(`Provider ${providerId} not found`);
        return null;
      }
      
      // CRITICAL: Check if provider is set to MANUAL collection
      if (provider.preferred_collection === 'MANUAL') {
        log(`Skipping ${provider.name} - configured for MANUAL collection`);
        return null;
      }
      
      // Check if we already have fresh data (unless force refresh is requested)
      if (!forceRefresh) {
        const existingRate = await this.getBestRate(providerId, fromCurrency, toCurrency);
        if (existingRate) {
          log(`Using existing ${existingRate.source} rate from ${existingRate.timestamp}`);
          return existingRate;
        }
      }
      
      // Try to collect new data based on provider preferences
      let collectedRate: ExchangeRate | null = null;
      
      // First try API if available
      if (provider.has_api) {
        collectedRate = await this.collectFromApi(provider, fromCurrency, toCurrency);
      }
      
      // Fall back to web scraping if API failed or not available
      if (!collectedRate) {
        collectedRate = await this.collectFromScraper(provider, fromCurrency, toCurrency);
      }
      
      // Update the provider's last successful collection timestamp if we got a rate
      if (collectedRate) {
        await storage.updateProvider(providerId, {
          last_successful_collection: new Date()
        });
      }
      
      return collectedRate;
    } catch (error) {
      log(`Error collecting rates: ${error}`);
      return null;
    }
  }
  
  /**
   * Collect exchange rate from provider API
   */
  private async collectFromApi(
    provider: Provider, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    try {
      log(`Collecting rate from API for ${provider.name} (${fromCurrency} to ${toCurrency})`);
      
      // Check if provider has API configuration
      if (!provider.api_url) {
        log(`No API URL configured for ${provider.name}`);
        return null;
      }
      
      // Handle Wise API integration
      if (provider.name.toLowerCase().includes('wise') && provider.api_url && provider.api_url.includes('wise.com/rates/live')) {
        return await this.collectFromWiseApi(provider, fromCurrency, toCurrency);
      }

      // Handle Rate Bridge integration (LemFi and future bridge-backed providers)
      if (provider.api_url && provider.api_url.includes('trycloudflare.com')) {
        return await this.collectFromRateBridge(provider, fromCurrency, toCurrency);
      }

      // Add other provider API integrations here as needed
      log(`API implementation not available yet for ${provider.name}`);
      return null;
      
    } catch (error) {
      log(`Error collecting from API: ${error}`);
      return null;
    }
  }

  /**
   * Collect exchange rate from Wise API
   */
  private async collectFromWiseApi(
    provider: Provider,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    try {
      log(`[Wise API] Collecting rate for ${fromCurrency}/${toCurrency}`);
      
      // Import Wise API service
      const { wiseApiService } = await import('./wiseApiService.js');
      
      // Get rate from Wise API
      const result = await wiseApiService.getExchangeRate(fromCurrency, toCurrency, 100);
      
      if (!result || !result.rate) {
        log(`[Wise API] No rate returned for ${fromCurrency}/${toCurrency}`);
        return null;
      }
      
      log(`[Wise API] Successfully retrieved rate: ${result.rate} for ${fromCurrency}/${toCurrency}`);
      
      // Create exchange rate record with API source
      const exchangeRate: InsertExchangeRate = {
        provider_id: provider.id,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: result.rate,
        source: RateSourceType.API,
        source_url: provider.api_url,
        verified: true // API rates are considered verified
      };
      
      // Save to database
      return await storage.createExchangeRate(exchangeRate);
      
    } catch (error) {
      log(`[Wise API] Error collecting rate: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Collect exchange rate from the external Rate Bridge API.
   * The bridge sits at priority level equivalent to an API source —
   * rates are saved with source = API and verified = true.
   */
  private async collectFromRateBridge(
    provider: Provider,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    try {
      log(`[RateBridge] Collecting ${provider.name} ${fromCurrency}->${toCurrency} via bridge`);

      const { fetchBridgeRate } = await import('./rateBridgeService.js');

      const bridgeResult = await fetchBridgeRate(
        provider.name.toLowerCase(),
        fromCurrency,
        toCurrency
      );

      if (!bridgeResult || bridgeResult.rate <= 0) {
        log(`[RateBridge] No valid rate returned for ${provider.name}`);
        return null;
      }

      log(`[RateBridge] Got rate ${bridgeResult.rate} for ${provider.name} (${bridgeResult.extractionMode})`);

      const exchangeRate: InsertExchangeRate = {
        provider_id: provider.id,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: bridgeResult.rate,
        source: RateSourceType.API,
        source_url: provider.api_url || undefined,
        verified: true
      };

      return await storage.createExchangeRate(exchangeRate);
    } catch (error: any) {
      log(`[RateBridge] Error collecting rate: ${error.message}`);
      return null;
    }
  }

  /**
   * Collect exchange rate via web scraping
   */
  private async collectFromScraper(
    provider: Provider,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    try {
      log(`Collecting rate from web scraper for ${provider.name} (${fromCurrency} to ${toCurrency})`);
      
      // Import the appropriate scraper service
      const { scrapeProviderRate } = await import('../scrapers/providers');
      
      // Perform the scraping
      const rate = await scrapeProviderRate(provider, fromCurrency, toCurrency);
      
      if (!rate) {
        log(`Failed to scrape rate for ${provider.name}`);
        return null;
      }
      
      // Create exchange rate record with SCRAPER source
      const exchangeRate: InsertExchangeRate = {
        provider_id: provider.id,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        source: RateSourceType.SCRAPER,
        source_url: provider.scraping_url || undefined,
        verified: false
      };
      
      // Save to database
      return await storage.createExchangeRate(exchangeRate);
      
    } catch (error) {
      log(`Error collecting from scraper: ${error}`);
      return null;
    }
  }
  
  /**
   * Add a manual exchange rate entry
   */
  async addManualRate(
    providerId: number,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    notes: string = ''
  ): Promise<ExchangeRate | null> {
    try {
      log(`Adding manual rate for provider ${providerId}: ${rate} (${fromCurrency} to ${toCurrency})`);
      
      // Create exchange rate record with MANUAL source
      const exchangeRate: InsertExchangeRate = {
        provider_id: providerId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        source: RateSourceType.MANUAL,
        source_url: notes,
        verified: true
      };
      
      // Save to database
      return await storage.createExchangeRate(exchangeRate);
      
    } catch (error) {
      log(`Error adding manual rate: ${error}`);
      return null;
    }
  }
  
  /**
   * Schedule collection of all exchange rates
   * This should be called 3 times daily from a scheduler
   */
  async scheduleCollection(): Promise<void> {
    try {
      log('Starting scheduled rate collection');
      
      // Get all active providers
      const providers = await storage.getActiveProviders();
      log(`Found ${providers.length} active providers`);
      
      // Define currency pairs to collect
      const currencyPairs = [
        { from: 'GBP', to: 'NGN' },
        { from: 'EUR', to: 'NGN' },
        { from: 'GBP', to: 'GHS' },
        { from: 'EUR', to: 'GHS' }
      ];
      
      // Collect rates for each provider and currency pair
      for (const provider of providers) {
        for (const pair of currencyPairs) {
          try {
            const rate = await this.collectRates({
              providerId: provider.id,
              fromCurrency: pair.from,
              toCurrency: pair.to
            });
            
            if (rate) {
              log(`Collected ${rate.source} rate for ${provider.name}: ${rate.rate} (${pair.from} to ${pair.to})`);
            } else {
              log(`Failed to collect rate for ${provider.name} (${pair.from} to ${pair.to})`);
            }
            
            // Wait a bit between requests to avoid overwhelming servers
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            log(`Error collecting rate for ${provider.name} (${pair.from} to ${pair.to}): ${error}`);
          }
        }
      }
      
      log('Scheduled rate collection completed');
    } catch (error) {
      log(`Error in scheduled collection: ${error}`);
    }
  }
}

// Export singleton instance
export const rateCollectionService = new RateCollectionService();