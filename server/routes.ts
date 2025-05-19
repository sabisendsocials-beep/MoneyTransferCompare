import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { transferRequestSchema } from "@shared/schema";
import { updateExchangeRates, ensureProvidersExist } from "./scrapers/providers";
import { updateFinancialNews } from "./scrapers/news";
import { initializeDatabase } from "./db";
import { updateRateTrends } from "./api/exchangeRateApi";
import { realProviderRates } from "./scrapers/realRates";
import { updateLemfiRate } from "./scrapers/lemfiScraper";
import { updateAdditionalProviders } from "./scrapers/mainScraper";
import apiKeysRouter from "./routes/apiKeys";
import { rateSourceRouter } from "./routes/rateSource";
import dataSourceRouter from "./routes/dataSourceRouter";
import providerApiRouter from "./routes/providerApi";


export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  const apiRouter = app;
  
  // Register rate source router
  app.use(rateSourceRouter);
  
  // Register data source router for the new collection strategy
  app.use(dataSourceRouter);
  
  // Register provider management API
  app.use(providerApiRouter);
  
  // Direct verification endpoint
  apiRouter.post("/api/direct-verify", async (req: Request, res: Response) => {
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
  apiRouter.post("/api/rate-verify", async (req: Request, res: Response) => {
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
  apiRouter.get("/api/verified-rates", async (_req: Request, res: Response) => {
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

  // Get all providers
  apiRouter.get("/api/providers", async (req: Request, res: Response) => {
    try {
      const providers = await storage.getActiveProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  // Compare transfer options
  apiRouter.post("/api/compare", async (req: Request, res: Response) => {
    try {
      const validationResult = transferRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.format() 
        });
      }
      
      const transferRequest = validationResult.data;
      const results = await storage.compareTransferOptions(transferRequest);
      res.json(results);
    } catch (error) {
      console.error("Error comparing transfer options:", error);
      res.status(500).json({ message: "Failed to compare transfer options" });
    }
  });

  // Get latest exchange rates
  apiRouter.get("/api/rates", async (req: Request, res: Response) => {
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

  // Get rate trends
  apiRouter.get("/api/rate-trends", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.from as string) || "GBP";
      const toCurrency = (req.query.to as string) || "NGN";
      const days = parseInt(req.query.days as string) || 30;
      
      console.log(`[API] Fetching rate trends for ${fromCurrency}/${toCurrency} (${days} days)`);
      
      // Get trends from storage
      const trends = await storage.getRateTrends(fromCurrency, toCurrency, days);
      
      if (!trends || trends.length === 0) {
        console.log(`[API] No trend data found for ${fromCurrency}/${toCurrency}, forcing update`);
        
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
        
        // Ensure the data is sorted chronologically by date
        const sortedTrends = formattedTrends.sort((a, b) => {
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
        console.log(`[API] Found ${trends.length} trend points for ${fromCurrency}/${toCurrency}`);
        
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
    } catch (error) {
      console.error("Error fetching rate trends:", error);
      res.status(500).json({ 
        message: "Failed to fetch rate trends",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get rate statistics
  apiRouter.get("/api/rate-stats", async (req: Request, res: Response) => {
    try {
      const fromCurrency = (req.query.from as string) || "GBP";
      const toCurrency = (req.query.to as string) || "NGN";
      
      const stats = await storage.getRateStats(fromCurrency, toCurrency);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching rate statistics:", error);
      res.status(500).json({ message: "Failed to fetch rate statistics" });
    }
  });

  // Get latest news
  apiRouter.get("/api/news", async (req: Request, res: Response) => {
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
      
      // If no news found or no fresh news, populate with updated sample news
      if (!hasFreshNews) {
        console.log("No fresh news found (within last 3 days), using updated sample news...");
        
        // Import sample news data with current dates
        const { sampleNews } = await import('./sampleNewsData');
        
        // Clear any existing news first
        await storage.deleteAllNews();
        
        // Add each sample news item
        for (const item of sampleNews) {
          await storage.createNews(item);
        }
        
        // Fetch again after adding sample data
        news = await storage.getLatestNews(limit);
        console.log(`Added ${sampleNews.length} fresh sample news items to database (all within last 3 days)`);
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
  apiRouter.post("/api/update-rates", async (req: Request, res: Response) => {
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
  apiRouter.post("/api/refresh-rates", async (req: Request, res: Response) => {
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

  apiRouter.post("/api/update-news", async (req: Request, res: Response) => {
    try {
      console.log("Starting news update process...");
      
      // First clear existing news to avoid duplicates
      try {
        await storage.deleteAllNews();
        console.log("Cleared existing news before update");
      } catch (clearError) {
        console.error("Error clearing existing news:", clearError);
        // Continue with the update anyway
      }
      
      // Fetch and store new news
      const results = await updateFinancialNews();
      
      console.log(`Successfully updated ${results.length} news items`);
      res.json({ 
        success: true,
        message: `Updated ${results.length} news items`,
        count: results.length,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error updating news:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update news", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Special endpoint to force update rate trends with the API key
  apiRouter.get("/api/update-rate-trends", async (req: Request, res: Response) => {
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
  apiRouter.get("/api/test-lemfi", async (req: Request, res: Response) => {
    try {
      console.log("Testing Lemfi rate scraper directly...");
      const success = await updateLemfiRate();
      
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
  apiRouter.post("/api/update-worldremit", async (req: Request, res: Response) => {
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
  
  // Special endpoint to update Wise rates via API only
  apiRouter.get("/api/update-wise-rates", async (req: Request, res: Response) => {
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
  apiRouter.get("/api/test-specialized-scrapers", async (req: Request, res: Response) => {
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
  
  // Endpoint to update more providers using values from logs
  apiRouter.get("/api/update-more-providers", async (req: Request, res: Response) => {
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
  apiRouter.get("/api/run-puppeteer-scraper", async (req: Request, res: Response) => {
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
  apiRouter.get("/api/update-verified-rates", async (req: Request, res: Response) => {
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
  apiRouter.get("/api/update-provider-ratings", async (req: Request, res: Response) => {
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
  apiRouter.get("/api/update-trustpilot-ratings", async (req: Request, res: Response) => {
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
  apiRouter.get("/api/test-trustpilot-ratings", async (req: Request, res: Response) => {
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
  apiRouter.post("/api/update-from-screenshots", async (req: Request, res: Response) => {
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
    
    // Initial updates
    updateExchangeRates().catch(err => console.error("Failed to update exchange rates:", err));
    updateFinancialNews().catch(err => console.error("Failed to update news:", err));
    updateRateTrends().catch(err => console.error("Failed to update rate trends:", err));
    
    // Schedule periodic updates
    setInterval(() => {
      updateExchangeRates().catch(err => console.error("Failed to update exchange rates:", err));
    }, 6 * 60 * 60 * 1000); // Every 6 hours as requested
    
    setInterval(() => {
      updateFinancialNews().catch(err => console.error("Failed to update news:", err));
    }, 6 * 60 * 60 * 1000); // Every 6 hours
    
    setInterval(() => {
      updateRateTrends().catch(err => console.error("Failed to update rate trends:", err));
    }, 24 * 60 * 60 * 1000); // Daily update for exchange rate trends
  }, 5000); // Start after 5 seconds to allow server to fully initialize

  const httpServer = createServer(app);
  return httpServer;
}
