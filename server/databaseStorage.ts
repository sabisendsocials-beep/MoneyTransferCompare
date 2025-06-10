import { db } from './db';
import { 
  User, InsertUser, UpsertUser,
  UserPreferences, InsertUserPreferences,
  Provider, InsertProvider, 
  ExchangeRate, InsertExchangeRate,
  News, InsertNews,
  TransferRequest, TransferResult,
  RateTrend, RateTrendResponse, RateStats,
  InsertRateTrend,
  ContactSubmission, InsertContactSubmission,
  NewsletterSubscription, InsertNewsletterSubscription,
  BlogPost, InsertBlogPost,
  SystemSetting, InsertSystemSetting,
  RateAlert, InsertRateAlert,
  contactSubmissions, newsletterSubscriptions, blogPosts, systemSettings,
  users, userPreferences, rateAlerts, sessions
} from '@shared/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { filterFreshRates, isRateFresh } from './utils/rateFilter';
import { rateStatsService } from './services/rateStatsService';

// Import the storage interface
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  // User methods - updated for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; password: string; firstName?: string; lastName?: string }): Promise<User> {
    const userId = crypto.randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Note: This method is kept for interface compatibility but not used in Replit Auth
    return undefined;
  }



  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async updateUserPreferences(userId: string, preferences: InsertUserPreferences): Promise<UserPreferences> {
    // Check if preferences exist
    const existing = await this.getUserPreferences(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userPreferences)
        .values({
          ...preferences,
          userId,
        })
        .returning();
      return created;
    }
  }

  // Rate alerts methods for logged-in users
  async getUserRateAlerts(userId: string): Promise<RateAlert[]> {
    return await db
      .select()
      .from(rateAlerts)
      .where(eq(rateAlerts.userId, userId))
      .orderBy(desc(rateAlerts.created_at));
  }

  async updateRateAlert(alertId: number, userId: string, updates: Partial<InsertRateAlert>): Promise<RateAlert | undefined> {
    const [updated] = await db
      .update(rateAlerts)
      .set(updates)
      .where(and(
        eq(rateAlerts.id, alertId),
        eq(rateAlerts.userId, userId)
      ))
      .returning();
    return updated;
  }

  async deleteRateAlert(alertId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(rateAlerts)
      .where(and(
        eq(rateAlerts.id, alertId),
        eq(rateAlerts.userId, userId)
      ));
    return result.rowCount !== undefined && result.rowCount > 0;
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
      
    // DISABLED: Wise enforcement removed - admin panel has full control
    console.log('✓ Wise enforcement disabled - admin panel has full control');
    
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
  
  // Enhanced secure method to update providers without affecting rates
  async updateProvidersOnly(): Promise<void> {
    // SECURITY: Never allow bulk deletion of providers
    console.error('🚫 CRITICAL SECURITY BLOCK: Attempted bulk provider deletion');
    console.error('🔒 Provider records are protected and can only be modified through the admin panel');
    console.error('⚠️ This operation has been blocked to protect your data');
    
    // Instead of deleting, we'll log the attempt and take no action
    console.log('✅ Provider data preserved and protected');
    
    // Return without performing any deletion
    return;
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
    
    // Get configurable rate freshness threshold
    const { getMaxRateAgeHours } = await import('./utils/rateFilter');
    const maxAgeHours = await getMaxRateAgeHours();
    
    // Calculate cutoff time using configurable threshold
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
    
    // For each provider, get the latest rate within the configured freshness window
    const latestRatesPromises = providerIds.map(async providerId => {
      const [rate] = await db
        .select()
        .from(schema.exchangeRates)
        .where(
          and(
            eq(schema.exchangeRates.provider_id, providerId),
            eq(schema.exchangeRates.from_currency, fromCurrency),
            eq(schema.exchangeRates.to_currency, toCurrency),
            gte(schema.exchangeRates.timestamp, cutoffTime)
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
    // Get configurable rate freshness threshold
    const { getMaxRateAgeHours } = await import('./utils/rateFilter');
    const maxAgeHours = await getMaxRateAgeHours();
    
    // Calculate cutoff time using configurable threshold
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
    
    return await db
      .select()
      .from(schema.exchangeRates)
      .where(
        and(
          eq(schema.exchangeRates.provider_id, providerId),
          eq(schema.exchangeRates.from_currency, fromCurrency),
          eq(schema.exchangeRates.to_currency, toCurrency),
          gte(schema.exchangeRates.timestamp, cutoffTime)
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

  async deleteOldNews(beforeDate: Date): Promise<void> {
    // Delete news entries older than the specified date
    await db.delete(schema.news).where(sql`${schema.news.published_at} < ${beforeDate}`);
    console.log(`Deleted news older than ${beforeDate.toISOString()}`);
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
        
        // Calculate based on whether this is a "send" or "receive" request
        if (request.type === 'send') {
          // For "send" type, calculate percentage fee based on send amount
          if (provider.percentage_fee) {
            fee += (request.amount * provider.percentage_fee / 100);
          }
          
          // Deduct fees first, then apply exchange rate
          const amountAfterFees = request.amount - fee;
          console.log(`Provider: ${provider.name}, Amount: ${request.amount}, Fee: ${fee}, Amount After Fees: ${amountAfterFees}, Exchange Rate: ${rate.rate}`);
          receivedAmount = amountAfterFees * rate.rate;
          console.log(`Received Amount: ${receivedAmount}`);
        } else {
          // For "receive" type, calculate how much GBP you need to send to get the desired amount
          receivedAmount = request.amount; // They want to receive this exact amount
          
          // Calculate base send amount (before fees)
          const baseSendAmount = request.amount / rate.rate;
          
          if (provider.percentage_fee && provider.percentage_fee > 0) {
            // For percentage fees in receive mode, add the percentage to the base send amount
            fee = baseSendAmount * (provider.percentage_fee / 100);
            sendAmount = baseSendAmount + fee;
          } else {
            // For fixed fees, just add the fixed fee to the base send amount
            sendAmount = baseSendAmount + fee;
          }
          
          console.log(`Provider: ${provider.name}, To Receive: ${request.amount} NGN, Send Amount: ${sendAmount} GBP, Fee: ${fee}, Exchange Rate: ${rate.rate}`);
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
          receivedAmount: receivedAmount,
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
    
    // Sort based on the request type
    if (request.type === 'receive') {
      // For receive mode, sort by lowest send amount (best deal = least money to send)
      return results.sort((a, b) => a.sendAmount - b.sendAmount);
    } else {
      // For send mode, sort by highest received amount (best deal = most money received)
      return results.sort((a, b) => b.receivedAmount - a.receivedAmount);
    }
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
    return rateStatsService.getRateStats(fromCurrency, toCurrency);
  }

  async getRateStatsLegacy(fromCurrency: string, toCurrency: string): Promise<RateStats> {
    console.log(`Calculating rate stats for ${fromCurrency} to ${toCurrency}...`);
    
    try {
      // Single efficient query to get all needed historical data
      const trendsResult = await db.execute<{ 
        date: string;
        rate: number;
      }>(sql`
        SELECT date, rate
        FROM rate_trends
        WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
        ORDER BY date DESC
        LIMIT 500
      `);
      
      console.log(`Found ${trendsResult.rows.length} recent trend data points`);
      
      if (!trendsResult.rows.length) {
        return {
          currentRate: null,
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
      
      // Data is ordered DESC, so first item is most recent
      const trendData = trendsResult.rows.map(row => ({
        date: row.date as string,
        rate: row.rate as number
      })).filter(row => row.rate > 0); // Filter out invalid rates
      
      if (!trendData.length) {
        return {
          currentRate: null,
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
      
      const currentRate = trendData[0].rate;
      const currentDate = new Date(trendData[0].date);
      
      // Simple and efficient: find rates at specific time intervals
      const oneMonthAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      
      // Find historical rates using efficient single-pass algorithm
      let oneMonthRate = null;
      let threeMonthRate = null;  
      let oneYearRate = null;
      
      let oneMonthDiff = Infinity;
      let threeMonthDiff = Infinity;
      let oneYearDiff = Infinity;
      
      // Single pass through data to find all historical points
      for (const point of trendData) {
        const pointDate = new Date(point.date);
        
        // Check 1 month ago
        const diff1 = Math.abs(pointDate.getTime() - oneMonthAgo.getTime());
        if (diff1 < oneMonthDiff) {
          oneMonthDiff = diff1;
          oneMonthRate = point.rate;
        }
        
        // Check 3 months ago
        const diff3 = Math.abs(pointDate.getTime() - threeMonthsAgo.getTime());
        if (diff3 < threeMonthDiff) {
          threeMonthDiff = diff3;
          threeMonthRate = point.rate;
        }
        
        // Check 1 year ago
        const diff12 = Math.abs(pointDate.getTime() - oneYearAgo.getTime());
        if (diff12 < oneYearDiff) {
          oneYearDiff = diff12;
          oneYearRate = point.rate;
        }
      }
      
      // Calculate 30-day statistics from recent data
      const last30Days = trendData.slice(0, Math.min(30, trendData.length));
      let thirtyDayHigh = Math.max(...last30Days.map(p => p.rate));
      let thirtyDayLow = Math.min(...last30Days.map(p => p.rate));
      let thirtyDayAverage = last30Days.reduce((sum, p) => sum + p.rate, 0) / last30Days.length;
      
      // Find dates for high/low
      const highPoint = last30Days.find(p => p.rate === thirtyDayHigh);
      const lowPoint = last30Days.find(p => p.rate === thirtyDayLow);
      
      // Calculate percentage changes efficiently
      const oneMonthChange = oneMonthRate ? ((currentRate - oneMonthRate) / oneMonthRate * 100) : null;
      const threeMonthChange = threeMonthRate ? ((currentRate - threeMonthRate) / threeMonthRate * 100) : null;
      const oneYearChange = oneYearRate ? ((currentRate - oneYearRate) / oneYearRate * 100) : null;
      
      return {
        currentRate,
        thirtyDayHigh,
        thirtyDayHighDate: highPoint?.date || null,
        thirtyDayLow,
        thirtyDayLowDate: lowPoint?.date || null,
        thirtyDayAverage: parseFloat(thirtyDayAverage.toFixed(2)),
        oneMonthChange: oneMonthChange ? parseFloat(oneMonthChange.toFixed(2)) : null,
        threeMonthChange: threeMonthChange ? parseFloat(threeMonthChange.toFixed(2)) : null,
        oneYearChange: oneYearChange ? parseFloat(oneYearChange.toFixed(2)) : null,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error calculating stats for ${fromCurrency}-${toCurrency}:`, error);
      
      return {
        currentRate: null, 
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

  // Contact form submission methods
  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    const [newSubmission] = await db.insert(schema.contactSubmissions)
      .values(submission)
      .returning();
    
    console.log(`New contact submission created: ID #${newSubmission.id} from ${submission.name}`);
    return newSubmission;
  }

  // Newsletter subscription methods
  async createNewsletterSubscription(subscription: InsertNewsletterSubscription): Promise<NewsletterSubscription> {
    try {
      const [newSubscription] = await db.insert(newsletterSubscriptions)
        .values(subscription)
        .returning();
      
      console.log(`New newsletter subscription: ${subscription.email}`);
      return newSubscription;
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`Email already subscribed: ${subscription.email}`);
        const [existing] = await db.select()
          .from(newsletterSubscriptions)
          .where(eq(newsletterSubscriptions.email, subscription.email));
        return existing;
      }
      throw error;
    }
  }

  async getNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
    return await db.select()
      .from(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.active, true))
      .orderBy(desc(newsletterSubscriptions.subscribed_at));
  }
  
  async getContactSubmissions(limit: number = 100): Promise<ContactSubmission[]> {
    return await db.select()
      .from(schema.contactSubmissions)
      .orderBy(desc(schema.contactSubmissions.created_at))
      .limit(limit);
  }
  
  async updateContactSubmissionStatus(id: number, status: string): Promise<ContactSubmission | undefined> {
    const [updatedSubmission] = await db.update(schema.contactSubmissions)
      .set({ 
        status, 
        updated_at: new Date() 
      })
      .where(eq(schema.contactSubmissions.id, id))
      .returning();
    
    return updatedSubmission;
  }

  // Blog post methods
  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const postData = {
      ...post,
      published_at: post.status === 'published' ? new Date() : null
    };
    
    const [newPost] = await db.insert(blogPosts)
      .values(postData)
      .returning();
    
    console.log(`New blog post created: "${newPost.title}" (${newPost.status})`);
    return newPost;
  }

  async getBlogPosts(status?: string, limit: number = 50): Promise<BlogPost[]> {
    let query = db.select().from(blogPosts);
    
    if (status) {
      query = query.where(eq(blogPosts.status, status));
    }
    
    return await query
      .orderBy(desc(blogPosts.created_at))
      .limit(limit);
  }

  async getPublishedBlogPosts(limit: number = 50): Promise<BlogPost[]> {
    return await db.select()
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.published_at))
      .limit(limit);
  }

  async getFeaturedBlogPosts(limit: number = 3): Promise<BlogPost[]> {
    return await db.select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.status, 'published'),
        eq(blogPosts.featured, true)
      ))
      .orderBy(desc(blogPosts.published_at))
      .limit(limit);
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug));
    
    if (post) {
      // Increment view count
      await this.incrementBlogPostViews(post.id);
    }
    
    return post;
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id));
    
    return post;
  }

  async updateBlogPost(id: number, updates: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const updateData = {
      ...updates,
      updated_at: new Date(),
      published_at: updates.status === 'published' ? new Date() : undefined
    };
    
    const [updatedPost] = await db.update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.id, id))
      .returning();
    
    return updatedPost;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    console.log(`Blog post deleted: ID ${id}`);
  }

  async incrementBlogPostViews(id: number): Promise<void> {
    await db.update(blogPosts)
      .set({ 
        view_count: sql`${blogPosts.view_count} + 1` 
      })
      .where(eq(blogPosts.id, id));
  }

  async getBlogPostsByCategory(category: string, limit: number = 20): Promise<BlogPost[]> {
    return await db.select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.status, 'published'),
        eq(blogPosts.category, category)
      ))
      .orderBy(desc(blogPosts.published_at))
      .limit(limit);
  }

  async searchBlogPosts(query: string, limit: number = 20): Promise<BlogPost[]> {
    return await db.select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.status, 'published'),
        sql`(${blogPosts.title} ILIKE ${'%' + query + '%'} OR ${blogPosts.content} ILIKE ${'%' + query + '%'} OR ${blogPosts.excerpt} ILIKE ${'%' + query + '%'})`
      ))
      .orderBy(desc(blogPosts.published_at))
      .limit(limit);
  }

  // System Settings methods
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT setting_key, setting_value, description, last_updated 
        FROM system_settings 
        WHERE setting_key = ${key}
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        const row = result.rows[0] as any;
        return {
          id: row.id,
          setting_key: row.setting_key,
          setting_value: row.setting_value,
          description: row.description,
          last_updated: row.last_updated
        };
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching system setting:', error);
      return undefined;
    }
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, setting_key, setting_value, description, last_updated 
        FROM system_settings 
        ORDER BY setting_key
      `);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        setting_key: row.setting_key,
        setting_value: row.setting_value,
        description: row.description,
        last_updated: row.last_updated
      }));
    } catch (error) {
      console.error('Error fetching all system settings:', error);
      return [];
    }
  }

  async updateSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
    try {
      const existingSetting = await this.getSystemSetting(key);
      
      if (existingSetting) {
        await db.execute(sql`
          UPDATE system_settings 
          SET setting_value = ${value}, 
              description = ${description || existingSetting.description},
              last_updated = CURRENT_TIMESTAMP
          WHERE setting_key = ${key}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO system_settings (setting_key, setting_value, description)
          VALUES (${key}, ${value}, ${description || null})
        `);
      }
      
      // Return the updated setting
      const updated = await this.getSystemSetting(key);
      return updated!;
    } catch (error) {
      console.error('Error updating system setting:', error);
      throw error;
    }
  }

  async deleteSystemSetting(key: string): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM system_settings 
        WHERE setting_key = ${key}
      `);
    } catch (error) {
      console.error('Error deleting system setting:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const storage = new DatabaseStorage();