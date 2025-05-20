/**
 * Lemfi scraper routes
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { updateLemfiRates } from '../scrapers/lemfiScraper';

export const lemfiRouter = Router();

// Test endpoint for Lemfi scraper
lemfiRouter.post("/api/update-lemfi", async (req: Request, res: Response) => {
  try {
    console.log("Triggering Lemfi rate update with dedicated scraper...");
    
    // Run the Lemfi scraper
    const success = await updateLemfiRates();
    
    if (success) {
      // Get the Lemfi provider
      const providers = await storage.getProviders();
      const lemfiProvider = providers.find(p => p.name === 'Lemfi');
      
      if (!lemfiProvider) {
        return res.status(404).json({ error: "Lemfi provider not found" });
      }
      
      // Get the latest rate
      const latestRates = await storage.getLatestRates('GBP', 'NGN');
      const lemfiRate = latestRates.find(r => r.provider_id === lemfiProvider.id);
      
      return res.json({
        success: true,
        message: "Lemfi rate updated successfully",
        provider: "Lemfi",
        rate: lemfiRate?.rate || "unknown",
        source: lemfiRate?.source || "SCRAPER"
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to update Lemfi rate"
      });
    }
  } catch (error) {
    console.error("Error updating Lemfi rate:", error);
    return res.status(500).json({ error: "Error updating Lemfi rate" });
  }
});