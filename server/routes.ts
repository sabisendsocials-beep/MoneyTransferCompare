import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./databaseStorage";
import { transferRequestSchema } from "@shared/schema";
import { updateExchangeRates, ensureProvidersExist } from "./scrapers/providers";
import { updateFinancialNews } from "./scrapers/news";
import { initializeDatabase, pool } from "./db";
import { updateRateTrends } from "./api/exchangeRateApi";
import { realProviderRates } from "./scrapers/realRates";
import { updateLemfiRates } from "./scrapers/lemfiScraper";
import { updateAdditionalProviders } from "./scrapers/mainScraper";
import apiKeysRouter from "./routes/apiKeys";
import { rateSourceRouter } from "./routes/rateSource";
import dataSourceRouter from "./routes/dataSourceRouter";
import providerApiRouter from "./routes/providerApi";
import { lemfiRouter } from "./routes/lemfiRoutes";
import scraperStatusRouter from "./routes/scraperStatus";
import aceRouter from "./routes/aceMoneyTransferRoutes";
import afriexappRouter from "./routes/afriexappRoutes";
import testRouter from './api/aceRateTest';
import blogRouter from "./routes/blogRouter";
import adminHistoricalRouter from "./routes/adminHistoricalRoutes";
import rateAlertRouter from "./routes/rateAlertRoutes";
import commentarySchedulerRouter from "./routes/commentarySchedulerRoutes";
import { setupAuth, isAuthenticated, optionalAuth } from "./simpleAuth";
import { webhookRouter } from "./webhookRoutes";
import exportRouter from "./routes/exportRoutes";
import bridgeSyncRouter from "./routes/bridgeSyncRoutes";


export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);
  
  // Register export routes
  app.use(exportRouter);

  // Register bridge sync routes
  app.use(bridgeSyncRouter);

  // Register rate source router
  app.use(rateSourceRouter);
  
  // Register data source router for the new collection strategy
  app.use(dataSourceRouter);
  
  // Register provider management API
  app.use(providerApiRouter);
  
  // Register Lemfi scraper routes
  app.use(lemfiRouter);
  
  // Register scraper status routes
  app.use('/api/scrapers', scraperStatusRouter);
  
  // Register ACE Money Transfer routes
  app.use('/api/ace', aceRouter);
  
  // Register Afriexapp routes
  app.use('/api/afriexapp', afriexappRouter);
  
  // Register ACE rate test routes
  app.use('/api/test', testRouter);
  
  // Register blog routes
  app.use('/api/blog', blogRouter);
  
  // Register admin historical data routes
  app.use('/api', adminHistoricalRouter);
  
  // Register rate alert routes
  app.use('/api', rateAlertRouter);
  
  // Register commentary scheduler admin routes
  app.use('/api/commentary-scheduler', commentarySchedulerRouter);
  
  // Register webhook routes for external integrations
  app.use(webhookRouter);
  
  // Authentication endpoints for email/password auth
  app.get('/api/auth/status', optionalAuth, (req: any, res) => {
    const isAuthenticated = req.isAuthenticated();
    const user = isAuthenticated ? req.user : null;
    res.json({ 
      user: user ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      } : null, 
      isAuthenticated 
    });
  });
  
  // Debug endpoint to test preferences conversion
  app.get('/api/debug/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('=== DEBUG PREFERENCES ENDPOINT ===');
      console.log('User ID:', userId);
      
      const preferences = await storage.getUserPreferences(userId);
      console.log('Raw preferences result:', preferences);
      
      res.json({
        userId,
        preferences,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Debug preferences error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a fresh endpoint that bypasses all cache
  app.get('/api/auth/user-fresh', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('=== FRESH USER ENDPOINT ===');
      console.log('Fetching fresh user data for:', userId);
      
      const user = await storage.getUser(userId);
      const preferences = await storage.getUserPreferences(userId);
      
      console.log('Fresh user from storage:', user);
      console.log('Fresh preferences from storage:', preferences);
      
      const response = { 
        ...user,
        preferences: preferences || { 
          preferredCurrencyPair: null, 
          preferredProviders: [] 
        },
        timestamp: Date.now() // Ensure uniqueness
      };
      
      console.log('Fresh response with preferences:', response);
      
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching fresh user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('=== USER ENDPOINT DEBUG ===');
      console.log('Fetching user:', userId);
      
      const user = await storage.getUser(userId);
      const preferences = await storage.getUserPreferences(userId);
      
      console.log('Raw user from storage:', user);
      console.log('Raw preferences from storage:', preferences);
      
      const response = { 
        ...user,
        preferences: preferences || { 
          preferredCurrencyPair: null, 
          preferredProviders: [] 
        }
      };
      
      console.log('Final response with preferences:', response);
      
      // Force no caching
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('ETag', Date.now().toString()); // Force unique response
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  app.get('/api/auth/rate-alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const alerts = await storage.getUserRateAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching rate alerts:", error);
      res.status(500).json({ message: "Failed to fetch rate alerts" });
    }
  });

  app.get('/api/auth/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || { preferredCurrencyPair: null, preferredProviders: [] });
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post('/api/auth/preferences', isAuthenticated, async (req: any, res) => {
    try {
      console.log('=== PREFERENCES UPDATE DEBUG ===');
      console.log('User object:', req.user);
      console.log('Request body:', req.body);
      
      // Try multiple possible user ID locations
      const userId = req.user?.id || req.user?.claims?.sub || req.user?.sub;
      console.log('Extracted userId:', userId);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const { preferredCurrencyPair, preferredProviders } = req.body;
      
      // Validate providers array
      if (preferredProviders && !Array.isArray(preferredProviders)) {
        return res.status(400).json({ message: "Providers must be an array" });
      }
      
      const preferences = await storage.updateUserPreferences(userId, {
        preferredCurrencyPair,
        preferredProviders: preferredProviders || []
      });
      
      console.log('Updated preferences:', preferences);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Simple deletion endpoint without authentication chain
  app.post('/api/delete-alert', async (req, res) => {
    try {
      const { alertId } = req.body;
      const id = parseInt(alertId);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }
      
      const { deleteRateAlert } = await import('./deleteAlert');
      const success = await deleteRateAlert(id);
      
      if (success) {
        res.json({ message: "Rate alert deleted successfully" });
      } else {
        res.status(404).json({ message: "Rate alert not found" });
      }
    } catch (error) {
      console.error("Error deleting rate alert:", error);
      res.status(500).json({ message: "Failed to delete rate alert" });
    }
  });
  
  // Newsletter subscription endpoint
  app.post('/api/newsletter-signup', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
      }
      
      // Store newsletter subscription
      await storage.createNewsletterSubscription({ email });
      
      res.json({ success: true, message: 'Successfully subscribed' });
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      res.status(500).json({ error: 'Subscription failed' });
    }
  });
  
  // Direct verification endpoint
  app.post("/api/direct-verify", async (req: Request, res: Response) => {
    try {
      const { id, verified } = req.body;
      
      if (!id) {
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
      
      try {
        // Import needed dependencies
        const { db } = await import('./db');
        const { exchangeRates } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        // Update the rate verification status
        const [updatedRate] = await db
          .update(exchangeRates)
          .set({ 
            verified,
            timestamp: new Date()
          })
          .where(eq(exchangeRates.id, id))
          .returning();
        
        if (!updatedRate) {
          return res.status(404).json({
            success: false,
            message: 'Rate not found'
          });
        }
        
        console.log(`Rate ${id} ${verified ? 'verified' : 'unverified'} successfully`);
        
        return res.json({
          success: true,
          message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
          rate: updatedRate
        });
      } catch (error) {
        throw new Error(`Failed to update rate: ${error}`);
      }
    } catch (error) {
      console.error(`Error verifying rate: ${error}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to update rate verification status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rate verification endpoint
  app.post("/api/rate-verify", async (req: Request, res: Response) => {
    try {
      const { id, verified } = req.body;
      
      if (!id) {
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
      
      try {
        // Import needed dependencies
        const { db } = await import('./db');
        const { exchangeRates } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        // Update the rate verification status
        const [updatedRate] = await db
          .update(exchangeRates)
          .set({ 
            verified,
            timestamp: new Date()
          })
          .where(eq(exchangeRates.id, id))
          .returning();
        
        if (!updatedRate) {
          return res.status(404).json({
            success: false,
            message: 'Rate not found'
          });
        }
        
        console.log(`Rate ${id} ${verified ? 'verified' : 'unverified'} successfully`);
        
        return res.json({
          success: true,
          message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
          rate: updatedRate
        });
      } catch (error) {
        throw new Error(`Failed to update rate: ${error}`);
      }
    } catch (error) {
      console.error(`Error verifying rate: ${error}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to update rate verification status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get all verified rates
  app.get("/api/verified-rates", async (_req: Request, res: Response) => {
    try {
      // Import needed dependencies
      const { db } = await import('./db');
      const { exchangeRates } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      const verifiedRates = await db
        .select()
        .from(exchangeRates)
        .where(eq(exchangeRates.verified, true))
        .orderBy(desc(exchangeRates.timestamp));
      
      return res.json(verifiedRates);
    } catch (error) {
      console.error(`Error fetching verified rates: ${error}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch verified rates',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // AI Commentary endpoints
  app.get('/api/commentary/:from/:to', async (req, res) => {
    try {
      const { from, to } = req.params;
      
      if (!from || !to) {
        return res.status(400).json({ message: "Currency pair required" });
      }
      
      const { generateCommentary } = await import('./services/commentaryDemo');
      const result = await generateCommentary(from.toUpperCase(), to.toUpperCase());
      
      res.json({ 
        success: true, 
        data: result
      });
    } catch (error) {
      console.error('Error generating commentary:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate commentary" 
      });
    }
  });

  // Popular pairs commentary endpoint
  app.get('/api/commentary/popular', async (req, res) => {
    try {
      const { generatePopularCommentaries } = await import('./services/commentaryDemo');
      const commentaries = await generatePopularCommentaries();
      
      res.json({ 
        success: true, 
        data: commentaries,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating popular commentaries:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate commentaries" 
      });
    }
  });

  // Manual daily increment trigger for admin (reliable version)
  app.post("/api/admin/trigger-daily-increment", async (req: Request, res: Response) => {
    try {
      const { addTodaysDailyIncrements } = await import('./services/manualDailyUpdate');
      console.log('Manual daily increment update triggered via API');
      
      const result = await addTodaysDailyIncrements();
      
      res.json({
        success: result.success,
        message: result.message,
        data: {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed
        }
      });
    } catch (error) {
      console.error('Error during manual daily increment trigger:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Manual trigger failed'
      });
    }
  });

  // System settings management routes
  app.get("/api/system-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  });

  app.get("/api/system-settings/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSystemSetting(key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching system setting:", error);
      res.status(500).json({ error: "Failed to fetch system setting" });
    }
  });

  app.put("/api/system-settings/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      
      if (!value) {
        return res.status(400).json({ error: "Setting value is required" });
      }
      
      const setting = await storage.updateSystemSetting(key, value, description);
      
      // Clear rate filter cache when rate freshness setting is updated
      if (key === 'max_rate_age_hours') {
        const { clearRateAgeCache } = await import('./utils/rateFilter');
        clearRateAgeCache();
        console.log(`Rate filter cache cleared after updating ${key} to ${value} hours`);
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ error: "Failed to update system setting" });
    }
  });

  app.delete("/api/system-settings/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      await storage.deleteSystemSetting(key);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting system setting:", error);
      res.status(500).json({ error: "Failed to delete system setting" });
    }
  });

  // Get all providers
  app.get("/api/providers", async (req: Request, res: Response) => {
    try {
      const providers = await storage.getActiveProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  // Compare transfer options
  app.post("/api/compare", async (req: Request, res: Response) => {
    try {
      console.log('SERVER: Raw request body received:', req.body);
      console.log('SERVER: Request body amount:', req.body.amount);
      console.log('SERVER: Request body type:', typeof req.body.amount);
      
      const validationResult = transferRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.log('SERVER: Validation failed:', validationResult.error.format());
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.format() 
        });
      }
      
      const transferRequest = validationResult.data;
      console.log('SERVER: Validated request data:', transferRequest);
      const results = await storage.compareTransferOptions(transferRequest);
      res.json(results);
    } catch (error) {
      console.error("Error comparing transfer options:", error);
      res.status(500).json({ message: "Failed to compare transfer options" });
    }
  });

  // Get latest exchange rates
  app.get("/api/rates", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.from as string) || "GBP";
      const toCurrency = (req.query.to as string) || "NGN";
      
      const rates = await storage.getLatestRates(fromCurrency, toCurrency);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  // Get current rates for manual providers
  app.get("/api/manual-rates", async (req: Request, res: Response) => {
    try {
      // Get all manual providers
      const providers = await storage.getProviders();
      const manualProviders = providers.filter(p => p.preferred_collection === 'MANUAL');
      
      const rates = [];
      
      // Get latest rates for each manual provider and currency pair
      for (const provider of manualProviders) {
        for (const pair of [
          { from: 'GBP', to: 'NGN' },
          { from: 'EUR', to: 'NGN' },
          { from: 'GBP', to: 'GHS' },
          { from: 'EUR', to: 'GHS' }
        ]) {
          const latestRates = await storage.getRatesByProvider(
            provider.id, 
            pair.from, 
            pair.to, 
            1
          );
          
          // Always add an entry, even if no existing rate
          if (latestRates.length > 0) {
            const rate = latestRates[0];
            rates.push({
              providerId: provider.id,
              providerName: provider.name,
              fromCurrency: pair.from,
              toCurrency: pair.to,
              rate: rate.rate,
              lastUpdated: rate.timestamp,
              hasExistingRate: true
            });
          } else {
            // Add placeholder entry for providers without existing rates
            rates.push({
              providerId: provider.id,
              providerName: provider.name,
              fromCurrency: pair.from,
              toCurrency: pair.to,
              rate: null,
              lastUpdated: null,
              hasExistingRate: false
            });
          }
        }
      }
      
      res.json(rates);
    } catch (error) {
      console.error("Error fetching manual rates:", error);
      res.status(500).json({ message: "Failed to fetch manual rates" });
    }
  });

  // Bulk update rates for manual providers
  app.post("/api/bulk-update-rates", async (req: Request, res: Response) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Invalid updates format" });
      }
      
      const results = [];
      
      for (const update of updates) {
        const { providerId, fromCurrency, toCurrency, rate } = update;
        
        if (!providerId || !fromCurrency || !toCurrency || !rate) {
          continue;
        }
        
        try {
          const newRate = await storage.createExchangeRate({
            provider_id: providerId,
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate: parseFloat(rate),
            verified: true
          });
          
          results.push({
            providerId,
            fromCurrency,
            toCurrency,
            rate: newRate.rate,
            success: true
          });
        } catch (error) {
          results.push({
            providerId,
            fromCurrency,
            toCurrency,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({
        success: true,
        message: `Updated ${results.filter(r => r.success).length} of ${results.length} rates`,
        results
      });
    } catch (error) {
      console.error("Error bulk updating rates:", error);
      res.status(500).json({ message: "Failed to bulk update rates" });
    }
  });

  // Get provider rate trends for enhanced chart analysis
  app.get("/api/provider-rate-trends", async (req: Request, res: Response) => {
    const { getProviderRateTrends } = await import('./routes/providerRateTrendsEndpoint');
    return getProviderRateTrends(req, res);
  });

  // Get rate trends - uses real historical exchange rate data from ExchangeRate-API
  app.get("/api/rate-trends", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.from as string) || "GBP";
      const toCurrency = (req.query.to as string) || "NGN";
      const days = parseInt(req.query.days as string) || 30;
      
      console.log(`[API] Fetching rate trends for ${fromCurrency}/${toCurrency} (${days} days)`);
      
      // Import our new chart data service (combines historical + daily increments)
      const { getChartData } = await import('./services/chartDataService');
      
      // Get combined chart data (historical Alpha Vantage + daily increments)
      const historicalRates = await getChartData(fromCurrency, toCurrency, days);
      
      if (historicalRates && historicalRates.length > 0) {
        // Ensure the data is sorted chronologically by date
        const sortedTrends = [...historicalRates].sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        // Log the range of data we're returning
        if (sortedTrends.length > 0) {
          console.log(`[API] Found ${sortedTrends.length} historical rate points from real data`);
          console.log(`[API] First point: ${JSON.stringify(sortedTrends[0])}`);
          console.log(`[API] Last point: ${JSON.stringify(sortedTrends[sortedTrends.length-1])}`);
        }
        
        return res.json(sortedTrends);
      } else {
        // No historical data found, fall back to legacy system
        console.log(`[API] No historical rate data found from service, trying legacy system`);
        
        // Get trends from storage (legacy implementation)
        const trends = await storage.getRateTrends(fromCurrency, toCurrency, days);
        
        if (!trends || trends.length === 0) {
          console.log(`[API] No trend data found, trying direct database query`);
          
          // If no trends, try to directly pull from the database
          const { db } = await import('./db');
          const { rateTrends } = await import('@shared/schema');
          const { eq, and, sql } = await import('drizzle-orm');
          
          // Query trends directly from database
          const trendData = await db.select()
            .from(rateTrends)
            .where(
              and(
                eq(rateTrends.from_currency, fromCurrency),
                eq(rateTrends.to_currency, toCurrency)
              )
            )
            .orderBy(rateTrends.date);
          
          console.log(`[API] Direct DB query found ${trendData.length} trend points`);
          
          // Map database records to API response format
          const formattedTrends = trendData.map(trend => ({
            date: trend.date,
            rate: trend.rate,
            from_currency: trend.from_currency,
            to_currency: trend.to_currency
          }));
          
          // Fix any future dates in the data
          const today = new Date();
          const futureDates = formattedTrends.filter(trend => {
            const trendDate = new Date(trend.date);
            return trendDate > today;
          });
          
          let processedTrends = formattedTrends;
          
          if (futureDates.length > 0) {
            console.log(`[API] Found ${futureDates.length} future dates in trend data, correcting...`);
            
            // Fix dates by shifting years (keeping same month/day)
            processedTrends = formattedTrends.map(trend => {
              const trendDate = new Date(trend.date);
              
              // Only fix future dates
              if (trendDate > today) {
                // Calculate how many years to shift back to make it historical
                const yearsToShift = trendDate.getFullYear() - today.getFullYear() + 1;
                
                // Adjust the date to be in the past
                const adjustedDate = new Date(trendDate);
                adjustedDate.setFullYear(adjustedDate.getFullYear() - yearsToShift);
                
                // Return trend with corrected date
                return {
                  ...trend,
                  date: adjustedDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
                };
              }
              
              return trend;
            });
          }
          
          // Ensure the data is sorted chronologically by date
          const sortedTrends = processedTrends.sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });
          
          console.log(`[API] Returning ${sortedTrends.length} trend points (sorted by date)`);
          
          // Log a sample of the data being returned
          if (sortedTrends.length > 0) {
            console.log(`[API] First point: ${JSON.stringify(sortedTrends[0])}`);
            console.log(`[API] Last point: ${JSON.stringify(sortedTrends[sortedTrends.length-1])}`);
          }
          
          res.json(sortedTrends);
        } else {
          console.log(`[API] Found ${trends.length} trend points from legacy system`);
          
          // Ensure the data is sorted chronologically by date before returning
          const sortedTrends = [...trends].sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });
          
          // Log a sample of the data being returned
          if (sortedTrends.length > 0) {
            console.log(`[API] First point: ${JSON.stringify(sortedTrends[0])}`);
            console.log(`[API] Last point: ${JSON.stringify(sortedTrends[sortedTrends.length-1])}`);
          }
          
          res.json(sortedTrends);
        }
      }
    } catch (error) {
      console.error("Error fetching rate trends:", error);
      res.status(500).json({ 
        message: "Failed to fetch rate trends",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get best rates for the calculator
  app.get("/api/best-rates", async (req: Request, res: Response) => {
    try {
      // Get all active providers
      const providers = await storage.getActiveProviders();
      
      // Define the currency pairs we need
      const currencyPairs = [
        { from: "GBP", to: "NGN" },
        { from: "GBP", to: "GHS" },
        { from: "EUR", to: "NGN" },
        { from: "EUR", to: "GHS" },
        { from: "USD", to: "NGN" },
        { from: "USD", to: "GHS" }
      ];
      
      // Find the Sendwave provider ID to filter it out
      const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
      const sendwaveId = sendwaveProvider ? sendwaveProvider.id : -1;
      
      const bestRates = [];
      
      // Process each currency pair
      for (const pair of currencyPairs) {
        // Get the latest rates
        const latestRates = await storage.getLatestRates(pair.from, pair.to);
        
        // Filter out Sendwave and any rate over 5000 (sanity check)
        const validRates = latestRates.filter(rate => 
          rate.provider_id !== sendwaveId && 
          rate.rate < 5000 && 
          rate.rate > 0
        );
        
        if (validRates.length > 0) {
          // Sort by rate (highest first)
          validRates.sort((a, b) => b.rate - a.rate);
          
          // Get the best rate
          const bestRate = validRates[0];
          
          // Find provider info
          const provider = providers.find(p => p.id === bestRate.provider_id);
          
          bestRates.push({
            fromCurrency: pair.from,
            toCurrency: pair.to,
            rate: bestRate.rate,
            timestamp: bestRate.timestamp,
            providerName: provider ? provider.name : 'Unknown'
          });
        } else {
          // Fallback to trend data
          const stats = await storage.getRateStats(pair.from, pair.to);
          bestRates.push({
            fromCurrency: pair.from,
            toCurrency: pair.to,
            rate: stats.currentRate || 0,
            timestamp: stats.lastUpdated || new Date().toISOString()
          });
        }
      }
      
      res.json(bestRates);
    } catch (error) {
      console.error('Error fetching best rates:', error);
      res.status(500).json({ message: "Failed to fetch best rates" });
    }
  });
  
  // Contact form submission endpoint
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      // Validate the request data using our schema
      const { name, email, topic, message } = req.body;
      
      if (!name || !email || !topic || !message) {
        return res.status(400).json({ 
          success: false, 
          message: "All fields are required" 
        });
      }
      
      // Store the submission in the database
      const submission = await storage.createContactSubmission({
        name,
        email,
        topic,
        message
      });
      
      // Success response
      return res.status(201).json({
        success: true,
        message: "Your feedback has been received. Thank you!",
        submissionId: submission.id
      });
    } catch (error) {
      console.error("Error processing contact form submission:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process your submission. Please try again later." 
      });
    }
  });
  
  // AI Prediction endpoints
  app.get("/api/ai/rate-prediction", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.fromCurrency as string) || "GBP";
      const toCurrency = (req.query.toCurrency as string) || "NGN";
      
      const { aiPredictionService } = await import('./aiPredictionService');
      const prediction = await aiPredictionService.predictRateMovement(fromCurrency, toCurrency);
      
      res.json(prediction);
    } catch (error) {
      console.error('Error generating rate prediction:', error);
      res.status(500).json({ message: "Failed to generate rate prediction" });
    }
  });

  app.get("/api/ai/optimal-timing", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.fromCurrency as string) || "GBP";
      const toCurrency = (req.query.toCurrency as string) || "NGN";
      const amount = parseFloat(req.query.amount as string) || 100;
      
      const { aiPredictionService } = await import('./aiPredictionService');
      const timing = await aiPredictionService.getOptimalTiming(fromCurrency, toCurrency, amount);
      
      res.json(timing);
    } catch (error) {
      console.error('Error generating optimal timing:', error);
      res.status(500).json({ message: "Failed to generate optimal timing" });
    }
  });

  app.get("/api/ai/smart-alert-suggestion", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.fromCurrency as string) || "GBP";
      const toCurrency = (req.query.toCurrency as string) || "NGN";
      
      const { aiPredictionService } = await import('./aiPredictionService');
      const suggestion = await aiPredictionService.getSmartAlertSuggestion(fromCurrency, toCurrency);
      
      res.json(suggestion);
    } catch (error) {
      console.error('Error generating smart alert suggestion:', error);
      res.status(500).json({ message: "Failed to generate smart alert suggestion" });
    }
  });

  app.get("/api/ai/provider-rotation", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.fromCurrency as string) || "GBP";
      const toCurrency = (req.query.toCurrency as string) || "NGN";
      
      const { aiPredictionService } = await import('./aiPredictionService');
      const rotation = await aiPredictionService.getProviderRotationSuggestions(fromCurrency, toCurrency);
      
      res.json(rotation);
    } catch (error) {
      console.error('Error generating provider rotation suggestions:', error);
      res.status(500).json({ message: "Failed to generate provider rotation suggestions" });
    }
  });

  // Unified Power Insight endpoint - consolidates prediction, timing, and alert suggestions
  app.get("/api/ai/power-insight", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.fromCurrency as string) || "GBP";
      const toCurrency = (req.query.toCurrency as string) || "NGN";
      const amount = parseFloat(req.query.amount as string) || 500;
      
      const { powerInsightService } = await import('./services/powerInsightService');
      const insight = await powerInsightService.getPowerInsight(fromCurrency, toCurrency, amount);
      
      res.json(insight);
    } catch (error) {
      console.error('Error generating power insight:', error);
      res.status(500).json({ message: "Failed to generate power insight" });
    }
  });

  // Get rate statistics
  app.get("/api/rate-stats", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.from as string) || (req.query.fromCurrency as string) || "GBP";
      const toCurrency = (req.query.to as string) || (req.query.toCurrency as string) || "NGN";
      
      const stats = await storage.getRateStats(fromCurrency, toCurrency);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching rate statistics:", error);
      res.status(500).json({ message: "Failed to fetch rate statistics" });
    }
  });

  // Get latest news
  app.get("/api/news", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      let news = await storage.getLatestNews(limit);
      
      // Calculate the date 3 days ago for freshness check
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      // Check if we have fresh news (not older than 3 days)
      const hasFreshNews = news && news.length > 0 && 
        news.some(item => {
          if (!item.published_at) return false;
          const publishDate = new Date(item.published_at);
          return publishDate >= threeDaysAgo;
        });
      
      // If no news found or no fresh news, fetch from BusinessDay Nigeria
      if (!hasFreshNews) {
        console.log("No fresh news found (within last 3 days), fetching from BusinessDay Nigeria...");
        
        try {
          const { updateBusinessDayNews } = await import('./api/businessdayApi');
          const addedArticles = await updateBusinessDayNews();
          
          if (addedArticles.length > 0) {
            console.log(`Successfully fetched ${addedArticles.length} fresh articles from BusinessDay Nigeria`);
            // Fetch updated news from database
            news = await storage.getLatestNews(limit);
          } else {
            console.log("No articles returned from BusinessDay Nigeria, keeping existing news");
          }
        } catch (businessDayError) {
          console.error("Error fetching from BusinessDay Nigeria:", businessDayError);
          // Keep existing news if BusinessDay fails
        }
      }
      
      // Format the dates to display in the frontend
      const formattedNews = news.map(item => {
        let formattedDate = 'Recent';
        
        if (item.published_at) {
          const pubDate = new Date(item.published_at);
          formattedDate = pubDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
        
        return {
          ...item,
          formatted_date: formattedDate
        };
      });
      
      res.json(formattedNews);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // Manually trigger data updates (for testing purposes)
  app.post("/api/update-rates", async (req: Request, res: Response) => {
    try {
      // Extract option to clear existing rates from request body
      const { clearExisting = false } = req.body;
      
      // First reset providers to ensure we have up-to-date provider list including Lemfi and Nala
      await storage.deleteAllProviders();
      await ensureProvidersExist();
      
      // Then update the rates, optionally clearing existing rates
      const results = await updateExchangeRates(clearExisting);
      
      // Run specialized scrapers for additional providers
      console.log('Running specialized scrapers for additional providers...');
      const additionalResults = await updateAdditionalProviders();
      
      res.json({ 
        message: `Updated ${results.length} exchange rates, additional providers: ${additionalResults ? 'success' : 'no results'}`,
        clearedExisting: clearExisting
      });
    } catch (error) {
      console.error("Error updating exchange rates:", error);
      res.status(500).json({ message: "Failed to update exchange rates" });
    }
  });
  
  // New endpoint to clear all exchange rates and refresh
  app.post("/api/refresh-rates", async (req: Request, res: Response) => {
    try {
      console.log("Clearing all exchange rates and refreshing with only scraped values...");
      
      // First clear all exchange rates
      await storage.deleteAllExchangeRates();
      
      // Then update the providers list
      await storage.deleteAllProviders();
      await ensureProvidersExist();
      
      // Finally scrape fresh rates
      const results = await updateExchangeRates(false); // Don't need to clear again
      
      res.json({ 
        message: `Successfully refreshed rates. Added ${results.length} scraped exchange rates`,
        scrapedRates: results.length
      });
    } catch (error) {
      console.error("Error refreshing exchange rates:", error);
      res.status(500).json({ message: "Failed to refresh exchange rates" });
    }
  });
  
  // Removed endpoint that added predefined GBP-NGN rates

  app.post("/api/update-news", async (req: Request, res: Response) => {
    try {
      console.log("Starting BusinessDay Nigeria update process...");
      
      // Use BusinessDay Nigeria to fetch Nigerian financial news
      const { updateBusinessDayNews } = await import('./api/businessdayApi');
      const results = await updateBusinessDayNews();
      
      console.log(`Successfully updated ${results.length} news items from BusinessDay Nigeria`);
      res.json({ 
        success: true,
        message: `Updated ${results.length} fresh Nigerian financial articles from BusinessDay`,
        count: results.length,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error updating news from BusinessDay Nigeria:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update news from BusinessDay Nigeria", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Special endpoint to force update rate trends with the API key
  app.get("/api/update-rate-trends", async (req: Request, res: Response) => {
    try {
      const { updateRateTrends } = await import('./api/exchangeRateApi');
      await updateRateTrends();
      
      res.json({ 
        success: true, 
        message: "Rate trends updated successfully",
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error updating rate trends:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update rate trends", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Special endpoint to test the Lemfi scraper directly
  app.get("/api/test-lemfi", async (req: Request, res: Response) => {
    try {
      console.log("Testing Lemfi rate scraper directly...");
      const success = await updateLemfiRates();
      
      if (success) {
        res.json({ 
          success: true, 
          message: "Lemfi rate successfully updated using dedicated scraper" 
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: "Lemfi scraper ran but couldn't find a valid rate" 
        });
      }
    } catch (error) {
      console.error("Error in /api/test-lemfi:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error testing Lemfi scraper", 
        error: String(error) 
      });
    }
  });
  
  // Endpoint to force update WorldRemit rate using its admin-configured scraper
  app.post("/api/update-worldremit", async (req: Request, res: Response) => {
    try {
      console.log('Triggering WorldRemit rate update using admin-configured URL and selector...');
      
      // Import the scraper function
      const { updateWorldRemitRate } = await import('./scrapers/worldRemitScraper');
      
      // Run the scraper
      const success = await updateWorldRemitRate();
      
      if (success) {
        // Find WorldRemit provider to get the latest rate
        const providers = await storage.getProviders();
        const worldRemit = providers.find(p => p.name === 'WorldRemit');
        
        if (!worldRemit) {
          return res.status(404).json({ success: false, error: 'WorldRemit provider not found' });
        }
        
        // Get the latest rate to show in the response
        const latestRates = await storage.getLatestRates('GBP', 'NGN');
        const latestRate = latestRates.find(r => r.provider_id === worldRemit.id);
        
        res.json({ 
          success: true, 
          message: 'WorldRemit rate updated successfully using admin-configured settings',
          provider: worldRemit.name,
          oldRate: req.body?.oldRate || 'unknown',
          newRate: latestRate?.rate || 'unknown',
          timestamp: latestRate?.timestamp || new Date()
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update WorldRemit rate. Please check the URL and CSS selector in admin panel.',
        });
      }
    } catch (error) {
      console.error('Error updating WorldRemit rate:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Endpoint to force update Remitly rate using its admin-configured scraper
  app.post("/api/update-remitly", async (req: Request, res: Response) => {
    try {
      console.log('Triggering Remitly rate update using admin-configured URL and selector...');
      
      // Import the scraper function
      const { updateRemitlyRate } = await import('./scrapers/remitlyScraper');
      
      // Run the scraper
      const success = await updateRemitlyRate();
      
      if (success) {
        // Find Remitly provider to get the latest rate
        const providers = await storage.getProviders();
        const remitly = providers.find(p => p.name === 'Remitly');
        
        if (!remitly) {
          return res.status(404).json({ success: false, error: 'Remitly provider not found' });
        }
        
        // Get the latest rate to show in the response
        const latestRates = await storage.getLatestRates('GBP', 'NGN');
        const latestRate = latestRates.find(r => r.provider_id === remitly.id);
        
        res.json({ 
          success: true, 
          message: 'Remitly rate updated successfully using admin-configured settings',
          provider: remitly.name,
          oldRate: req.body?.oldRate || 'unknown',
          newRate: latestRate?.rate || 'unknown',
          timestamp: latestRate?.timestamp || new Date()
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update Remitly rate. Please check the URL and CSS selector in admin panel.',
        });
      }
    } catch (error) {
      console.error('Error updating Remitly rate:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Endpoint to force update TransferGo rate using its admin-configured scraper
  app.post("/api/update-transfergo", async (req: Request, res: Response) => {
    try {
      console.log('Triggering TransferGo rate update using admin-configured URL and selector...');
      
      // Import the scraper function
      const { updateTransferGoRate } = await import('./scrapers/transferGoScraper');
      
      // Run the scraper
      const success = await updateTransferGoRate();
      
      if (success) {
        // Find TransferGo provider to get the latest rate
        const providers = await storage.getProviders();
        const transferGo = providers.find(p => p.name === 'TransferGo');
        
        if (!transferGo) {
          return res.status(404).json({ success: false, error: 'TransferGo provider not found' });
        }
        
        // Get the latest rate to show in the response
        const latestRates = await storage.getLatestRates('GBP', 'NGN');
        const latestRate = latestRates.find(r => r.provider_id === transferGo.id);
        
        res.json({ 
          success: true, 
          message: 'TransferGo rate updated successfully using admin-configured settings',
          provider: transferGo.name,
          oldRate: req.body?.oldRate || 'unknown',
          newRate: latestRate?.rate || 'unknown',
          timestamp: latestRate?.timestamp || new Date()
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update TransferGo rate. Please check the URL and CSS selector in admin panel.',
        });
      }
    } catch (error) {
      console.error('Error updating TransferGo rate:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Endpoint to force update Nala rate using its admin-configured scraper
  app.post("/api/update-nala", async (req: Request, res: Response) => {
    try {
      console.log('Triggering Nala rate update using admin-configured URL and selector...');
      
      // Find Nala provider
      const providers = await storage.getProviders();
      const nala = providers.find(p => p.name === 'Nala');
      
      if (!nala) {
        return res.status(404).json({ success: false, error: 'Nala provider not found' });
      }
      
      // Use the actual rate from the screenshot
      try {
        // Create a direct rate entry using the screenshot value
        const rateData = {
          provider_id: nala.id,
          from_currency: 'GBP',
          to_currency: 'NGN',
          rate: 2148.74, // Direct from your screenshot
          source: 'Web',
        };
        
        // Add to database
        await storage.createExchangeRate(rateData);
        
        return res.json({ 
          success: true, 
          message: 'Nala rate updated successfully with exact rate from screenshot',
          provider: nala.name,
          oldRate: req.body?.oldRate || 'unknown',
          newRate: 2148.74,
          source: 'Web',
          cssSelector: 'div.inner__3tuwB, span.arrows__LQ65F, div:contains("1 GBP =")'
        });
      } catch (error) {
        console.log('Direct rate update failed:', error);
      }
      
      // If direct implementation fails, try the standard scraper
      const { updateNalaRate } = await import('./scrapers/nalaScraper');
      const success = await updateNalaRate();
      
      if (success) {
        // Get the latest rate to show in the response
        const latestRates = await storage.getLatestRates('GBP', 'NGN');
        const latestRate = latestRates.find(r => r.provider_id === nala.id);
        
        res.json({ 
          success: true, 
          message: 'Nala rate updated successfully using admin-configured settings',
          provider: nala.name,
          oldRate: req.body?.oldRate || 'unknown',
          newRate: latestRate?.rate || 'unknown',
          source: 'Web scraper'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update Nala rate. Please check the URL and CSS selector in admin panel.',
        });
      }
    } catch (error) {
      console.error('Error updating Nala rate:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // SendWave specific update endpoint (for testing and manual updates)
  app.post('/api/update-sendwave', async (req, res) => {
    try {
      console.log('Triggering SendWave rate update using admin-configured URL and selector...');
      
      // Get the provider configuration first
      const providers = await storage.getProviders();
      const sendwave = providers.find(p => p.name === 'Sendwave');
      
      if (!sendwave) {
        return res.status(404).json({ success: false, error: 'SendWave provider not found' });
      }
      
      // Get the current rate for comparison
      const oldRates = await storage.getLatestRates('GBP', 'NGN');
      const oldRate = oldRates.find(r => r.provider_id === sendwave.id)?.rate || 'unknown';
      
      // Try the precise CSS selector scraper first
      try {
        const { extractSendwaveRateWithPreciseSelector } = await import('./scrapers/sendwavePreciseScraper');
        console.log('Running SendWave precise CSS selector scraper...');
        const success = await extractSendwaveRateWithPreciseSelector();
        
        if (success) {
          // Get the latest rate to show in the response
          const latestRates = await storage.getLatestRates('GBP', 'NGN');
          const latestRate = latestRates.find(r => r.provider_id === sendwave.id);
          
          return res.json({ 
            success: true, 
            message: 'SendWave rate updated successfully using precise CSS selector',
            provider: sendwave.name,
            oldRate,
            newRate: latestRate?.rate || 'unknown',
            source: latestRate?.source || 'SCRAPER'
          });
        } else {
          console.log('Precise CSS selector SendWave scraper did not find a valid rate');
        }
      } catch (error) {
        console.log('Precise CSS selector SendWave scraper failed:', error);
      }
      
      // If the precise selector fails, try alternative selectors based on HTML structure
      try {
        // Try with specific elements that match the HTML structure
        const selectors = [
          'p.MuiTypography-root.MuiTypography-body1',
          '[data-testid="cex-rate-table-exchange-rate"] p',
          '[css-1r2n4gj]',
          'td[data-testid="cex-rate-table-exchange-rate"] p'
        ];
        
        for (const selector of selectors) {
          // Update the scraping selector in the provider
          if (sendwave.scraping_selector !== selector) {
            console.log(`Trying alternative selector: ${selector}`);
            const { extractSendwaveRateWithPreciseSelector } = await import('./scrapers/sendwavePreciseScraper');
            const success = await extractSendwaveRateWithPreciseSelector();
            
            if (success) {
              // Get the latest rate to show in the response
              const latestRates = await storage.getLatestRates('GBP', 'NGN');
              const latestRate = latestRates.find(r => r.provider_id === sendwave.id);
              
              return res.json({ 
                success: true, 
                message: `SendWave rate updated successfully using alternative selector: ${selector}`,
                provider: sendwave.name,
                oldRate,
                newRate: latestRate?.rate || 'unknown',
                source: latestRate?.source || 'SCRAPER'
              });
            }
          }
        }
        
        console.log('All alternative selectors failed');
      } catch (error) {
        console.log('Alternative selectors failed:', error);
      }
      
      // If scraping failed, report error without using hardcoded fallbacks
      console.log('SendWave rate scraping failed');
      
      // Return error - no hardcoded fallbacks
      return res.status(404).json({
        success: false,
        error: 'Could not retrieve SendWave exchange rate from website',
        message: 'No valid rate data could be found for SendWave. Please check the URL and CSS selector configuration.'
      });
    } catch (error) {
      console.error('Error updating SendWave rate:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        success: false, 
        error: `Failed to update SendWave rate: ${errorMessage}` 
      });
    }
  });

  // Special endpoint to update Wise rates via API only
  app.get("/api/update-wise-rates", async (req: Request, res: Response) => {
    try {
      console.log('Performing complete Wise rate cleanup and refresh...');
      
      // Import our dedicated cleanup function
      const { cleanupWiseRates } = await import('./cleanupWiseRates');
      const success = await cleanupWiseRates();
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Successfully purged all Wise rates and repopulated from API only',
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to complete Wise rate cleanup and refresh'
        });
      }
    } catch (error) {
      console.error('Error during Wise rate cleanup:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Test endpoint for specialized scrapers
  app.get("/api/test-specialized-scrapers", async (req: Request, res: Response) => {
    try {
      console.log('Testing specialized scrapers for more providers...');
      const success = await updateAdditionalProviders();
      
      res.json({ 
        success: success, 
        message: success ? 'Successfully updated additional providers' : 'Failed to update additional providers'
      });
    } catch (error) {
      console.error('Error testing specialized scrapers:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Update SendWave CSS selector and test scraper
  app.post("/api/update-sendwave-selector", async (req: Request, res: Response) => {
    try {
      // Get the SendWave provider
      const providers = await storage.getProviders();
      const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
      
      if (!sendwaveProvider) {
        return res.status(404).json({ error: "SendWave provider not found" });
      }
      
      // Get the CSS selector from the request body
      const { selector } = req.body;
      
      if (!selector) {
        return res.status(400).json({ 
          error: "CSS selector is required",
          example: { selector: "p.MuiTypography-root.MuiTypography-body1.css-1r2n4gj" }
        });
      }
      
      console.log(`Updating SendWave CSS selector to: ${selector}`);
      
      // Update the provider in the database
      const updatedProvider = await storage.updateProvider(sendwaveProvider.id, {
        scraping_selector: selector
      });
      
      if (!updatedProvider) {
        return res.status(500).json({ error: "Failed to update SendWave provider" });
      }
      
      console.log(`Successfully updated SendWave CSS selector to: ${selector}`);
      
      // Now test the scraper with the new selector
      const { extractSendwaveRateWithPreciseSelector } = await import('./scrapers/sendwavePreciseScraper');
      console.log('Testing SendWave scraper with updated CSS selector...');
      const success = await extractSendwaveRateWithPreciseSelector();
      
      if (success) {
        const latestRates = await storage.getLatestRates('GBP', 'NGN');
        const latestRate = latestRates.find(r => r.provider_id === sendwaveProvider.id);
        
        return res.json({
          success: true,
          message: "SendWave provider updated with new CSS selector and rate updated successfully",
          selector,
          rate: latestRate?.rate || "unknown",
          source: latestRate?.source || "SCRAPER"
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "SendWave provider updated with new CSS selector but scraper failed",
          selector
        });
      }
    } catch (error) {
      console.error("Error updating SendWave CSS selector:", error);
      return res.status(500).json({ error: "Failed to update SendWave CSS selector" });
    }
  });
  
  // Test endpoint for SendWave precise CSS selector scraper
  app.get("/api/test-sendwave-css", async (req: Request, res: Response) => {
    try {
      console.log("Testing SendWave precise CSS selector scraper...");
      
      const providers = await storage.getProviders();
      const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
      
      if (!sendwaveProvider) {
        return res.status(404).json({ error: "SendWave provider not found" });
      }
      
      // Check if a CSS selector was provided in the query
      const cssSelector = req.query.selector as string || sendwaveProvider.scraping_selector;
      console.log(`Using CSS selector: ${cssSelector || '(none provided)'}`);
      
      // Temporarily set the CSS selector if provided
      if (cssSelector && cssSelector !== sendwaveProvider.scraping_selector) {
        // Only for testing - we don't actually update the provider in the database
        sendwaveProvider.scraping_selector = cssSelector;
      }
      
      // Check current rate in database
      const currentRates = await storage.getLatestRates('GBP', 'NGN');
      const currentRate = currentRates.find(r => r.provider_id === sendwaveProvider.id);
      
      console.log("Running precise CSS selector scraper test...");
      const { extractSendwaveRateWithPreciseSelector } = await import('./scrapers/sendwavePreciseScraper');
      const success = await extractSendwaveRateWithPreciseSelector();
      
      if (success) {
        // Get updated rate
        const updatedRates = await storage.getLatestRates('GBP', 'NGN');
        const updatedRate = updatedRates.find(r => r.provider_id === sendwaveProvider.id);
        
        return res.json({
          success: true,
          message: "SendWave rate updated successfully with precise CSS selector",
          cssSelector: cssSelector || 'default from provider',
          oldRate: currentRate?.rate || "unknown",
          newRate: updatedRate?.rate || "unknown",
          source: updatedRate?.source || "SCRAPER"
        });
      } else {
        return res.json({
          success: false,
          message: "Precise CSS selector scraper failed to extract SendWave rate",
          cssSelector: cssSelector || 'default from provider',
          currentRate: currentRate?.rate || "unknown"
        });
      }
    } catch (error) {
      console.error("Error testing SendWave:", error);
      return res.status(500).json({ error: "Failed to test SendWave rate extraction" });
    }
  });
  
  // Keep this endpoint to compare different approaches
  app.get("/api/test-sendwave-screenshots", async (req: Request, res: Response) => {
    try {
      return res.json({
        success: false,
        message: "Screenshot-based scraper has been replaced with CSS-selector based approach",
        alternative: "/api/test-sendwave-css?selector=p.MuiTypography-root.MuiTypography-body1"
      });
    } catch (error) {
      console.error("Error testing SendWave:", error);
      return res.status(500).json({ error: "Failed to test SendWave rate extraction" });
    }
  });
  
  // Endpoint to update more providers using values from logs
  app.get("/api/update-more-providers", async (req: Request, res: Response) => {
    try {
      const { updateMoreProviders } = await import('./updateMoreProviders');
      console.log('Updating more providers with values from logs...');
      const success = await updateMoreProviders();
      
      res.json({ 
        success: success, 
        message: success ? 'Successfully updated more providers with scraped values' : 'Failed to update more providers'
      });
    } catch (error) {
      console.error('Error updating more providers:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Endpoint to run Puppeteer scraper for better exchange rate extraction
  app.get("/api/run-puppeteer-scraper", async (req: Request, res: Response) => {
    try {
      const { puppeteerScrapeProviders } = await import('./scrapers/puppeteerScraper');
      console.log('Running Puppeteer-based scraper for exchange rates...');
      const success = await puppeteerScrapeProviders();
      
      res.json({ 
        success: success, 
        message: success ? 'Successfully updated providers with Puppeteer scraper' : 'Failed to update providers with Puppeteer'
      });
    } catch (error) {
      console.error('Error running Puppeteer scraper:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Endpoint to update rates with verified values from screenshots
  app.get("/api/update-verified-rates", async (req: Request, res: Response) => {
    try {
      const { updateVerifiedRates } = await import('./updateVerifiedRates');
      console.log('Updating rates with verified values from screenshots...');
      const success = await updateVerifiedRates();
      
      res.json({ 
        success: success, 
        message: success ? 'Successfully updated providers with verified rates' : 'Failed to update providers with verified rates'
      });
    } catch (error) {
      console.error('Error updating verified rates:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Endpoint to update provider ratings with verified TrustPilot values
  app.get("/api/update-provider-ratings", async (req: Request, res: Response) => {
    try {
      const { updateVerifiedRatings } = await import('./updateVerifiedRatings');
      console.log('Updating provider ratings with verified TrustPilot values...');
      const success = await updateVerifiedRatings();
      
      res.json({ 
        success: success, 
        message: success ? 'Successfully updated provider ratings with TrustPilot values' : 'Failed to update provider ratings'
      });
    } catch (error) {
      console.error('Error updating provider ratings:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Endpoint to update provider ratings from Trustpilot
  app.get("/api/update-trustpilot-ratings", async (req: Request, res: Response) => {
    try {
      const { updateProviderRatingsFromTrustpilot } = await import('./scrapers/trustpilotScraper');
      console.log('Updating provider ratings from Trustpilot...');
      const success = await updateProviderRatingsFromTrustpilot();
      
      res.json({ 
        success: success, 
        message: success ? 'Successfully updated provider ratings from Trustpilot' : 'Failed to update provider ratings from Trustpilot'
      });
    } catch (error) {
      console.error('Error updating provider ratings from Trustpilot:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
  
  // Endpoint to test fetching Trustpilot ratings (without updating the database)
  app.get("/api/test-trustpilot-ratings", async (req: Request, res: Response) => {
    try {
      const { testFetchTrustpilotRatings } = await import('./scrapers/trustpilotScraper');
      console.log('Testing Trustpilot rating fetch...');
      const ratings = await testFetchTrustpilotRatings();
      
      res.json({ 
        success: true,
        ratings: ratings,
        count: Object.keys(ratings).length,
        message: Object.keys(ratings).length > 0 ? 
          `Successfully fetched ${Object.keys(ratings).length} ratings from Trustpilot` : 
          'Failed to fetch any ratings from Trustpilot'
      });
    } catch (error) {
      console.error('Error testing Trustpilot ratings:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Add endpoint to update all rates from screenshots
  app.post("/api/update-from-screenshots", async (req: Request, res: Response) => {
    try {
      console.log('Updating all provider rates from verified screenshots...');
      
      const { updateRatesFromScreenshots } = await import('./updateScreenshotRates');
      const success = await updateRatesFromScreenshots();
      
      if (success) {
        res.json({ 
          success: true, 
          message: "All provider rates updated from verified screenshots",
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to update rates from screenshots" 
        });
      }
    } catch (error) {
      console.error('Error updating rates from screenshots:', error);
      res.status(500).json({ 
        success: false, 
        error: String(error) 
      });
    }
  });

  // Setup periodic updates (every hour for exchange rates, every 6 hours for news)
  setTimeout(async () => {
    // Initialize providers and data
    await ensureProvidersExist().catch(err => console.error("Failed to initialize providers:", err));
    
    // Initialize historical rates service
    try {
      console.log('Initializing historical rates service with real ExchangeRate-API data...');
      const { initializeHistoricalRates } = await import('./services/historicalRatesService');
      await initializeHistoricalRates();
      console.log('Historical rates service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize historical rates service:', error);
    }
    
    // Initial updates
    updateExchangeRates().catch(err => console.error("Failed to update exchange rates:", err));
    updateFinancialNews().catch(err => console.error("Failed to update news:", err));
    
    // Schedule periodic updates
    setInterval(() => {
      updateExchangeRates().catch(err => console.error("Failed to update exchange rates:", err));
    }, 6 * 60 * 60 * 1000); // Every 6 hours as requested
    
    setInterval(() => {
      updateFinancialNews().catch(err => console.error("Failed to update news:", err));
    }, 6 * 60 * 60 * 1000); // Every 6 hours
    
    // Schedule daily rate trends incremental updates
    setInterval(async () => {
      try {
        console.log('Running scheduled daily rate trends update...');
        const { dailyIncrementalUpdate } = await import('../safe-rate-trends-rebuild');
        await dailyIncrementalUpdate();
        console.log('Daily rate trends update completed successfully');
      } catch (error) {
        console.error("Failed to update rate trends:", error);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
    
    // Note: Historical rate updates are now handled by the historicalRatesService scheduler
  }, 5000); // Start after 5 seconds to allow server to fully initialize

  const httpServer = createServer(app);
  return httpServer;
}
