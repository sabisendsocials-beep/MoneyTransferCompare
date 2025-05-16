import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import { updateExchangeRates } from "./scrapers/providers";
import { updateRatesFromScreenshots } from "./updateScreenshotRates";
import { updateFinancialNews } from "./scrapers/news";
import updateRealRateTrends from "./api/exchangeRateService";
import { storage } from "./storage";
import updateProviderList from "./updateProviderList";
import updateProviderInfo from "./scrapers/providerInfo";

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
    
    // Update provider ratings with verified TrustPilot values
    try {
      const { updateVerifiedRatings } = await import('./updateVerifiedRatings');
      log("Updating provider ratings with verified TrustPilot values...");
      await updateVerifiedRatings();
      log("Provider ratings updated with TrustPilot values");
    } catch (ratingError) {
      log(`Error updating provider ratings: ${ratingError}`);
    }
    
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
      
      // First try to update rates directly from provider APIs
      try {
        // Specifically try Wise API first since we have the key
        try {
          const updateWiseRates = (await import('./api/wiseApi.js')).default;
          log("Fetching exchange rates directly from Wise API...");
          await updateWiseRates();
          log("Wise API rate update completed");
        } catch (wiseError) {
          log(`Error updating rates from Wise API: ${wiseError}`);
        }
        
        // Try other provider APIs
        const updateRatesFromApis = (await import('./api/providerApis.js')).default;
        log("Attempting to update rates from other provider APIs...");
        await updateRatesFromApis();
        log("API-based rate updates completed");
      } catch (apiError) {
        log(`Error updating rates from provider APIs: ${apiError}`);
      }
      
      // Then fall back to web scraping for any missing rates
      await updateExchangeRates();
      log("Exchange rates updated with scraped data");
      
      // Initialize rate trends data if needed
      try {
        const { initializeRateTrends } = await import('./initializeRateTrends');
        log("Ensuring rate trend data is initialized...");
        await initializeRateTrends();
        log("Rate trend data initialization complete");
      } catch (trendsError) {
        log(`Error initializing rate trends: ${trendsError}`);
      }
      
      // Import and apply any verified rates
      try {
        const updatePreciseRates = (await import('./updateRates.js')).default;
        log("Updating exchange rates with verified values...");
        await updatePreciseRates();
        log("Exchange rates updated with verified values");
      } catch (rateError) {
        log(`Error updating verified rates: ${rateError}`);
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
        const success = await updateExchangeRates();
        
        // If regular scraping fails or doesn't find all providers, use verified rates as fallback
        if (!success) {
          log("Web scraping failed, using verified rates as fallback...");
          // Import and use verified rates as a fallback
          const { updateVerifiedRates } = await import('./updateVerifiedRates');
          await updateVerifiedRates();
        }
        
        log("Scheduled exchange rate update completed successfully");
      } catch (error) {
        log(`Error in scheduled exchange rate update: ${error}`);
        
        // Even if there's an error, still try verified rates
        try {
          log("Error occurred, using verified rates as fallback...");
          const { updateVerifiedRates } = await import('./updateVerifiedRates');
          await updateVerifiedRates();
        } catch (fallbackError) {
          log(`Error in fallback rate update: ${fallbackError}`);
        }
      }
    }, SIX_HOURS);
    
    // Update exchange rate trends 3 times per day (every 8 hours)
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        log("Running scheduled exchange rate trends update...");
        await updateRealRateTrends();
        log("Exchange rate trends updated from real APIs");
      } catch (error) {
        log(`Error updating exchange rate trends: ${error}`);
      }
    }, EIGHT_HOURS);
    
    // Update news every 8 hours
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
