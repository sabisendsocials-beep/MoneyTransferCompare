import { db } from './db';
import { 
  User, InsertUser, 
  Provider, InsertProvider, 
  ExchangeRate, InsertExchangeRate,
  News, InsertNews,
  TransferRequest, TransferResult,
  RateTrend, RateTrendResponse, RateStats,
  InsertRateTrend
} from '@shared/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import * as schema from '@shared/schema';

// Import the storage interface
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }
  
  // Provider methods
  async getProviders(): Promise<Provider[]> {
    return await db.select().from(schema.providers);
  }
  
  async getActiveProviders(): Promise<Provider[]> {
    return await db.select().from(schema.providers).where(eq(schema.providers.active, true));
  }
  
  async getProvider(id: number): Promise<Provider | undefined> {
    const [provider] = await db.select().from(schema.providers).where(eq(schema.providers.id, id));
    return provider;
  }
  
  async createProvider(provider: InsertProvider): Promise<Provider> {
    // Special handling for Wise provider
    if (provider.name === 'Wise') {
      // Force Wise to always use API collection method
      provider.preferred_collection = 'API';
      provider.has_api = true;
      provider.api_url = provider.api_url || 'https://api.wise.com/v1/rates';
      provider.api_key_required = true;
      provider.api_response_path = provider.api_response_path || 'rate';
      console.log('🔒 Enforcing API collection policy for Wise provider');
    }
    
    const [newProvider] = await db.insert(schema.providers).values(provider).returning();
    return newProvider;
  }
  
  async updateProvider(id: number, providerUpdate: Partial<InsertProvider>): Promise<Provider | undefined> {
    // Get existing provider to check if it's Wise
    const [existingProvider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, id));
      
    // Special handling for Wise provider
    if (existingProvider && (existingProvider.name === 'Wise' || providerUpdate.name === 'Wise')) {
      // Force Wise to always use API collection method
      providerUpdate.preferred_collection = 'API';
      providerUpdate.has_api = true;
      providerUpdate.api_url = providerUpdate.api_url || 'https://api.wise.com/v1/rates';
      providerUpdate.api_key_required = true;
      providerUpdate.api_response_path = providerUpdate.api_response_path || 'rate';
      console.log('🔒 Enforcing API collection policy for Wise provider');
    }
    
    const [updatedProvider] = await db
      .update(schema.providers)
      .set(providerUpdate)
      .where(eq(schema.providers.id, id))
      .returning();
    return updatedProvider;
  }
  
  async deleteAllProviders(): Promise<void> {
    // Core providers that should never be deleted
    const PROTECTED_CORE_PROVIDERS = [
      'Wise',
      'Western Union',
      'MoneyGram',
      'WorldRemit',
      'Lemfi'
    ];
    
    console.log('🔒 Protecting core providers from deletion');
    
    // Get all current providers
    const allProviders = await this.getProviders();
    
    // Delete all non-protected providers individually
    for (const provider of allProviders) {
      if (!PROTECTED_CORE_PROVIDERS.includes(provider.name)) {
        await db.delete(schema.providers).where(eq(schema.providers.id, provider.id));
        console.log(`Deleted provider: ${provider.name}`);
      } else {
        console.log(`Protected core provider preserved: ${provider.name}`);
      }
    }
    
    console.log('✅ Provider deletion operation completed (core providers preserved)');
  }
  
  // Add a new method to update providers without affecting rates
  async updateProvidersOnly(): Promise<void> {
    // Delete providers but keep the exchange rates for historical data
    await db.delete(schema.providers);
    console.log('Cleared existing providers (rates preserved)');
  }
  
  // Add method to update rate verification status
  async updateRateVerification(providerId: number, fromCurrency: string, toCurrency: string, verified: boolean): Promise<boolean> {
    try {
      // Update the verification status for this provider's rates
      await db
        .update(schema.exchangeRates)
        .set({ verified })
        .where(
          and(
            eq(schema.exchangeRates.provider_id, providerId),
            eq(schema.exchangeRates.from_currency, fromCurrency),
            eq(schema.exchangeRates.to_currency, toCurrency)
          )
        );
      
      return true;
    } catch (error) {
      console.error(`Error updating rate verification: ${error}`);
      return false;
    }
  }
  
  // Exchange rate methods
  async getLatestRates(fromCurrency: string, toCurrency: string): Promise<ExchangeRate[]> {
    // Get providers first
    const providers = await this.getActiveProviders();
    const providerIds = providers.map(p => p.id);
    
    // For each provider, get the latest rate
    const latestRatesPromises = providerIds.map(async providerId => {
      const [rate] = await db
        .select()
        .from(schema.exchangeRates)
        .where(
          and(
            eq(schema.exchangeRates.provider_id, providerId),
            eq(schema.exchangeRates.from_currency, fromCurrency),
            eq(schema.exchangeRates.to_currency, toCurrency)
          )
        )
        .orderBy(desc(schema.exchangeRates.timestamp))
        .limit(1);
      
      return rate;
    });
    
    const rates = await Promise.all(latestRatesPromises);
    return rates.filter(Boolean) as ExchangeRate[];
  }
  
  async createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate> {
    const [newRate] = await db.insert(schema.exchangeRates).values(rate).returning();
    return newRate;
  }
  
  async getRatesByProvider(
    providerId: number, 
    fromCurrency: string, 
    toCurrency: string, 
    limit: number
  ): Promise<ExchangeRate[]> {
    return await db
      .select()
      .from(schema.exchangeRates)
      .where(
        and(
          eq(schema.exchangeRates.provider_id, providerId),
          eq(schema.exchangeRates.from_currency, fromCurrency),
          eq(schema.exchangeRates.to_currency, toCurrency)
        )
      )
      .orderBy(desc(schema.exchangeRates.timestamp))
      .limit(limit);
  }
  
  // News methods
  async getLatestNews(limit: number): Promise<News[]> {
    return await db
      .select()
      .from(schema.news)
      .orderBy(desc(schema.news.timestamp))
      .limit(limit);
  }
  
  async createNews(newsItem: InsertNews): Promise<News> {
    const [newNews] = await db.insert(schema.news).values(newsItem).returning();
    return newNews;
  }
  
  async deleteAllNews(): Promise<void> {
    // Delete all news entries
    await db.delete(schema.news);
    console.log('All news have been deleted from the database');
  }
  
  // Comparison methods
  async compareTransferOptions(request: TransferRequest): Promise<TransferResult[]> {
    // Get latest rates for all providers
    const rates = await this.getLatestRates(request.fromCurrency, request.toCurrency);
    const providers = await this.getActiveProviders();
    
    // Map providers to their rates
    const providerRatesMap = new Map<number, ExchangeRate>();
    rates.forEach(rate => {
      providerRatesMap.set(rate.provider_id, rate);
    });
    
    // Calculate results for each provider
    const results: TransferResult[] = [];
    
    for (const provider of providers) {
      const rate = providerRatesMap.get(provider.id);
      
      if (rate) {
        let sendAmount = request.amount;
        let receivedAmount = request.amount;
        let fee = provider.fixed_fee || 0;
        
        // If percentage fee exists, calculate it
        if (provider.percentage_fee) {
          fee += (request.amount * provider.percentage_fee / 100);
        }
        
        // Calculate based on whether this is a "send" or "receive" request
        if (request.type === 'send') {
          // For "send" type, deduct fees first, then apply exchange rate
          const amountAfterFees = request.amount - fee;
          console.log(`Provider: ${provider.name}, Amount: ${request.amount}, Fee: ${fee}, Amount After Fees: ${amountAfterFees}, Exchange Rate: ${rate.rate}`);
          receivedAmount = amountAfterFees * rate.rate;
          console.log(`Received Amount: ${receivedAmount}`);
        } else {
          sendAmount = (request.amount / rate.rate);
          // For "receive" type, add the fee to the send amount
          if (fee > 0) {
            sendAmount += fee;
          }
        }
        
        // Use provider information directly from the database
        let finalFee = fee;
        let finalTransferTime = provider.transfer_time || 'Unknown';
        
        // Determine rate source based on provider
        let rateSource: 'api' | 'scraping' | 'screenshot' | 'unavailable' = 'scraping';
        if (provider.name === 'Wise') {
          rateSource = 'api'; // Wise uses API integration
        } else if (['WorldRemit', 'Nala', 'MoneyGram', 'Western Union'].includes(provider.name)) {
          rateSource = 'screenshot'; // These have screenshot-verified rates
        }
        
        results.push({
          providerId: provider.id,
          providerName: provider.name,
          providerLogo: provider.logo,
          rating: provider.rating,
          exchangeRate: rate.rate,
          fee: finalFee,
          receivedAmount: finalFee === 0 ? request.amount * rate.rate : (request.amount - finalFee) * rate.rate, // Always recalculate based on final fee
          sendAmount,
          transferTime: finalTransferTime,
          totalCost: finalFee,
          websiteUrl: provider.website_url,
          lastUpdated: rate.timestamp.toISOString(),
          lastChecked: new Date().toISOString(),
          rateSource: rateSource,
          comment: provider.comment || null // Include provider comment if available
        });
      }
    }
    
    // Sort by the most received amount (best deal first)
    return results.sort((a, b) => b.receivedAmount - a.receivedAmount);
  }
  
  // Rate trend methods
  async getRateTrends(fromCurrency: string, toCurrency: string, days: number): Promise<RateTrendResponse[]> {
    console.log(`Getting ${days}-day rate trends for ${fromCurrency}/${toCurrency}...`);
    
    try {
      // Check if we should fetch fresh data from the API
      const shouldRefresh = await this.shouldRefreshRateTrends(fromCurrency, toCurrency);
      
      if (shouldRefresh) {
        console.log(`Rate trend data for ${fromCurrency}/${toCurrency} requires refresh from API`);
        
        // Update trends from the API
        try {
          const { fetchHistoricalRates } = await import('./api/exchangeRateApi');
          const freshTrends = await fetchHistoricalRates(fromCurrency, toCurrency, days);
          
          if (freshTrends && freshTrends.length > 0) {
            // Save the fresh trends to the database
            await this.updateRateTrends(fromCurrency, toCurrency, freshTrends);
            console.log(`Successfully refreshed rate trends for ${fromCurrency}/${toCurrency} from API`);
          } else {
            console.warn(`API returned no trend data for ${fromCurrency}/${toCurrency}`);
          }
        } catch (apiError) {
          console.error(`Error refreshing rate trends from API:`, apiError);
          // Continue to use existing data if available
        }
      } else {
        console.log(`Using cached rate trend data for ${fromCurrency}/${toCurrency}`);
      }
      
      // Retrieve trends from database
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const trendData = await db.select()
        .from(schema.rateTrends)
        .where(
          and(
            eq(schema.rateTrends.from_currency, fromCurrency),
            eq(schema.rateTrends.to_currency, toCurrency),
            sql`${schema.rateTrends.date} >= ${startDate.toISOString().split('T')[0]}`
          )
        )
        .orderBy(schema.rateTrends.date);
      
      if (trendData && trendData.length > 0) {
        // Convert database records to API response format
        const trends: RateTrendResponse[] = trendData.map(trend => {
          // Format the date to YYYY-MM-DD
          let dateStr = '';
          
          if (trend.date) {
            // For safety, handle the date conversion in a try-catch
            try {
              const dateObj = new Date(trend.date);
              dateStr = dateObj.toISOString().split('T')[0];
            } catch (e) {
              console.error(`Error converting date: ${trend.date}`, e);
              // Use current date as fallback
              dateStr = new Date().toISOString().split('T')[0];
            }
          } else {
            // Fallback if date is null/undefined
            dateStr = new Date().toISOString().split('T')[0];
          }
              
          return {
            date: dateStr,
            rate: trend.rate,
            from_currency: trend.from_currency,
            to_currency: trend.to_currency
          };
        });
        
        // Sort trends by date to ensure they appear chronologically in chart
        const sortedTrends = trends.sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        // Log some debug information
        if (sortedTrends.length > 0) {
          console.log(`First data point: ${JSON.stringify(sortedTrends[0])}`);
          console.log(`Last data point: ${JSON.stringify(sortedTrends[sortedTrends.length-1])}`);
        }
        
        console.log(`Retrieved ${sortedTrends.length} trend data points from database (sorted by date)`);
        return sortedTrends;
      }
      
      // If no data in database, fetch from API directly
      console.log(`No stored trend data found, fetching directly from API`);
      const { fetchHistoricalRates } = await import('./api/exchangeRateApi');
      const apiTrends = await fetchHistoricalRates(fromCurrency, toCurrency, days);
      
      if (apiTrends && apiTrends.length > 0) {
        // Sort trends by date to ensure chronological order
        const sortedApiTrends = [...apiTrends].sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        // Log some debug information
        if (sortedApiTrends.length > 0) {
          console.log(`API data - First point: ${JSON.stringify(sortedApiTrends[0])}`);
          console.log(`API data - Last point: ${JSON.stringify(sortedApiTrends[sortedApiTrends.length-1])}`);
        }
        
        // Store the trends for future use
        await this.updateRateTrends(fromCurrency, toCurrency, sortedApiTrends);
        return sortedApiTrends;
      }
      
      // If all else fails, return empty array (no synthetic data generation)
      console.error(`CRITICAL: Failed to get any rate trend data for ${fromCurrency}/${toCurrency}`);
      return [];
    } catch (error) {
      console.error(`Error retrieving rate trends:`, error);
      return [];
    }
  }
  
  async getRateStats(fromCurrency: string, toCurrency: string): Promise<RateStats> {
    console.log(`Calculating rate stats for ${fromCurrency} to ${toCurrency} from rate_trends...`);
    
    try {
      // Get all trend data for this currency pair, ordered by date
      const trendsResult = await db.execute<{ 
        date: string;
        rate: number;
      }>(sql`
        SELECT date, rate
        FROM rate_trends
        WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
        ORDER BY date ASC
      `);
      
      console.log(`Found ${trendsResult.rows.length} trend data points`);
      
      // Return empty stats if no data
      if (!trendsResult.rows.length) {
        return {
          thirtyDayHigh: null,
          thirtyDayHighDate: null,
          thirtyDayLow: null,
          thirtyDayLowDate: null,
          thirtyDayAverage: null,
          oneMonthChange: null,
          threeMonthChange: null,
          oneYearChange: null,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Map the data for easier use
      const trendData = trendsResult.rows.map(row => ({
        date: row.date as string,
        rate: row.rate as number
      }));
      
      // Get the latest 30 entries for 30-day calculations
      const last30Days = trendData.slice(-30);
      
      // Calculate 30-day high/low/average
      let thirtyDayHigh = -Infinity;
      let thirtyDayHighDate = '';
      let thirtyDayLow = Infinity;
      let thirtyDayLowDate = '';
      let thirtyDaySum = 0;
      
      for (const point of last30Days) {
        if (point.rate > thirtyDayHigh) {
          thirtyDayHigh = point.rate;
          thirtyDayHighDate = point.date;
        }
        if (point.rate < thirtyDayLow) {
          thirtyDayLow = point.rate;
          thirtyDayLowDate = point.date;
        }
        thirtyDaySum += point.rate;
      }
      
      const thirtyDayAverage = last30Days.length > 0 ? thirtyDaySum / last30Days.length : null;
      
      // Calculate changes: compare first and last values
      const currentRate = trendData[trendData.length - 1].rate;
      
      // Get the rate from 30 days ago (or the first available)
      const oneMonthAgoRate = trendData.length > 30 ? trendData[trendData.length - 31].rate : trendData[0].rate;
      
      // Get the rate from 90 days ago (or the first available)
      const threeMonthAgoRate = trendData.length > 90 ? trendData[trendData.length - 91].rate : trendData[0].rate;
      
      // Get the rate from 365 days ago (or the first available)
      const oneYearAgoRate = trendData.length > 365 ? trendData[trendData.length - 366].rate : trendData[0].rate;
      
      // Calculate percentage changes
      const oneMonthChange = ((currentRate - oneMonthAgoRate) / oneMonthAgoRate) * 100;
      const threeMonthChange = ((currentRate - threeMonthAgoRate) / threeMonthAgoRate) * 100;
      const oneYearChange = ((currentRate - oneYearAgoRate) / oneYearAgoRate) * 100;
      
      return {
        thirtyDayHigh: thirtyDayHigh !== -Infinity ? thirtyDayHigh : null,
        thirtyDayHighDate: thirtyDayHighDate || null,
        thirtyDayLow: thirtyDayLow !== Infinity ? thirtyDayLow : null,
        thirtyDayLowDate: thirtyDayLowDate || null,
        thirtyDayAverage,
        oneMonthChange: isFinite(oneMonthChange) ? parseFloat(oneMonthChange.toFixed(2)) : null,
        threeMonthChange: isFinite(threeMonthChange) ? parseFloat(threeMonthChange.toFixed(2)) : null,
        oneYearChange: isFinite(oneYearChange) ? parseFloat(oneYearChange.toFixed(2)) : null,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error calculating stats for ${fromCurrency}-${toCurrency}:`, error);
      
      // Return empty stats on error
      return {
        thirtyDayHigh: null,
        thirtyDayHighDate: null,
        thirtyDayLow: null,
        thirtyDayLowDate: null,
        thirtyDayAverage: null,
        oneMonthChange: null,
        threeMonthChange: null,
        oneYearChange: null,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async updateRateTrends(fromCurrency: string, toCurrency: string, trends: RateTrendResponse[]): Promise<void> {
    console.log(`Storing ${trends.length} rate trend points for ${fromCurrency}/${toCurrency}...`);
    
    try {
      // Begin a transaction
      await db.transaction(async (tx) => {
        // Delete existing trends for this currency pair
        await tx.delete(schema.rateTrends)
          .where(
            and(
              eq(schema.rateTrends.from_currency, fromCurrency),
              eq(schema.rateTrends.to_currency, toCurrency)
            )
          );
        
        // Insert new trends as a batch
        if (trends.length > 0) {
          // Map the trends to the database schema format
          // Map trends to a format compatible with the database
          const trendValues = trends.map(trend => {
            // Convert the date string to a format that works with SQL
            const dateStr = trend.date.split('T')[0]; // Ensure format is YYYY-MM-DD
            
            return {
              from_currency: fromCurrency,
              to_currency: toCurrency,
              date: dateStr, // Use the string format which gets converted by Drizzle
              rate: trend.rate
            };
          });
          
          // Insert the batch of trends
          await tx.insert(schema.rateTrends).values(trendValues);
        }
        
        // Update the cache timestamp
        const existingCache = await tx.select()
          .from(schema.rateCache)
          .where(
            and(
              eq(schema.rateCache.from_currency, fromCurrency),
              eq(schema.rateCache.to_currency, toCurrency)
            )
          );
        
        if (existingCache.length > 0) {
          // Update existing cache entry
          await tx.update(schema.rateCache)
            .set({ last_updated: new Date() })
            .where(
              and(
                eq(schema.rateCache.from_currency, fromCurrency),
                eq(schema.rateCache.to_currency, toCurrency)
              )
            );
        } else {
          // Create new cache entry
          await tx.insert(schema.rateCache).values({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            last_updated: new Date()
          });
        }
      });
      
      console.log(`Successfully updated rate trends for ${fromCurrency}/${toCurrency}`);
    } catch (error) {
      console.error(`Error updating rate trends for ${fromCurrency}/${toCurrency}:`, error);
      throw error;
    }
  }
  
  // Check if we should refresh the rate trends data
  async shouldRefreshRateTrends(fromCurrency: string, toCurrency: string): Promise<boolean> {
    try {
      // Get the last fetch time from cache
      const cacheEntries = await db.select()
        .from(schema.rateCache)
        .where(
          and(
            eq(schema.rateCache.from_currency, fromCurrency),
            eq(schema.rateCache.to_currency, toCurrency)
          )
        );
      
      if (cacheEntries.length === 0) {
        // No cache entry found, should fetch new data
        return true;
      }
      
      const lastFetchTime = cacheEntries[0].last_updated;
      const now = new Date();
      const hoursSinceLastFetch = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60 * 60);
      
      // Refresh if it's been more than 12 hours
      return hoursSinceLastFetch >= 12;
    } catch (error) {
      console.error(`Error checking rate trends refresh status:`, error);
      // On error, assume we should refresh to be safe
      return true;
    }
  }
  
  async deleteAllExchangeRates(): Promise<void> {
    await db.delete(schema.exchangeRates);
    console.log('Deleted all exchange rates from database');
  }
  
  async deleteExchangeRatesForProvider(providerId: number, fromCurrency: string, toCurrency: string): Promise<void> {
    await db.delete(schema.exchangeRates)
      .where(
        and(
          eq(schema.exchangeRates.provider_id, providerId),
          eq(schema.exchangeRates.from_currency, fromCurrency),
          eq(schema.exchangeRates.to_currency, toCurrency)
        )
      );
    console.log(`Deleted exchange rates for provider ${providerId} (${fromCurrency} → ${toCurrency})`);
  }
}