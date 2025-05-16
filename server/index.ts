import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import { updateExchangeRates } from "./scrapers/providers";
import { updateRatesFromScreenshots } from "./updateScreenshotRates";
import { updateFinancialNews } from "./scrapers/news";
import { updateRateTrends } from "./api/exchangeRateApi";
import { storage } from "./storage";
import updateProviderList from "./updateProviderList";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database tables
  try {
    log("Initializing database...");
    await initializeDatabase();
    log("Database initialized successfully");
    
    // Update the provider list with the latest providers
    await updateProviderList();
    log("Provider list updated with latest providers");
    
    // Try to update exchange rates with real data from providers
    try {
      // First refresh our provider list with latest providers
      try {
        log("Updating provider list with latest transfer providers...");
        await updateProviderList();
        log("Provider list updated successfully");
      } catch (providerError) {
        log(`Error updating provider list: ${providerError}`);
      }
      
      // Then update exchange rates
      await updateExchangeRates();
      log("Exchange rates updated with real data");
      
      // Import and apply the precise rates
      try {
        const updatePreciseRates = (await import('./updateRates.js')).default;
        log("Updating exchange rates with precise values...");
        await updatePreciseRates();
        log("Exchange rates updated with precise values");
      } catch (rateError) {
        log(`Error updating precise rates: ${rateError}`);
      }
    } catch (error) {
      log(`Error updating exchange rates via scraping: ${error}`);
    }
    
    // Update all provider rates from verified screenshot data
    try {
      // This will update rates for all providers in the screenshots
      await updateRatesFromScreenshots();
      log("Provider rates updated from verified screenshot data");
    } catch (error) {
      log(`Error updating rates from screenshots: ${error}`);
    }
  } catch (error) {
    log(`Failed to initialize database: ${error}`);
  }
  
  /**
   * Sets up automatic interval-based updates for various data sources
   * This ensures our data stays fresh without manual intervention
   */
  function setupAutomaticUpdates(): void {
    // Update exchange rates every 6 hours
    const SIX_HOURS = 6 * 60 * 60 * 1000; 
    setInterval(async () => {
      try {
        log("Running scheduled exchange rate update...");
        await updateExchangeRates();
        log("Scheduled exchange rate update completed successfully");
      } catch (error) {
        log(`Error in scheduled exchange rate update: ${error}`);
      }
    }, SIX_HOURS);
    
    // Update exchange rate trends every 12 hours
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        log("Running scheduled exchange rate trends update...");
        await updateRateTrends();
        log("Exchange rate trends updated successfully");
      } catch (error) {
        log(`Error updating exchange rate trends: ${error}`);
      }
    }, TWELVE_HOURS);
    
    // Update news every 8 hours
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        log("Running scheduled news update...");
        await storage.deleteAllNews();
        const results = await updateFinancialNews();
        log(`Scheduled news update completed with ${results.length} news items added`);
      } catch (error) {
        log(`Error in scheduled news update: ${error}`);
      }
    }, EIGHT_HOURS);
    
    log("Automatic update intervals have been set up");
  }

  const server = await registerRoutes(app);
  
  // Set up automatic update intervals for data
  setupAutomaticUpdates();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
