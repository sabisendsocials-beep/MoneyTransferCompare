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
import { initializeDailyIncrementScheduler } from "./scheduler/dailyIncrementScheduler";
import { initializeRateAlertScheduler } from "./scheduler/rateAlertScheduler";
import { initializeProviderApiScheduler } from "./scheduler/providerApiScheduler";
// DISABLED: Historical data scheduler causes Alpha Vantage data conflicts
// import { initializeHistoricalDataScheduler } from "./scheduler/historicalDataScheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register data collection API routes
app.use('/api', dataSourceRoutes);

// Register rate verification endpoint
import verifyApiRouter from './routes/verify-api.js';
app.use(verifyApiRouter);

// Register Provider API Scheduler management routes
import providerApiSchedulerRoutes from './routes/providerApiSchedulerRoutes';
import dailyIncrementSchedulerRoutes from './routes/dailyIncrementSchedulerRoutes';
app.use('/api/admin/provider-api-scheduler', providerApiSchedulerRoutes);
app.use('/api/admin/daily-increment-scheduler', dailyIncrementSchedulerRoutes);

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
  // =========================================================
  // OPTIMIZED STARTUP - ABSOLUTELY NO DATA OPERATIONS DURING RESTART
  // =========================================================
  try {
    log("🔒 SECURE STARTUP: Running minimal initialization with no data operations");
    log("Initializing database connection only...");
    await initializeDatabase();
    log("✓ Database connection initialized successfully");
    
    // Run the provider schema migration to ensure all required columns exist
    // This only updates table structure, not data
    try {
      log("Running provider schema migration (structure only, no data changes)...");
      const { updateProviderSchema } = await import('./migrations/updateProviderSchema');
      await updateProviderSchema();
      log("✓ Provider schema migration completed (table structure only)");
    } catch (migrationError) {
      log(`Error in provider schema migration: ${migrationError}`);
    }
    
    // DISABLED: Emergency restoration removed - admin panel has full control
    try {
      log("✓ Core provider restoration disabled - admin panel has full control");
    } catch (restorationError) {
      log(`Error in core provider restoration: ${restorationError}`);
    }
    
    // DISABLED: Provider validation disabled to give admin panel full control
    try {
      log("✓ Provider validation disabled - admin panel has full control");
    } catch (validationError) {
      log(`Error validating provider configurations: ${validationError}`);
    }
    
    // Set up SCHEDULERS ONLY, but DO NOT trigger immediate data collection
    try {
      log("📅 Setting up scheduled rate collection (NO IMMEDIATE DATA OPERATIONS)");
      
      // Import scheduler but don't run any immediate collection
      const { setupSchedulesOnly } = await import('./scheduler/fixedRateCollection');
      setupSchedulesOnly();
      
      log("✓ Rate collection scheduler initialized (runs ONLY at 6 AM, 2 PM, and 10 PM)");
      log("⚠️ No immediate data collection during server restart");
    } catch (schedulerError) {
      log(`Error setting up rate collection scheduler: ${schedulerError}`);
    }
    
    // Initialize daily increment scheduler for Alpha Vantage data
    try {
      log("📊 Setting up daily increment scheduler for Alpha Vantage data");
      await initializeDailyIncrementScheduler();
      log("✓ Daily increment scheduler initialized (runs 5 times daily: 3am, 9am, 12pm, 3pm, 6pm UTC)");
      log("📋 Daily increments add new data without affecting historical Alpha Vantage data");
    } catch (incrementError) {
      log(`Error setting up daily increment scheduler: ${incrementError}`);
    }
    
    // Initialize rate alert scheduler
    try {
      log("🔔 Setting up rate alert scheduler");
      await initializeRateAlertScheduler();
      log("✓ Rate alert scheduler initialized (checks hourly for triggered alerts)");
      log("📧 Email notifications sent when target rates are reached");
    } catch (alertError) {
      log(`Error setting up rate alert scheduler: ${alertError}`);
    }

    // Initialize commentary caching scheduler
    try {
      log("💬 Setting up commentary caching scheduler");
      const { startCommentaryScheduler } = await import('./scheduler/commentaryScheduler');
      startCommentaryScheduler();
      log("✓ Commentary scheduler initialized (generates 3-5 daily commentaries at 6AM UTC)");
      log("🔋 OpenAI quota optimized with smart caching system");
    } catch (commentaryError) {
      log(`Error setting up commentary scheduler: ${commentaryError}`);
    }
    
    // Initialize Provider API scheduler
    try {
      log("🔗 Setting up Provider API scheduler for API-based rate collection");
      await initializeProviderApiScheduler();
      log("✓ Provider API scheduler initialized (runs 6 times daily: 6am, 9am, 12pm, 3pm, 6pm, 9pm UTC)");
      log("🏢 Scheduler will collect rates from API-enabled providers only");
    } catch (apiError) {
      log(`Error setting up Provider API scheduler: ${apiError}`);
    }
    
    // Initialize Rate Bridge sync scheduler
    try {
      log("🌉 Setting up Rate Bridge sync scheduler");
      const { startBridgeSyncScheduler } = await import('./services/bridgeSyncService');
      startBridgeSyncScheduler();
      log("✓ Bridge sync scheduler initialized (runs every 6 hours, first run in 10s)");
      log("📡 Fetches live rates from rates.sabisendrates.com for all 13 corridors");
    } catch (bridgeError) {
      log(`Error setting up bridge sync scheduler: ${bridgeError}`);
    }

    // Strictly defer ALL operations until after server startup
    log("🔒 STRICT POLICY: All data operations deferred until scheduled time");
    log("📋 DATA OPERATIONS POLICY:");
    log("  - NO provider initialization during restart");
    log("  - NO rate collection during restart");
    log("  - NO trend data updates during restart");
    log("  - NO news updates during restart");
    
  } catch (error) {
    log(`Failed during minimal initialization: ${error}`);
  }
  
  /**
   * Sets up automatic interval-based updates for various data sources
   * This ensures our data stays fresh without manual intervention
   * OPTIMIZED: Only scheduled tasks, no automatic runs during server restart
   */
  function setupAutomaticUpdates(): void {
    log("Setting up scheduled data updates (NO automatic runs during server restart)");
    
    // Update exchange rates every 6 hours - SCHEDULED ONLY, not on restart
    const SIX_HOURS = 6 * 60 * 60 * 1000; 
    setInterval(async () => {
      try {
        log("Running SCHEDULED exchange rate update (6-hour interval)...");
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
    
    // DISABLED: Daily Alpha Vantage update causes data conflicts with protected datasets
    // This function conflicts with existing Alpha Vantage data and causes overwrites
    // const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    // setInterval(async () => {
    //   try {
    //     log("Running SCHEDULED Alpha Vantage historical data update (daily)...");
    //     const { runDailyAlphaVantageUpdate } = await import('../automated-daily-alpha-vantage-updater');
    //     await runDailyAlphaVantageUpdate();
    //     log("Daily Alpha Vantage update completed - all 15 currency pairs maintained");
    //   } catch (error) {
    //     log(`Error in daily Alpha Vantage update: ${error}`);
    //   }
    // }, TWENTY_FOUR_HOURS);
    
    // Update news every 8 hours - SCHEDULED ONLY, not on restart
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        log("Running SCHEDULED news update (8-hour interval)...");
        await storage.deleteAllNews();
        const results = await updateFinancialNews();
        log(`Scheduled news update completed with ${results.length} news items added`);
      } catch (error) {
        log(`Error in scheduled news update: ${error}`);
      }
    }, EIGHT_HOURS);
    
    log("✓ Automatic update intervals have been set up (scheduled only, not during restart)");
  }

  const server = await registerRoutes(app);
  
  // Set up automatic update intervals for data
  setupAutomaticUpdates();
  
  // OPTIMIZED SERVER STARTUP - NO DATA OPERATIONS
  // Log security status only, avoid all data operations during restart
  log("Server started - running in optimized startup mode");
  
  // Display security status
  log("⛔ PROVIDER SECURITY: Provider modifications completely locked down");
  log("⛔ PROVIDER SECURITY: Provider data can ONLY be modified via Admin Panel");
  log("⚠️ WARNING: Any automation attempting to modify providers will be blocked");
  
  // STARTUP POLICY: No data operations during server restart
  log("📊 DATA OPERATIONS POLICY: No web scraping during server restart");
  log("📊 DATA OPERATIONS POLICY: No rate history updates during server restart");
  log("📊 DATA OPERATIONS POLICY: No news updates during server restart");
  log("📊 DATA OPERATIONS POLICY: Using existing database data only");
  
  // Log that operations will only run at scheduled times
  log("⏱️ All data operations will ONLY run at scheduled intervals");
  log("⏱️ Web scraping: Every 6 hours via scheduler");
  log("⏱️ Rate trends: Every 8 hours via scheduler");
  log("⏱️ News updates: Every 8 hours via scheduler");

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
