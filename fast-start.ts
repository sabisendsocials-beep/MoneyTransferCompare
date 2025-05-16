import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./server/routes";
import { setupVite, serveStatic, log } from "./server/vite";
import { initializeDatabase } from "./server/db";
import { storage } from "./server/storage";

/**
 * This is a simplified version of the server that skips the heavy web scraping
 * operations during startup, allowing the app to load faster in development.
 */

// Create the express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add logging middleware
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
      const statusCode = res.statusCode;
      const statusClass = Math.floor(statusCode / 100);
      const level = statusClass === 2 ? "info" : statusClass >= 4 ? "error" : "warn";
      
      // Only log API calls for brevity
      if (level === "error" || duration > 1000) {
        console[level](
          `${req.method} ${path} ${statusCode} - ${duration}ms ${
            capturedJsonResponse ? JSON.stringify(capturedJsonResponse) : ""
          }`
        );
      }
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Express error:", err);
  res.status(500).json({
    message: "An unexpected error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Function to start the server
async function start() {
  try {
    // Register routes first
    const server = await registerRoutes(app);
    
    // Initialize database
    await initializeDatabase();
    log("Database initialized");
    
    // Set up Vite for frontend
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    // Populate rate trends data if needed
    try {
      const { db } = await import('./server/db');
      const { sql } = await import('drizzle-orm');
      
      // Check if we have trend data
      const trendCount = await db.execute(sql`SELECT COUNT(*) FROM rate_trends`);
      const count = parseInt(String(trendCount.rows[0].count));
      
      if (count === 0) {
        log("No rate trend data found, populating with initial data...");
        const { initializeRateTrends } = await import('./server/initializeRateTrends');
        await initializeRateTrends();
        log("Rate trend data initialized");
      } else {
        log(`Found ${count} rate trend records in database`);
      }
    } catch (error) {
      log(`Error checking/initializing rate trends: ${error}`);
    }
    
    log("Fast-start mode: Web server started successfully (Skipping scrapers)");
    log("Frontend is available via workflow link");
    log("NOTE: Exchange rates and news may not be available until they're queried");
  } catch (error) {
    log(`Failed to start server: ${error}`);
  }
}

start();