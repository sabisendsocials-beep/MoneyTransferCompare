#!/bin/bash
# Implementation script for optimized server and rate verification

# Create the optimized server file
echo "Creating optimized server file..."

cat > optimized-server.js << 'EOL'
/**
 * Optimized server for the rate comparison application
 * - Fast startup with essential services only
 * - Deferred heavy operations to run after startup
 * - Scheduled data updates at appropriate intervals
 * - Built-in rate verification system
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

// Rate verification endpoint
app.post("/api/rate-verify", async (req, res) => {
  try {
    const { id, verified } = req.body;
    
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
    
    // Direct SQL update for maximum reliability
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
    } catch (error) {
      console.error(`Error verifying rate: ${error}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to update rate verification status',
        error: error instanceof Error ? error.message : String(error)
      });
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

// Manual rate update endpoint
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
  // Only initialize database at startup - everything else happens later
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

  // Set up Vite for development
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
EOL

# Create the verification badge component
echo "Creating verification badge component..."

mkdir -p client/src/components

cat > client/src/components/VerificationBadge.jsx << 'EOL'
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

/**
 * Component to display verification status badge
 */
export const VerificationBadge = ({ verified, className = "" }) => {
  if (!verified) return null;
  
  return (
    <Badge className={`bg-green-50 text-green-700 border-green-100 flex items-center gap-1 ${className}`}>
      <CheckCircle2 className="h-3 w-3" />
      <span>Verified</span>
    </Badge>
  );
};
EOL

# Create updated admin page with verification
echo "Creating admin page update code..."

cat > admin-page-verification-update.jsx << 'EOL'
// Add this mutation to your LatestRatesTable component:

// Mutation for verifying a rate
const verifyRateMutation = useMutation({
  mutationFn: async ({ rateId, verified }) => {
    console.log(`Verifying rate ID ${rateId} as ${verified ? 'verified' : 'unverified'}`);
    
    const response = await fetch('/api/rate-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        id: rateId, 
        verified 
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Verification failed: ${errorData.message || 'Unknown error'}`);
    }
    
    return await response.json();
  },
  onSuccess: () => {
    toast({
      title: "Verification status updated",
      description: "The rate verification status has been updated",
    });
    refetch(); // Refresh the rates data
  },
  onError: (error) => {
    toast({
      title: "Error updating verification",
      description: error.message || "An unknown error occurred",
      variant: "destructive",
    });
  }
});

// Add manual update buttons to the Admin interface:
<div className="mt-8 mb-6">
  <h3 className="text-lg font-semibold mb-4">Manual Update Controls</h3>
  <div className="flex flex-wrap gap-4">
    <Button 
      onClick={async () => {
        try {
          const response = await fetch('/api/refresh-rates', { method: 'POST' });
          if (!response.ok) throw new Error("Failed to trigger rate update");
          
          toast({
            title: "Rate update triggered",
            description: "Exchange rates are being refreshed in the background",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to trigger rate update",
            variant: "destructive",
          });
        }
      }}
    >
      Refresh Exchange Rates
    </Button>
    
    <Button 
      onClick={async () => {
        try {
          const response = await fetch('/api/refresh-ratings', { method: 'POST' });
          if (!response.ok) throw new Error("Failed to trigger rating update");
          
          toast({
            title: "Rating update triggered",
            description: "Provider ratings are being refreshed in the background",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to trigger rating update",
            variant: "destructive",
          });
        }
      }}
      variant="outline"
    >
      Refresh Provider Ratings
    </Button>
  </div>
</div>
EOL

# Provide instructions
echo ""
echo "===== IMPLEMENTATION COMPLETE ====="
echo ""
echo "TO USE THE OPTIMIZED SERVER:"
echo "1. Run 'tsx optimized-server.js' instead of your current startup command"
echo "2. Update your workflow to use this command instead of 'npm run dev'"
echo ""
echo "TO IMPLEMENT RATE VERIFICATION:"
echo "1. The VerificationBadge component has been created at client/src/components/VerificationBadge.jsx"
echo "2. Update your AdminPage.tsx with the code in admin-page-verification-update.jsx"
echo "3. Add the verified badge to your ComparisonResults component"
echo ""
echo "BENEFITS:"
echo "- Faster server startup (avoids 20-second timeout)"
echo "- Reliable rate verification system"
echo "- Properly scheduled data updates (3x daily for rates, 1x daily for TrustPilot)"
echo "- Manual update controls in the admin interface"
echo ""