/**
 * Provider initialization utility
 * This script can be used to reset or populate providers when needed
 */

import { db } from './db';
import { providers, InsertProvider } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Standard provider list
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
];

/**
 * Initialize providers
 * @param reset If true, deletes all existing providers first
 * @returns Result of the operation
 */
async function initializeProviders(reset: boolean = false): Promise<{ success: boolean, addedCount: number }> {
  console.log(`Running provider initialization (reset mode: ${reset ? 'YES' : 'NO'})`);
  
  try {
    // MANUAL OPERATION ONLY - Check if this was called from the API endpoint
    const callStack = new Error().stack || '';
    const isCalledFromAPI = callStack.includes('providerApi.ts');
    
    // SAFETY CHECK: Only allow reset if explicitly called from the API
    if (reset && !isCalledFromAPI) {
      console.error('CRITICAL SAFETY: Attempted automatic provider reset outside of admin API - BLOCKED');
      console.log('Provider data is preserved - no changes made');
      return { success: false, addedCount: 0 };
    }
    
    // SAFETY CHECK: Don't modify providers unless explicitly requested via API
    if (!isCalledFromAPI) {
      console.log('SAFETY: Provider initialization skipped - must be triggered manually from admin panel');
      return { success: false, addedCount: 0 };
    }
    
    // Optionally clear existing providers if reset mode is enabled (and called from API)
    if (reset) {
      console.log('Deleting all existing providers...');
      await db.delete(providers);
      console.log('All providers deleted');
    }
    
    // Get existing providers to avoid duplicates
    const existingProviders = await db.select().from(providers);
    const existingNames = new Set(existingProviders.map(p => p.name));
    
    let addedCount = 0;
    for (const provider of standardProviders) {
      if (!reset && existingNames.has(provider.name)) {
        console.log(`Provider "${provider.name}" already exists, skipping`);
        continue;
      }
      
      // Insert the provider
      const [added] = await db.insert(providers).values(provider).returning();
      console.log(`Added provider: ${added.name} (ID: ${added.id})`);
      addedCount++;
    }
    
    console.log('-----------------------------');
    console.log(`Provider initialization complete!`);
    console.log(`Added ${addedCount} providers`);
    console.log(`Total providers in database: ${existingProviders.length + addedCount}`);
    console.log('-----------------------------');
    
    return { success: true, addedCount };
  } catch (error) {
    console.error('Error initializing providers:', error);
    return { success: false, addedCount: 0 };
  }
}

export default initializeProviders;