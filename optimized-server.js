/**
 * Optimized server startup file for the rate comparison application
 * This file:
 * 1. Prioritizes essential services to start quickly
 * 2. Defers heavy operations to run after startup
 * 3. Implements a reliable rate verification system
 * 4. Sets up proper scheduling for data updates
 */

import express from "express";
import { registerRoutes } from "./server/routes";
import { setupVite, serveStatic, log } from "./server/vite";
import { initializeDatabase } from "./server/db";
import { db } from "./server/db";
import dataSourceRoutes from "./server/routes/dataSourceRoutes";
import { eq } from "drizzle-orm";
import { exchangeRates } from "./shared/schema";

// Create express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
app.use('/api', dataSourceRoutes);

// Add direct verification endpoint
app.post("/api/direct-verify", async (req, res) => {
  try {
    const { id, verified } = req.body;
    
    console.log(`Rate verification request - ID: ${id}, Verified: ${verified}`);
    
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
    
    // Execute direct SQL for maximum reliability
    const result = await db.execute(
      `UPDATE exchange_rates 
       SET verified = $1, timestamp = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [verified, id]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }
    
    console.log(`Rate ${id} ${verified ? 'verified' : 'unverified'} successfully`);
    
    return res.json({
      success: true,
      message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
      rate: result.rows[0]
    });
  } catch (error) {
    console.error(`Error verifying rate: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update rate verification status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Add endpoint to get verified rates
app.get("/api/verified-rates", async (req, res) => {
  try {
    const verifiedRates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.verified, true))
      .orderBy(exchangeRates.timestamp);
    
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

// Request logging middleware
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
 * Schedule task to run at specific times of day
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

// Start the application
(async () => {
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
      
      // 1. Schedule rate updates 3 times per day (6 AM, 2 PM, 10 PM)
      scheduleTaskAtHours(async () => {
        log("Running scheduled rate update...");
        try {
          // First try API update for Wise
          const wiseModule = await import('./server/api/wiseApi.js');
          await wiseModule.default();
          log("Wise API rates updated");
          
          // Schedule TrustPilot update for 3 AM daily
          scheduleTaskAtHours(async () => {
            log("Running TrustPilot rating update...");
            try {
              const { updateTrustpilotRatings } = await import('./server/trustpilotRatings.js');
              await updateTrustpilotRatings();
              log("TrustPilot ratings updated successfully");
            } catch (error) {
              log(`Error updating TrustPilot ratings: ${error}`);
            }
          }, [3]); // 3 AM
        } catch (error) {
          log(`Error in scheduled updates: ${error}`);
        }
      }, [6, 14, 22]); // 6 AM, 2 PM, 10 PM
      
      log("Scheduled tasks configured successfully");
    } catch (error) {
      log(`Error setting up scheduled tasks: ${error}`);
    }
  }, 2000);

  // Error handling middleware
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
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
    log(`Server started on port ${port}`);
  });
})();