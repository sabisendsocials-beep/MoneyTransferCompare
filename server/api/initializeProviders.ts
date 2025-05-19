/**
 * Provider initialization API endpoint
 * This allows the admin to reset or populate providers with a standard list
 */

import { db } from '../db';
import { providers, InsertProvider } from '@shared/schema';
import { storage } from '../databaseStorage';
import { createWiseProvider } from './wiseApi';
import { log } from '../utils/logger';

// Core providers with detailed configuration
const coreProviders: InsertProvider[] = [
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
  }
];

// Additional providers with basic configuration
const additionalProviders: InsertProvider[] = [
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
    name: "Profee",
    website_url: "https://profee.com",
    logo: null,
    active: true,
    fixed_fee: 1.50,
    percentage_fee: 0.7,
    transfer_time: "1-3 business days",
    rating: 4.0,
    scraping_url: "https://profee.com/en",
    scraping_selector: ".exchange-rate, .currency-rate",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "ACE Money Transfer",
    website_url: "https://acemoneytransfer.com",
    logo: null,
    active: true,
    fixed_fee: 2.99,
    percentage_fee: 0.9,
    transfer_time: "24-48 hours",
    rating: 4.0,
    scraping_url: "https://acemoneytransfer.com",
    scraping_selector: ".exchange-rate, .rate-display",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Pesa",
    website_url: "https://pesaremit.com",
    logo: null,
    active: true,
    fixed_fee: 1.99,
    percentage_fee: 0.6,
    transfer_time: "1-2 days",
    rating: 4.0,
    scraping_url: "https://pesaremit.com",
    scraping_selector: ".rate, .exchange-rate",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Transfer Rocket",
    website_url: "https://www.transferrocket.com",
    logo: null,
    active: true,
    fixed_fee: 0.99,
    percentage_fee: 0.5,
    transfer_time: "Same day",
    rating: 4.0,
    scraping_url: "https://www.transferrocket.com",
    scraping_selector: ".exchange-rate, .rate-info",
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
  },
  {
    name: "Sendwave",
    website_url: "https://www.sendwave.com",
    logo: null,
    active: true,
    fixed_fee: 0,
    percentage_fee: 1.2,
    transfer_time: "Instant",
    rating: 4.3,
    scraping_url: "https://www.sendwave.com",
    scraping_selector: ".exchange-rate, .rate-text",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Taptap Send",
    website_url: "https://www.taptapsend.com",
    logo: null,
    active: true,
    fixed_fee: 0,
    percentage_fee: 1.1,
    transfer_time: "Instant - 1 day",
    rating: 4.6,
    scraping_url: "https://www.taptapsend.com",
    scraping_selector: ".exchange-rate, .rate-amount",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Atriex",
    website_url: "https://atriex.com",
    logo: null,
    active: true,
    fixed_fee: 1.5,
    percentage_fee: 0.8,
    transfer_time: "1-2 days",
    rating: 4.0,
    scraping_url: "https://atriex.com",
    scraping_selector: ".exchange-rate, .rate-display",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  },
  {
    name: "Remit Choice",
    website_url: "https://remitchoice.com",
    logo: null,
    active: true,
    fixed_fee: 2.0,
    percentage_fee: 0.7,
    transfer_time: "1-3 days",
    rating: 4.0,
    scraping_url: "https://remitchoice.com",
    scraping_selector: ".exchange-rate, .rate-info",
    preferred_collection: "SCRAPER",
    has_api: false,
    api_url: null,
    api_key_required: false,
    api_response_path: null
  }
];

/**
 * Adds a basic API route handler to initialize providers
 */
export async function initializeProviders(resetExisting: boolean = false): Promise<{success: boolean, message: string, count: number}> {
  try {
    log('Starting provider initialization...');
    let addedCount = 0;
    
    if (resetExisting) {
      // Delete all existing providers if requested
      await storage.deleteAllProviders();
      log('Deleted all existing providers');
    } else {
      log('Skipping provider deletion - will only add missing providers');
    }
    
    // Get current providers to check for duplicates
    const currentProviders = await storage.getProviders();
    const currentProviderNames = new Set(currentProviders.map(p => p.name));
    
    // Add core providers
    for (const provider of coreProviders) {
      if (!resetExisting && currentProviderNames.has(provider.name)) {
        log(`Provider ${provider.name} already exists, skipping...`);
        continue;
      }
      
      try {
        // Special handling for Wise to ensure API collection
        if (provider.name === "Wise") {
          log('Adding Wise provider with API collection configuration...');
          await createWiseProvider();
          addedCount++;
          continue;
        }
        
        await storage.createProvider(provider);
        log(`Added provider: ${provider.name}`);
        addedCount++;
      } catch (error) {
        log(`Failed to add provider ${provider.name}: ${error}`);
      }
    }
    
    // Add additional providers
    for (const provider of additionalProviders) {
      if (!resetExisting && currentProviderNames.has(provider.name)) {
        log(`Provider ${provider.name} already exists, skipping...`);
        continue;
      }
      
      try {
        await storage.createProvider(provider);
        log(`Added provider: ${provider.name}`);
        addedCount++;
      } catch (error) {
        log(`Failed to add provider ${provider.name}: ${error}`);
      }
    }
    
    log(`Provider initialization complete. Added ${addedCount} new providers.`);
    return {
      success: true,
      message: resetExisting
        ? `Reset and added ${addedCount} providers`
        : `Added ${addedCount} missing providers`,
      count: addedCount
    };
  } catch (error) {
    log(`Error initializing providers: ${error}`);
    return {
      success: false,
      message: `Failed to initialize providers: ${error}`,
      count: 0
    };
  }
}