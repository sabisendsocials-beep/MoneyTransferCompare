/**
 * Provider management routes
 */
import { Router, Request, Response } from 'express';
import { log } from '../utils/logger';
import { storage } from '../databaseStorage';
import { providers, InsertProvider } from '@shared/schema';
import { db } from '../db';
import { createWiseProvider } from '../api/wiseApi';

const router = Router();

// Standard provider configurations
const standardProviders: InsertProvider[] = [
  {
    name: "WorldRemit",
    website_url: "https://www.worldremit.com",
    logo: "https://www.worldremit.com/favicon.ico",
    rating: 4.5,
    scraping_url: "https://www.worldremit.com/en/gbp-to-ngn-exchange-rate",
    scraping_selector: ".exchange-rate, .rate-value",
    transfer_time: "1 hour or less",
    has_fixed_fee: true,
    fixed_fee: 2.99,
    percentage_fee: 0.8,
    active: true,
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Remitly",
    website_url: "https://www.remitly.com",
    logo: "https://www.remitly.com/static/img/logo.svg",
    rating: 4.5,
    scraping_url: "https://www.remitly.com/gb/en/nigeria/pricing",
    scraping_selector: ".exchange-rate, .rate-display",
    transfer_time: "3-5 days (Economy), Minutes (Express)",
    has_fixed_fee: true,
    fixed_fee: 2.49,
    percentage_fee: 0.75,
    active: true,
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Wise",
    website_url: "https://wise.com",
    logo: "https://wise.com/public-resources/assets/logos/wise.svg",
    rating: 4.8,
    scraping_url: "https://wise.com/gb/currency-converter/gbp-to-ngn-rate",
    scraping_selector: ".cc__source-to-target",
    transfer_time: "1-2 days",
    has_fixed_fee: true,
    fixed_fee: 3.69,
    percentage_fee: 0.5,
    active: true,
    preferred_collection: "API",
    has_api: true,
    api_url: "https://api.wise.com/v1/rates",
    api_key_required: true,
    api_response_path: "rate"
  },
  {
    name: "Western Union",
    website_url: "https://www.westernunion.com",
    logo: "https://www.westernunion.com/content/dam/wu/logo/logo.svg",
    rating: 4.3,
    scraping_url: "https://www.westernunion.com/gb/en/currency-converter/gbp-to-ngn-rate.html",
    scraping_selector: ".exchange-rate",
    transfer_time: "1-3 days",
    has_fixed_fee: true,
    fixed_fee: 3.90,
    percentage_fee: 1.0,
    active: true,
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "MoneyGram",
    website_url: "https://www.moneygram.com",
    logo: "https://www.moneygram.com/mgo/assets/images/mg-logo.svg",
    rating: 4.3,
    scraping_url: "https://www.moneygram.com/mgo/gb/en/exchange-rate-calculator",
    scraping_selector: ".exchange-rate-value, .calc-rate",
    transfer_time: "Minutes (cash pickup)",
    has_fixed_fee: true,
    fixed_fee: 2.99,
    percentage_fee: 1.2,
    active: true,
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Lemfi",
    website_url: "https://lemfi.com",
    logo: null,
    rating: 4.5,
    scraping_url: "https://lemfi.com/en-gb/send-money-to-nigeria",
    scraping_selector: "span:contains('Rate:'), .exchange-rate",
    transfer_time: "5 minutes",
    has_fixed_fee: false,
    fixed_fee: 0,
    percentage_fee: 0.6,
    active: true,
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Paysend",
    website_url: "https://paysend.com",
    logo: null,
    active: true,
    fixed_fee: 1.00,
    percentage_fee: 0.8,
    transfer_time: "Minutes - 1 day",
    rating: 4.3,
    scraping_url: "https://paysend.com",
    scraping_selector: ".exchange-rate-display, .rate-info",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Nala",
    website_url: "https://nala.com",
    logo: null,
    active: true,
    fixed_fee: 0,
    percentage_fee: 1.0,
    transfer_time: "Minutes - 1 hour",
    rating: 4.3,
    scraping_url: "https://nala.com",
    scraping_selector: ".exchange-rate, .rate-text",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  }
];

// Initialize standard providers
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const { reset = false } = req.body;
    
    if (reset) {
      log('Deleting all existing providers before initialization');
      await storage.deleteAllProviders();
    }
    
    log('Initializing standard provider list...');
    
    // Get existing providers to avoid duplicates
    const existingProviders = await storage.getProviders();
    const existingNames = new Set(existingProviders.map(p => p.name));
    
    let addedCount = 0;
    for (const provider of standardProviders) {
      // Skip if provider already exists and we're not resetting
      if (!reset && existingNames.has(provider.name)) {
        log(`Provider ${provider.name} already exists, skipping`);
        continue;
      }
      
      // Special handling for Wise
      if (provider.name === 'Wise') {
        log('Adding Wise provider with API collection configuration');
        await createWiseProvider();
        addedCount++;
        continue;
      }
      
      // Add the provider
      await storage.createProvider(provider);
      log(`Added provider: ${provider.name}`);
      addedCount++;
    }
    
    res.json({
      success: true,
      message: reset 
        ? `Reset complete. Added ${addedCount} standard providers.` 
        : `Added ${addedCount} missing providers.`,
      count: addedCount
    });
  } catch (error) {
    log(`Error initializing providers: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize providers',
      error: String(error)
    });
  }
});

// Delete all providers
router.delete('/all', async (req: Request, res: Response) => {
  try {
    log('Deleting all providers...');
    await storage.deleteAllProviders();
    
    res.json({
      success: true,
      message: 'All providers deleted successfully'
    });
  } catch (error) {
    log(`Error deleting providers: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to delete providers',
      error: String(error)
    });
  }
});

export default router;