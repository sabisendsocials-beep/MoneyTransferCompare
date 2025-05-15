import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { transferRequestSchema } from "@shared/schema";
import { updateExchangeRates, ensureProvidersExist } from "./scrapers/providers";
import { updateFinancialNews } from "./scrapers/news";
import { initializeDatabase } from "./db";
import { updateRateTrends } from "./api/exchangeRateApi";

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
      const results = await updateExchangeRates();
      res.json({ message: `Updated ${results.length} exchange rates` });
    } catch (error) {
      console.error("Error updating exchange rates:", error);
      res.status(500).json({ message: "Failed to update exchange rates" });
    }
  });

  apiRouter.post("/api/update-news", async (req: Request, res: Response) => {
    try {
      const results = await updateFinancialNews();
      res.json({ message: `Updated ${results.length} news items` });
    } catch (error) {
      console.error("Error updating news:", error);
      res.status(500).json({ message: "Failed to update news" });
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
