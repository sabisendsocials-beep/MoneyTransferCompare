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
import dataSourceRoutes from "./routes/dataSourceRoutes";
import { initializeRateCollectionScheduler } from "./scheduler/rateCollectionScheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register data collection API routes
app.use('/api', dataSourceRoutes);

// Register rate verification endpoint
import verifyApiRouter from './routes/verify-api.js';
app.use(verifyApiRouter);

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
  // OPTIMIZED STARTUP - Only initialize essential database tables
  try {
    log("Initializing database...");
    await initializeDatabase();
    log("Database initialized successfully");
    
    // Run the provider schema migration to ensure all required columns exist
    try {
      log("Running provider schema migration...");
      const { updateProviderSchema } = await import('./migrations/updateProviderSchema');
      await updateProviderSchema();
      log("Provider schema migration completed");
    } catch (migrationError) {
      log(`Error in provider schema migration: ${migrationError}`);
    }
    
    // Initialize the rate collection scheduler (runs 3x daily)
    try {
      log("Initializing rate collection scheduler...");
      initializeRateCollectionScheduler();
      log("Rate collection scheduler initialized (runs at 6 AM, 2 PM, and 10 PM)");
    } catch (schedulerError) {
      log(`Error initializing rate collection scheduler: ${schedulerError}`);
    }
    
    // We'll defer all other operations until after server startup
    log("Deferring heavy operations until after server startup for faster loading...");
    
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
  
  // Run deferred operations AFTER server has started (with delay)
  setTimeout(async () => {
    log("Server started, now running deferred operations...");
    
    try {
      // Update the provider list with the latest providers
      log("Updating provider list with latest providers...");
      await updateProviderList();
      log("Provider list updated with latest providers");
      
      // Initialize rate trends data if needed
      try {
        const { initializeRateTrends } = await import('./initializeRateTrends');
        log("Ensuring rate trend data is initialized...");
        await initializeRateTrends();
        log("Rate trend data initialization complete");
      } catch (trendsError) {
        log(`Error initializing rate trends: ${trendsError}`);
      }
      
      // Update provider ratings (but don't block startup)
      setTimeout(async () => {
        try {
          const { updateVerifiedRatings } = await import('./updateVerifiedRatings');
          log("Updating provider ratings with verified TrustPilot values...");
          await updateVerifiedRatings();
          log("Provider ratings updated with TrustPilot values");
        } catch (ratingError) {
          log(`Error updating provider ratings: ${ratingError}`);
        }
      }, 10000); // Run after 10 seconds
      
      // Check if rates exist, only fetch if we don't have recent data
      const checkAndUpdateRates = async () => {
        try {
          // Check for recent rates in the database
          const fromCurrency = "GBP";
          const toCurrency = "NGN";
          const recentRates = await storage.getLatestRates(fromCurrency, toCurrency);
          
          // Only update if we don't have recent rates
          if (!recentRates || recentRates.length === 0) {
            log("No recent exchange rates found, fetching current rates...");
            
            // Try API-based updates first
            try {
              // Specifically try Wise API since we have the key
              const updateWiseRates = (await import('./api/wiseApi.js')).default;
              log("Fetching exchange rates from Wise API...");
              await updateWiseRates();
              log("Wise API rate update completed");
            } catch (wiseError) {
              log(`Error updating rates from Wise API: ${wiseError}`);
            }
            
            // Then try other provider APIs
            try {
              const updateRatesFromApis = (await import('./api/providerApis.js')).default;
              log("Attempting to update rates from other provider APIs...");
              await updateRatesFromApis();
              log("API-based rate updates completed");
            } catch (apiError) {
              log(`Error updating rates from provider APIs: ${apiError}`);
            }
          } else {
            log(`Found ${recentRates.length} recent exchange rates, skipping fresh fetch`);
          }
        } catch (error) {
          log(`Error checking and updating rates: ${error}`);
        }
      };
      
      // Schedule rate checks to run after 20 seconds
      setTimeout(checkAndUpdateRates, 20000);
      
    } catch (error) {
      log(`Error in deferred operations: ${error}`);
    }
  }, 5000); // Wait 5 seconds after server startup

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
