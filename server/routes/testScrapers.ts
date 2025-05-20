/**
 * Test routes for scrapers
 * These routes allow for direct testing of scrapers with admin-configured URLs and selectors
 */
import { Router } from 'express';
import { storage } from '../storage';
import { updateWesternUnionRates } from '../scrapers/westernUnionScraper';

const router = Router();

/**
 * Test Western Union scraper with the admin-configured URL and CSS selector
 */
router.get('/test-western-union', async (req, res) => {
  try {
    console.log('Testing Western Union scraper with admin-configured URL and selector...');
    
    // Get the Western Union provider from the database
    const providers = await storage.getProviders();
    const westernUnionProvider = providers.find(p => 
      p.name === 'Western Union' || p.name.toLowerCase().includes('western union')
    );
    
    if (!westernUnionProvider) {
      return res.status(404).json({ 
        success: false, 
        error: 'Western Union provider not found in database' 
      });
    }
    
    // Log the URL and selector that will be used
    console.log(`Provider ID: ${westernUnionProvider.id}`);
    console.log(`URL: ${westernUnionProvider.scraping_url}`);
    console.log(`CSS Selector: ${westernUnionProvider.scraping_selector}`);
    
    // Run the scraper
    const success = await updateWesternUnionRates();
    
    // Return the result
    if (success) {
      // Get the latest rate for GBP to NGN
      const rates = await storage.getLatestRates('GBP', 'NGN');
      const westernUnionRate = rates.find(r => r.provider_id === westernUnionProvider.id);
      
      return res.json({
        success: true,
        message: 'Western Union rate scraped successfully',
        rate: westernUnionRate ? westernUnionRate.rate : null,
        url: westernUnionProvider.scraping_url,
        selector: westernUnionProvider.scraping_selector
      });
    } else {
      return res.json({
        success: false,
        message: 'Failed to scrape Western Union rate',
        url: westernUnionProvider.scraping_url,
        selector: westernUnionProvider.scraping_selector
      });
    }
  } catch (error) {
    console.error('Error testing Western Union scraper:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error testing Western Union scraper' 
    });
  }
});

export default router;