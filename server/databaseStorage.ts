import { db } from './db';
import { IStorage } from './storage';
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
    const [newProvider] = await db.insert(schema.providers).values(provider).returning();
    return newProvider;
  }
  
  async updateProvider(id: number, providerUpdate: Partial<InsertProvider>): Promise<Provider | undefined> {
    const [updatedProvider] = await db
      .update(schema.providers)
      .set(providerUpdate)
      .where(eq(schema.providers.id, id))
      .returning();
    return updatedProvider;
  }
  
  async deleteAllProviders(): Promise<void> {
    // First delete all exchange rates (due to foreign key constraints)
    await db.delete(schema.exchangeRates);
    
    // Then delete all providers
    await db.delete(schema.providers);
    
    console.log('All providers and their exchange rates have been deleted');
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
        
        // Override specific provider settings based on latest information from realRates.ts
        let finalFee = fee;
        let finalTransferTime = provider.transfer_time || 'Unknown';
        
        // Provider-specific adjustments
        switch (provider.name) {
          case 'Lemfi':
            finalFee = 0;
            finalTransferTime = 'Minutes';
            break;
          case 'TorFX':
            // TorFX has zero fees
            finalFee = 0;
            break;
          case 'Wise':
            finalFee = 3.56;
            finalTransferTime = '1-2 days';
            break;
          case 'Western Union':
            finalFee = 2.99;
            finalTransferTime = '1-3 days';
            break;
          case 'MoneyGram':
            finalFee = 3.99;
            finalTransferTime = '1-2 days';
            break;
          case 'Remitly':
            finalFee = 2.49;
            finalTransferTime = 'Same day';
            break;
          case 'WorldRemit':
            finalFee = 2.99;
            finalTransferTime = '1-3 days';
            break;
          case 'Nala':
            finalFee = 1.50;
            finalTransferTime = 'Same day';
            break;
        }
        
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
          rateSource: rateSource
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
        
        console.log(`Retrieved ${trends.length} trend data points from database`);
        return trends;
      }
      
      // If no data in database, fetch from API directly
      console.log(`No stored trend data found, fetching directly from API`);
      const { fetchHistoricalRates } = await import('./api/exchangeRateApi');
      const apiTrends = await fetchHistoricalRates(fromCurrency, toCurrency, days);
      
      if (apiTrends && apiTrends.length > 0) {
        // Store the trends for future use
        await this.updateRateTrends(fromCurrency, toCurrency, apiTrends);
        return apiTrends;
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
    // Get the last year's data for analysis
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const rates = await db.execute<{ 
      rate: number; 
      timestamp: string;
    }>(sql`
      SELECT rate, timestamp
      FROM ${schema.exchangeRates}
      WHERE 
        "from_currency" = ${fromCurrency} AND 
        "to_currency" = ${toCurrency} AND
        "timestamp" >= ${oneYearAgo.toISOString()}
      ORDER BY timestamp DESC
    `);
    
    // If no data, return empty stats with null values rather than fallbacks
    if (rates.rows.length === 0) {
      return {
        lastUpdated: new Date().toISOString(), // Always provide the current date/time as last update
        thirtyDayHigh: null,
        thirtyDayHighDate: null,
        thirtyDayLow: null,
        thirtyDayLowDate: null,
        thirtyDayAverage: null,
        oneMonthChange: null,
        threeMonthChange: null,
        oneYearChange: null
      };
    }
    
    // Calculate 30-day stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Convert query result to array for easier processing
    const ratesArray = rates.rows || [];
    
    const thirtyDayRates = ratesArray.filter(r => new Date(r.timestamp) >= thirtyDaysAgo);
    
    let thirtyDayHigh = -Infinity;
    let thirtyDayHighDate = '';
    let thirtyDayLow = Infinity;
    let thirtyDayLowDate = '';
    let thirtyDaySum = 0;
    
    for (const r of thirtyDayRates) {
      if (r.rate > thirtyDayHigh) {
        thirtyDayHigh = r.rate;
        thirtyDayHighDate = r.timestamp;
      }
      if (r.rate < thirtyDayLow) {
        thirtyDayLow = r.rate;
        thirtyDayLowDate = r.timestamp;
      }
      thirtyDaySum += r.rate;
    }
    
    // Only use real data, no fallbacks
    const thirtyDayAverage = thirtyDayRates.length > 0 ? thirtyDaySum / thirtyDayRates.length : ratesArray[0]?.rate || null;
    
    // Calculate changes over different periods - only using actual data
    const latestRate = ratesArray[0]?.rate || null;
    
    if (latestRate === null) {
      // If we don't have a latest rate, we can't calculate changes
      return {
        lastUpdated: new Date().toISOString(), // Always provide the current date/time as last update
        thirtyDayHigh: null,
        thirtyDayHighDate: null, 
        thirtyDayLow: null,
        thirtyDayLowDate: null,
        thirtyDayAverage: null,
        oneMonthChange: null,
        threeMonthChange: null,
        oneYearChange: null
      };
    }
    
    // Find rate 1 month ago - no fallback
    const oneMonthAgoData = ratesArray.find(r => new Date(r.timestamp) <= thirtyDaysAgo);
    const oneMonthAgoRate = oneMonthAgoData ? oneMonthAgoData.rate : null;
    
    // Find rate 3 months ago - no fallback
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthAgoData = ratesArray.find(r => new Date(r.timestamp) <= threeMonthsAgo);
    const threeMonthAgoRate = threeMonthAgoData ? threeMonthAgoData.rate : null;
    
    // Find rate 1 year ago - no fallback
    const oneYearAgoData = ratesArray.find(r => new Date(r.timestamp) <= oneYearAgo);
    const oneYearAgoRate = oneYearAgoData ? oneYearAgoData.rate : null;
    
    // Calculate percentage changes only if we have the historical rates
    const oneMonthChange = oneMonthAgoRate !== null 
      ? ((latestRate - oneMonthAgoRate) / oneMonthAgoRate) * 100 
      : null;
      
    const threeMonthChange = threeMonthAgoRate !== null 
      ? ((latestRate - threeMonthAgoRate) / threeMonthAgoRate) * 100 
      : null;
      
    const oneYearChange = oneYearAgoRate !== null 
      ? ((latestRate - oneYearAgoRate) / oneYearAgoRate) * 100 
      : null;
    
    const lastUpdated = new Date().toISOString();
    
    return {
      lastUpdated,
      thirtyDayHigh,
      thirtyDayHighDate,
      thirtyDayLow,
      thirtyDayLowDate,
      thirtyDayAverage,
      oneMonthChange,
      threeMonthChange,
      oneYearChange
    };
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
            .set({ last_fetch_time: new Date() })
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
            last_fetch_time: new Date()
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
      
      const lastFetchTime = cacheEntries[0].last_fetch_time;
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