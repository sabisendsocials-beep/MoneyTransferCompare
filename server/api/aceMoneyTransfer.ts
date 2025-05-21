/**
 * ACE Money Transfer API
 * 
 * This file provides direct API access to test and update ACE Money Transfer rates
 */
import express from 'express';
import { storage } from '../storage';
import { updateAceMoneyTransferRate } from '../scrapers/aceMoneyTransferScraper';

const aceRouter = express.Router();

// Test endpoint for ACE Money Transfer scraper
aceRouter.post('/test-scraper', async (req, res) => {
  try {
    console.log('Testing ACE Money Transfer scraper with admin URL and screenshot selector...');
    
    // Get the provider from the database
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      return res.status(404).json({
        success: false,
        message: 'ACE Money Transfer provider not found in database'
      });
    }
    
    // Get the URL from the provider, use the selector from the screenshot
    const aceUrl = aceProvider.scraping_url;
    const aceSelector = 'span.color-000.lt-61C';
    
    if (!aceUrl) {
      return res.status(400).json({
        success: false,
        message: 'ACE Money Transfer URL not configured in admin panel'
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
        message: 'ACE Money Transfer rate updated successfully',
        url: aceUrl,
        selector: aceSelector
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update ACE Money Transfer rate',
        url: aceUrl,
        selector: aceSelector
      });
    }
  } catch (error) {
    console.error('Error testing ACE Money Transfer scraper:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing ACE Money Transfer scraper',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update ACE Money Transfer rate endpoint
aceRouter.post('/update-rate', async (req, res) => {
  try {
    console.log('Updating ACE Money Transfer rate...');
    
    // Get the provider from the database
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      return res.status(404).json({
        success: false,
        message: 'ACE Money Transfer provider not found in database'
      });
    }
    
    // Get the URL and selector from the provider (fallback to screenshot selector)
    const aceUrl = aceProvider.scraping_url;
    const aceSelector = aceProvider.scraping_selector || 'span.color-000.lt-61C';
    
    if (!aceUrl) {
      return res.status(400).json({
        success: false,
        message: 'ACE Money Transfer URL not configured in admin panel'
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
        message: 'ACE Money Transfer rate updated successfully',
        url: aceUrl,
        selector: aceSelector
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update ACE Money Transfer rate',
        url: aceUrl,
        selector: aceSelector
      });
    }
  } catch (error) {
    console.error('Error updating ACE Money Transfer rate:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ACE Money Transfer rate',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default aceRouter;