/**
 * Enhanced web scraper that simulates browser automation
 * This is a simplified version that can run in our environment
 */

import { InsertExchangeRate } from '@shared/schema';
import { storage } from '../storage';
import { log } from '../vite';
import axios from 'axios';

// Provider configuration for enhanced scraping
interface ProviderConfig {
  name: string;
  url: string;
  extractPattern: RegExp;
  userAgent: string;
}

// Define configurations for each provider
const providerConfigs: ProviderConfig[] = [
  {
    name: 'Western Union',
    url: 'https://www.westernunion.com/gb/en/currency-converter',
    extractPattern: /1\s*GBP\s*=\s*(\d+[\.,]?\d*)\s*NGN/i,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  {
    name: 'MoneyGram',
    url: 'https://www.moneygram.com/mgo/gb/en/calculator',
    extractPattern: /1\s*GBP\s*=\s*(\d+[\.,]?\d*)\s*NGN/i,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  },
  {
    name: 'Remitly',
    url: 'https://www.remitly.com/gb/en/nigeria',
    extractPattern: /1\s*GBP\s*=\s*(\d+[\.,]?\d*)\s*NGN/i,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Sendwave',
    url: 'https://www.sendwave.com/en-gb/send-money-to-nigeria',
    extractPattern: /(\d{4}[\.,]?\d*)/,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/101.0.4951.44 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Taptap Send',
    url: 'https://taptapsend.com/send-money-to-nigeria',
    extractPattern: /(\d{4}[\.,]?\d*)/,
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.105 Mobile Safari/537.36'
  }
];

/**
 * Scrape a specific provider using enhanced methods
 */
async function scrapeSingleProvider(config: ProviderConfig): Promise<number | null> {
  try {
    log(`Starting enhanced scraper for ${config.name}...`);
    
    // Fetch the webpage with appropriate headers
    const response = await axios.get(config.url, {
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Try to extract rates from the HTML content
    const patterns = [
      // Common exchange rate patterns
      /1\s*GBP\s*=\s*(\d+[\.,]?\d*)\s*NGN/gi,
      /(\d{4}[\.,]?\d*)\s*NGN/gi,
      /exchange\s*rate[^0-9]*(\d{4}[\.,]?\d*)/gi,
      /rate[^0-9]*(\d{4}[\.,]?\d*)/gi,
      // Provider-specific pattern
      config.extractPattern
    ];
    
    for (const pattern of patterns) {
      const matches = html.match(pattern);
      
      if (matches && matches.length > 0) {
        for (const match of matches) {
          // Extract the numeric part
          const numericMatch = match.match(/(\d{4}[\.,]?\d*)/);
          if (numericMatch && numericMatch[1]) {
            const rate = parseFloat(numericMatch[1].replace(',', '.'));
            
            // Validate the rate is in a reasonable range for GBP to NGN
            if (!isNaN(rate) && rate >= 1500 && rate <= 2500) {
              log(`Found ${config.name} rate with pattern ${pattern}: ${rate}`);
              return rate;
            }
          }
        }
      }
    }
    
    // No valid rate found
    log(`Could not find valid exchange rate for ${config.name}`);
    return null;
  } catch (error) {
    log(`Error scraping ${config.name}: ${error}`);
    return null;
  }
}

/**
 * Update the database with a rate from a provider
 */
async function updateProviderRate(
  providerName: string,
  rate: number,
  fromCurrency: string = 'GBP',
  toCurrency: string = 'NGN'
): Promise<boolean> {
  try {
    // Get the provider from the database
    const providers = await storage.getProviders();
    const provider = providers.find(p => p.name === providerName);
    
    if (!provider) {
      log(`Could not find ${providerName} in database`);
      return false;
    }
    
    // Add the rate to database
    const rateData: InsertExchangeRate = {
      provider_id: provider.id,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate
    };
    
    await storage.createExchangeRate(rateData);
    log(`Added enhanced scraped rate for ${providerName}: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
    return true;
  } catch (error) {
    log(`Error updating ${providerName} rate: ${error}`);
    return false;
  }
}

/**
 * Scrape multiple providers using enhanced methods
 */
export async function puppeteerScrapeProviders(): Promise<boolean> {
  let successCount = 0;
  
  for (const config of providerConfigs) {
    try {
      log(`Scraping ${config.name} with enhanced scraper...`);
      const rate = await scrapeSingleProvider(config);
      
      if (rate !== null) {
        const success = await updateProviderRate(config.name, rate);
        if (success) {
          log(`Successfully updated ${config.name} rate to ${rate}`);
          successCount++;
        }
      } else {
        log(`Failed to get rate for ${config.name}`);
      }
    } catch (error) {
      log(`Error processing ${config.name}: ${error}`);
    }
  }
  
  log(`Successfully updated ${successCount} providers using enhanced scraper`);
  return successCount > 0;
}