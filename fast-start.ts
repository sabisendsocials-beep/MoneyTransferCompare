import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./server/routes";
import { setupVite, serveStatic, log } from "./server/vite";
import { initializeDatabase } from "./server/db";
import dataSourceRoutes from "./server/routes/dataSourceRoutes";
import { storage } from "./server/storage";
import rateVerificationRouter from "./server/routes/rateVerificationRouter";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
app.use('/api', dataSourceRoutes);

// Register verification routes
app.use('/', rateVerificationRouter);

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
  // Initialize database tables (essential)
  try {
    log("Initializing database...");
    await initializeDatabase();
    log("Database initialized successfully");
  } catch (error) {
    log(`Failed to initialize database: ${error}`);
  }

  const server = await registerRoutes(app);

  // Schedule data updates to run AFTER server startup
  setTimeout(async () => {
    try {
      log("Starting scheduled data updates...");
      // Update provider list in the background
      import('./server/updateProviderList').then(({ default: updateProviderList }) => {
        updateProviderList().then(() => {
          log("Provider list updated in background");
        });
      });

      // Schedule rate updates in the background
      setTimeout(() => {
        import('./server/api/wiseApi').then(({ default: updateWiseRates }) => {
          updateWiseRates().then(() => {
            log("Wise rates updated in background");
          });
        });
      }, 5000);

      // Schedule trend data initialization in the background
      setTimeout(() => {
        import('./server/initializeRateTrends').then(({ initializeRateTrends }) => {
          initializeRateTrends().then(() => {
            log("Rate trends initialized in background");
          });
        });
      }, 10000);

    } catch (error) {
      log(`Error in background data updates: ${error}`);
    }
  }, 2000);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Set up vite for development or static serving for production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 5000
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();