/**
 * Lemfi scraper routes
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { updateLemfiRates } from '../scrapers/lemfiScraper';
import { fetchBridgeRate, fetchAndSaveBridgeRate } from '../services/rateBridgeService';

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

/**
 * GET /api/bridge/lemfi/test
 * Fetch the LemFi GBP->NGN rate from the bridge without saving to DB.
 * Use this to verify the bridge is reachable and returning valid data.
 */
lemfiRouter.get("/api/bridge/lemfi/test", async (req: Request, res: Response) => {
  try {
    const from = (req.query.from as string) || 'GBP';
    const to = (req.query.to as string) || 'NGN';

    console.log(`[Bridge Test] Fetching LemFi ${from}->${to} from bridge (no DB save)...`);

    const result = await fetchBridgeRate('lemfi', from, to);

    if (!result) {
      return res.status(502).json({
        success: false,
        message: 'Bridge returned no data — check bridge is online and reachable'
      });
    }

    return res.json({
      success: true,
      message: `LemFi ${from}->${to} fetched from bridge (not saved)`,
      data: result
    });
  } catch (error: any) {
    console.error('[Bridge Test] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bridge/lemfi/fetch
 * Fetch the LemFi GBP->NGN rate from the bridge AND save it to the DB
 * as an API-sourced rate (highest priority).
 */
lemfiRouter.post("/api/bridge/lemfi/fetch", async (req: Request, res: Response) => {
  try {
    const from = (req.body?.from as string) || 'GBP';
    const to = (req.body?.to as string) || 'NGN';

    console.log(`[Bridge Fetch] Fetching and saving LemFi ${from}->${to}...`);

    const result = await fetchAndSaveBridgeRate('lemfi', from, to);

    if (!result) {
      return res.status(502).json({
        success: false,
        message: 'Bridge fetch failed — check bridge is online'
      });
    }

    return res.json({
      success: true,
      message: result.savedToDb
        ? `LemFi ${from}->${to} rate saved to DB (id: ${result.dbRecordId})`
        : `LemFi rate fetched but not saved (provider not found in DB?)`,
      data: result
    });
  } catch (error: any) {
    console.error('[Bridge Fetch] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});