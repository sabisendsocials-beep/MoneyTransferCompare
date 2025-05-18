/**
 * Optimized server startup implementation
 * - Starts the server quickly with minimal initialization
 * - Defers expensive operations to run after startup
 * - Implements proper scheduling for data updates
 * - Includes verification endpoints and manual update triggers
 */

import express from "express";
import { registerRoutes } from "./server/routes";
import { setupVite, serveStatic, log } from "./server/vite";
import { initializeDatabase } from "./server/db";
import { db } from "./server/db";
import { exchangeRates } from "./shared/schema";
import { eq } from "drizzle-orm";
import dataSourceRoutes from "./server/routes/dataSourceRoutes";

// Create express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
app.use('/api', dataSourceRoutes);

// ====== Direct Verification Endpoints ======

// Verify/unverify an exchange rate
app.post("/api/rate-verify", async (req, res) => {
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
    
    // Try direct SQL approach first for maximum reliability
    try {
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
    } catch (sqlError) {
      console.error(`SQL approach failed: ${sqlError}`);
      
      // Fall back to ORM approach
      try {
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
        
        return res.json({
          success: true,
          message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
          rate: updatedRate
        });
      } catch (ormError) {
        throw new Error(`Both SQL and ORM approaches failed: ${ormError}`);
      }
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
app.get("/api/verified-rates", async (_req, res) => {
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

// ====== Manual Update Endpoints ======

// Manually trigger rate updates
app.post("/api/refresh-rates", async (_req, res) => {
  try {
    // Schedule the update in the background
    setTimeout(async () => {
      try {
        const updateWiseRates = (await import('./server/api/wiseApi.js')).default;
        await updateWiseRates();
        console.log("Manual rate update completed successfully");
      } catch (error) {
        console.error(`Error in manual rate update: ${error}`);
      }
    }, 100);
    
    return res.json({
      success: true,
      message: "Rate update has been triggered in the background"
    });
  } catch (error) {
    console.error(`Error triggering rate update: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to trigger rate update",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Manually trigger TrustPilot updates
app.post("/api/refresh-ratings", async (_req, res) => {
  try {
    // Schedule the update in the background
    setTimeout(async () => {
      try {
        const { updateTrustpilotRatings } = await import('./server/trustpilotRatings.js');
        await updateTrustpilotRatings();
        console.log("Manual TrustPilot update completed successfully");
      } catch (error) {
        console.error(`Error in manual TrustPilot update: ${error}`);
      }
    }, 100);
    
    return res.json({
      success: true,
      message: "TrustPilot rating update has been triggered in the background"
    });
  } catch (error) {
    console.error(`Error triggering TrustPilot update: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Failed to trigger TrustPilot update",
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

// Schedule task to run at specific times
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

  // Set up scheduled tasks AFTER server is already running
  setTimeout(async () => {
    try {
      log("Setting up scheduled tasks...");
      
      // Schedule rate updates (6 AM, 2 PM, 10 PM)
      scheduleTaskAtHours(async () => {
        log("Running scheduled rate update...");
        try {
          // First try API update for Wise
          const updateWiseRates = (await import('./server/api/wiseApi.js')).default;
          await updateWiseRates();
          log("Wise API rates updated successfully");
        } catch (error) {
          log(`Error in scheduled Wise API update: ${error}`);
        }
      }, [6, 14, 22]); // 6 AM, 2 PM, 10 PM
      
      // Schedule TrustPilot update (3 AM)
      scheduleTaskAtHours(async () => {
        log("Running scheduled TrustPilot rating update...");
        try {
          const { updateTrustpilotRatings } = await import('./server/trustpilotRatings.js');
          await updateTrustpilotRatings();
          log("TrustPilot ratings updated successfully");
        } catch (error) {
          log(`Error updating TrustPilot ratings: ${error}`);
        }
      }, [3]); // 3 AM
      
      log("Scheduled tasks configured successfully");
      
      // Initialize rate trends in the background after server is up
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