/**
 * Admin API Routes
 * 
 * This file contains routes for admin-related operations
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { updateAceMoneyTransferRate } from '../scrapers/aceMoneyTransferScraper';

// Create a router for admin routes
const adminRouter = Router();

// ACE Money Transfer rate update endpoint
adminRouter.post("/run-ace-scraper", async (req: Request, res: Response) => {
  try {
    console.log('Triggering ACE Money Transfer rate update using admin-configured URL and selector...');
    
    // Get all providers
    const providers = await storage.getAllProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      return res.status(404).json({
        success: false,
        message: "ACE Money Transfer provider not found in database"
      });
    }
    
    // Get the admin-configured URL and selector
    const aceUrl = aceProvider.scraping_url;
    // Use the selector from the screenshot or admin config if available
    const aceSelector = aceProvider.scraping_selector || 'span.color-000.lt-61C';
    
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
        message: "ACE Money Transfer rate successfully updated using dedicated scraper"
      });
    } else {
      res.status(404).json({
        success: false,
        message: "ACE Money Transfer scraper ran but couldn't find a valid rate"
      });
    }
  } catch (error) {
    console.error("Error in /api/admin/run-ace-scraper:", error);
    res.status(500).json({
      success: false,
      message: "Error running ACE Money Transfer scraper",
      error: String(error)
    });
  }
});

export default adminRouter;