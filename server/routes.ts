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

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  const apiRouter = app;

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
      
      const trends = await storage.getRateTrends(fromCurrency, toCurrency, days);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching rate trends:", error);
      res.status(500).json({ message: "Failed to fetch rate trends" });
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
      const news = await storage.getLatestNews(limit);
      res.json(news);
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
      res.json({ 
        message: `Updated ${results.length} exchange rates`,
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
  
  // Special route to update WorldRemit rate with accurate data from screenshot
  apiRouter.post("/api/update-worldremit", async (req: Request, res: Response) => {
    try {
      console.log('Manually updating WorldRemit rate from screenshot data...');
      
      // Find WorldRemit provider
      const providers = await storage.getProviders();
      const worldRemit = providers.find(p => p.name === 'WorldRemit');
      
      if (!worldRemit) {
        return res.status(404).json({ success: false, error: 'WorldRemit provider not found' });
      }
      
      // Calculate rate based on screenshot data
      const sendAmount = 100; // GBP (from screenshot)
      const receiveAmount = 211288; // NGN (from screenshot)
      const rate = receiveAmount / sendAmount; // This gives us 2112.88
      
      console.log(`Setting WorldRemit rate to ${rate} based on verified screenshot data`);
      
      // Remove old rates first
      try {
        await storage.deleteExchangeRatesForProvider(worldRemit.id, 'GBP', 'NGN');
        console.log('Deleted old WorldRemit rates');
      } catch (error) {
        console.warn('Could not delete old rates, continuing with update');
      }
      
      // Add the new rate with all required fields
      const exchangeRate = await storage.createExchangeRate({
        provider_id: worldRemit.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: rate
      });
      
      console.log(`Successfully added new WorldRemit rate: ${rate}`);
      console.log(`Rate ID: ${exchangeRate.id}, timestamp: ${exchangeRate.timestamp}`);
      
      // Return success
      res.json({ 
        success: true, 
        message: 'WorldRemit rate updated successfully',
        provider: worldRemit.name,
        oldRate: req.body?.oldRate || 'unknown',
        newRate: rate,
        timestamp: exchangeRate.timestamp
      });
    } catch (error) {
      console.error('Error updating WorldRemit rate:', error);
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
