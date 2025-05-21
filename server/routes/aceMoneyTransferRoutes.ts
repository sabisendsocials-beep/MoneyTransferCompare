/**
 * ACE Money Transfer API Routes
 * 
 * This file contains endpoints for testing and updating ACE Money Transfer rates
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { updateAceMoneyTransferRate } from '../scrapers/aceMoneyTransferScraper';

// Create router
const aceRouter = Router();

// ACE Money Transfer test endpoint
aceRouter.post("/test-ace-scraper", async (req: Request, res: Response) => {
  try {
    console.log('Testing ACE Money Transfer scraper with correct selector...');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      return res.status(404).json({
        success: false,
        message: "ACE Money Transfer provider not found in database"
      });
    }
    
    // Get the admin-configured URL
    const aceUrl = aceProvider.scraping_url;
    // Use the selector from the screenshot
    const aceSelector = 'span.color-000.lt-61C';
    
    if (!aceUrl) {
      return res.status(400).json({
        success: false,
        message: "ACE Money Transfer provider missing required URL in admin config"
      });
    }
    
    console.log(`Using admin-configured URL for ACE Money Transfer: ${aceUrl}`);
    console.log(`Using CSS selector: ${aceSelector}`);
    
    // Run the scraper
    const success = await updateAceMoneyTransferRate(
      aceUrl,
      aceSelector,
      aceProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      res.json({
        success: true,
        message: "ACE Money Transfer rate successfully updated using the dedicated scraper",
        selector: aceSelector
      });
    } else {
      res.status(404).json({
        success: false,
        message: "ACE Money Transfer scraper ran but couldn't find a valid rate",
        selector: aceSelector
      });
    }
  } catch (error) {
    console.error("Error in /test-ace-scraper:", error);
    res.status(500).json({
      success: false,
      message: "Error running ACE Money Transfer scraper",
      error: String(error)
    });
  }
});

// Update ACE Money Transfer rate endpoint
aceRouter.post("/update-ace-rate", async (req: Request, res: Response) => {
  try {
    console.log('Triggering ACE Money Transfer rate update...');
    
    // Get the provider details
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      return res.status(404).json({
        success: false,
        message: "ACE Money Transfer provider not found in database"
      });
    }
    
    // Get the admin-configured URL and selector
    const aceUrl = aceProvider.scraping_url;
    // Use the provider's selector if available, otherwise use our default from the screenshot
    const aceSelector = aceProvider.scraping_selector || 'span.color-000.lt-61C';
    
    if (!aceUrl) {
      return res.status(400).json({
        success: false,
        message: "ACE Money Transfer provider missing required URL in admin config"
      });
    }
    
    // Run the scraper
    const success = await updateAceMoneyTransferRate(
      aceUrl,
      aceSelector,
      aceProvider.id,
      'GBP',
      'NGN'
    );
    
    if (success) {
      res.json({
        success: true,
        message: "ACE Money Transfer rate successfully updated",
        url: aceUrl,
        selector: aceSelector
      });
    } else {
      res.status(404).json({
        success: false,
        message: "ACE Money Transfer rate update failed",
        url: aceUrl,
        selector: aceSelector
      });
    }
  } catch (error) {
    console.error("Error updating ACE Money Transfer rate:", error);
    res.status(500).json({
      success: false,
      message: "Error updating ACE Money Transfer rate",
      error: String(error)
    });
  }
});

export default aceRouter;