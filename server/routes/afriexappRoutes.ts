/**
 * Afriexapp API Routes
 * 
 * This file contains endpoints for testing and updating Afriexapp rates
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { scrapeAfriexappDirect } from '../scrapers/afriexappDirectScraper';

// Create router
const afriexappRouter = Router();

// Afriexapp test endpoint
afriexappRouter.post("/test-afriexapp-scraper", async (req: Request, res: Response) => {
  try {
    console.log('Testing Afriexapp scraper with correct selector...');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const afriexappProvider = providers.find(p => p.name === 'Afriexapp');
    
    if (!afriexappProvider) {
      return res.status(404).json({
        success: false,
        message: "Afriexapp provider not found in database"
      });
    }
    
    // Get the admin-configured URL
    const afriexappUrl = afriexappProvider.scraping_url;
    // Use the selector from the HTML snippet
    const afriexappSelector = 'div#converter-exchange-rate.converter-information__text-stm';
    
    if (!afriexappUrl) {
      return res.status(400).json({
        success: false,
        message: "Afriexapp provider missing required URL in admin config"
      });
    }
    
    console.log(`Using admin-configured URL for Afriexapp: ${afriexappUrl}`);
    console.log(`Using CSS selector: ${afriexappSelector}`);
    
    // Run the direct scraper (no fallbacks)
    const success = await scrapeAfriexappDirect(
      afriexappUrl,
      afriexappSelector,
      afriexappProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      res.json({
        success: true,
        message: "Afriexapp rate successfully updated using direct scraping",
        selector: afriexappSelector
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Afriexapp rate could not be scraped from the website",
        selector: afriexappSelector
      });
    }
  } catch (error) {
    console.error("Error in /test-afriexapp-scraper:", error);
    res.status(500).json({
      success: false,
      message: "Error running Afriexapp scraper",
      error: String(error)
    });
  }
});

// Update Afriexapp rate endpoint
afriexappRouter.post("/update-afriexapp-rate", async (req: Request, res: Response) => {
  try {
    console.log('Triggering Afriexapp rate update...');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const afriexappProvider = providers.find(p => p.name === 'Afriexapp');
    
    if (!afriexappProvider) {
      return res.status(404).json({
        success: false,
        message: "Afriexapp provider not found in database"
      });
    }
    
    // Direct scraping only - no fallbacks
    console.log("Using direct scraping only - no fallbacks");
    
    // Get the admin-configured URL and selector
    const afriexappUrl = afriexappProvider.scraping_url;
    // Use the provider's selector if available, otherwise use our default from the HTML
    const afriexappSelector = afriexappProvider.scraping_selector || 'div#converter-exchange-rate.converter-information__text-stm';
    
    if (!afriexappUrl) {
      return res.status(400).json({
        success: false,
        message: "Afriexapp provider missing required URL in admin config"
      });
    }
    
    try {
      // Run the direct scraper (no fallbacks)
      const success = await scrapeAfriexappDirect(
        afriexappUrl,
        afriexappSelector,
        afriexappProvider.id,
        'GBP',
        'NGN'
      );
      
      if (success) {
        res.json({
          success: true,
          message: "Afriexapp rate successfully updated using direct scraping",
          method: "DIRECT_SCRAPING"
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Afriexapp rate could not be found on the website",
          method: "DIRECT_SCRAPING" 
        });
      }
    } catch (error) {
      console.error("Error in direct scraping:", error);
      res.status(500).json({
        success: false,
        message: "Error during Afriexapp scraping",
        error: String(error)
      });
    }
  } catch (error) {
    console.error("Error updating Afriexapp rate:", error);
    res.status(500).json({
      success: false,
      message: "Error updating Afriexapp rate",
      error: String(error)
    });
  }
});

export default afriexappRouter;