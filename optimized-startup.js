/**
 * Optimized startup file for the rate comparison application
 * 
 * This file implements a more efficient startup process:
 * 1. Starts the server quickly with minimal initialization
 * 2. Only performs essential database setup
 * 3. Schedules background tasks to run at appropriate intervals
 * 4. Avoids heavy web scraping during startup
 */

import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./server/routes";
import { setupVite, serveStatic, log } from "./server/vite";
import { initializeDatabase } from "./server/db";
import { storage } from "./server/storage";
import dataSourceRoutes from "./server/routes/dataSourceRoutes";
// Import verification routes
import verificationRoutes from "./server/routes/verificationRoutes";

// Create the Express application
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
app.use('/api', dataSourceRoutes);
app.use('/', verificationRoutes);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse;

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

/**
 * Set up a scheduled task to run at specific times of day
 * @param {function} task - The task to run
 * @param {Array<number>} hours - The hours to run the task (0-23)
 */
function scheduleTaskAtHours(task, hours) {
  const INTERVAL = 60 * 60 * 1000; // Check every hour
  
  setInterval(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (hours.includes(currentHour)) {
      task();
    }
  }, INTERVAL);
}

/**
 * Schedule task to run after a specified interval
 * @param {function} task - The task to run
 * @param {number} hours - Run every x hours
 */
function scheduleTaskEveryXHours(task, hours) {
  const interval = hours * 60 * 60 * 1000;
  setInterval(task, interval);
}

// Start the application
(async () => {
  // Initialize database tables (essential)
  try {
    log("Initializing database...");
    await initializeDatabase();
    log("Database initialized successfully");
  } catch (error) {
    log(`Failed to initialize database: ${error}`);
  }

  // Register routes and start the server
  const server = await registerRoutes(app);

  // Set up scheduled tasks AFTER server is started
  setTimeout(async () => {
    try {
      log("Setting up scheduled tasks...");
      
      // 1. Schedule rate scraping to run 3 times per day (6 AM, 2 PM, 10 PM)
      scheduleTaskAtHours(async () => {
        log("Running scheduled rate update...");
        try {
          // First try API update
          const updateWiseRates = (await import('./server/api/wiseApi.js')).default;
          await updateWiseRates();
          log("Wise API rates updated");
          
          // Then try scraping for other providers
          const { updateExchangeRates } = await import('./server/scrapers/providers.js');
          await updateExchangeRates();
          log("Exchange rates updated via scraping");
        } catch (error) {
          log(`Error in scheduled rate update: ${error}`);
        }
      }, [6, 14, 22]); // 6 AM, 2 PM, 10 PM
      
      // 2. Schedule TrustPilot rating update once per day (3 AM)
      scheduleTaskAtHours(async () => {
        log("Running scheduled TrustPilot rating update...");
        try {
          const { updateTrustpilotRatings } = await import('./server/trustpilotRatings.js');
          await updateTrustpilotRatings();
          log("TrustPilot ratings updated");
        } catch (error) {
          log(`Error updating TrustPilot ratings: ${error}`);
        }
      }, [3]); // 3 AM
      
      // 3. Schedule news update every 8 hours
      scheduleTaskEveryXHours(async () => {
        log("Running scheduled news update...");
        try {
          await storage.deleteAllNews();
          const { updateFinancialNews } = await import('./server/scrapers/news.js');
          const results = await updateFinancialNews();
          log(`News updated with ${results.length} items`);
        } catch (error) {
          log(`Error updating news: ${error}`);
        }
      }, 8);
      
      log("Scheduled tasks configured successfully");
      
      // Initialize rate trends in the background
      setTimeout(async () => {
        try {
          const { initializeRateTrends } = await import('./server/initializeRateTrends.js');
          await initializeRateTrends();
          log("Rate trends initialized in background");
        } catch (error) {
          log(`Error initializing rate trends: ${error}`);
        }
      }, 10000);
      
    } catch (error) {
      log(`Error setting up scheduled tasks: ${error}`);
    }
  }, 2000); // Wait 2 seconds after server starts before setting up tasks

  // Error handling
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Set up Vite for development or static serving for production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server started successfully on port ${port}`);
  });
})();