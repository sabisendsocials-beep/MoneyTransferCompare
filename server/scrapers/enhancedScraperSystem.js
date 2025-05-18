/**
 * Enhanced Scraper System
 * A more robust approach to web scraping for exchange rates
 * Features:
 * - Multiple scraping techniques (CSS selectors, regex patterns, structured data)
 * - Detailed logging for debugging
 * - Retry mechanisms with exponential backoff
 * - Custom user agents and request headers
 * - Error handling with informative messages
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { log } from '../vite.js';
import { storage } from '../storage.js';

// Constants for retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const TIMEOUT_MS = 15000;

// User agent rotation for avoiding detection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0'
];

// Provider scraping configurations with multiple fallback selectors for each provider
const PROVIDER_CONFIGS = {
  'WorldRemit': {
    baseUrl: 'https://www.worldremit.com/en/gb/currency-converter',
    selectors: [
      '.exchange-rate-value', 
      '[data-testid="rateValue"]',
      '.converter-result', 
      '.text-amount-default',
      '.exchange-rate'
    ],
    regex: /1\s+GBP\s*=\s*([0-9,.]+)\s*NGN/i,
    defaultPath: '/gbp-to-ngn'
  },
  'Wise': {
    baseUrl: 'https://wise.com/gb/currency-converter',
    selectors: [
      '.rate-value', 
      '.js-CurrencyConversion-rateValue',
      '.m-t-2',
      '.exchange-rate'
    ],
    regex: /1\s+GBP\s*=\s*([0-9,.]+)\s*NGN/i,
    defaultPath: '/gbp-to-ngn-rate'
  },
  'Western Union': {
    baseUrl: 'https://www.westernunion.com/gb/en/currency-converter',
    selectors: [
      '.exchange-rate-value', 
      '.wu-text--rate',
      '.result-box .rate',
      '.rate-display-value'
    ],
    regex: /1\s+GBP\s*=\s*([0-9,.]+)\s*NGN/i,
    defaultPath: '/gbp-to-ngn'
  },
  'Lemfi': {
    baseUrl: 'https://lemfi.com/en-gb',
    selectors: [
      '.rate-card', 
      '.exchange-rate',
      '.rate-display',
      '.calculator-result-value'
    ],
    regex: /1\s+GBP\s*=\s*([0-9,.]+)\s*NGN/i,
    defaultPath: '/international-money-transfer'
  },
  'MoneyGram': {
    baseUrl: 'https://www.moneygram.com/mgo/gb/en',
    selectors: [
      '.exchange-rate',
      '.result-exchange-rate',
      '.calculator-result',
      '.rate-display'
    ],
    regex: /1\s+GBP\s*=\s*([0-9,.]+)\s*NGN/i,
    defaultPath: '/calculator'
  },
  'Remitly': {
    baseUrl: 'https://www.remitly.com/gb/en',
    selectors: [
      '.exchange-rate-display',
      '.rate-calculator-result',
      '.converter-result-value',
      '.rate-result'
    ],
    regex: /1\s+GBP\s*=\s*([0-9,.]+)\s*NGN/i,
    defaultPath: '/rates'
  }
};

/**
 * Get a random user agent from the list
 * @returns {string} A random user agent string
 */
function getRandomUserAgent() {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}

/**
 * Extract a number from a string containing an exchange rate
 * @param {string} text - The text containing an exchange rate
 * @returns {number|null} The extracted rate as a number, or null if not found
 */
function extractRateFromText(text) {
  if (!text) return null;
  
  // Clean the text (remove extra spaces, etc.)
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Try different regex patterns
  const patterns = [
    /(\d+[.,]\d+)/,                            // Basic decimal number
    /(\d+[.,]\d+)\s*NGN/i,                     // Number followed by NGN
    /1\s*GBP\s*=\s*(\d+[.,]\d+)/i,             // 1 GBP = X.XX
    /rate\s*:\s*(\d+[.,]\d+)/i,                // rate: X.XX
    /exchange\s*rate\s*:?\s*(\d+[.,]\d+)/i,    // exchange rate: X.XX
    /(\d+[.,]\d+)\s*(?:NGN|Naira)/i            // X.XX NGN or X.XX Naira
  ];
  
  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      // Replace comma with dot for decimal separator
      const rateStr = match[1].replace(',', '.');
      const rate = parseFloat(rateStr);
      
      // Basic validation - rates are typically between 1000-3000 NGN per GBP
      if (rate > 0 && rate < 10000) {
        return rate;
      }
    }
  }
  
  // Log the failure
  log(`Failed to extract rate from text: "${cleanText}"`);
  return null;
}

/**
 * Fetch HTML content from a URL with retry logic
 * @param {string} url - The URL to fetch
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<string>} The HTML content
 */
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  const userAgent = getRandomUserAgent();
  
  try {
    log(`Fetching ${url} with user agent: ${userAgent.substring(0, 30)}...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: TIMEOUT_MS
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      log(`Warning: Content type is not HTML: ${contentType}`);
    }
    
    const html = await response.text();
    if (html.length < 1000) {
      log(`Warning: Response is suspiciously short (${html.length} chars), might be an error page`);
    } else {
      log(`Successfully fetched ${url} (${html.length} chars)`);
    }
    
    return html;
  } catch (error) {
    if (retries <= 0) {
      log(`Failed to fetch ${url} after ${MAX_RETRIES} retries: ${error.message}`);
      throw error;
    }
    
    const delay = RETRY_DELAY_MS * (MAX_RETRIES - retries + 1);
    log(`Retry ${MAX_RETRIES - retries + 1}/${MAX_RETRIES} for ${url} after ${delay}ms delay`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, retries - 1);
  }
}

/**
 * Scrape exchange rate for a specific provider
 * @param {string} providerName - The name of the provider
 * @param {string} fromCurrency - The source currency (e.g., GBP)
 * @param {string} toCurrency - The target currency (e.g., NGN)
 * @returns {Promise<{rate: number, source: string}|null>} The scraped rate and source URL or null if not found
 */
export async function scrapeProviderRate(providerName, fromCurrency, toCurrency) {
  const config = PROVIDER_CONFIGS[providerName];
  if (!config) {
    log(`No scraping configuration found for provider: ${providerName}`);
    return null;
  }
  
  // Generate the URL
  const path = config.defaultPath || `/${fromCurrency.toLowerCase()}-to-${toCurrency.toLowerCase()}`;
  const url = `${config.baseUrl}${path}`;
  
  try {
    // Fetch the page content
    const html = await fetchWithRetry(url);
    
    // Parse with cheerio
    const $ = cheerio.load(html);
    let rate = null;
    let matchedSelector = null;
    
    // Try all selectors
    for (const selector of config.selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        log(`Found ${elements.length} matches for selector "${selector}" for ${providerName}`);
        
        // Try each element that matches the selector
        for (let i = 0; i < elements.length; i++) {
          const text = $(elements[i]).text().trim();
          log(`Element ${i+1} text: "${text}"`);
          
          if (text) {
            const extractedRate = extractRateFromText(text);
            if (extractedRate) {
              rate = extractedRate;
              matchedSelector = selector;
              log(`Extracted rate ${rate} from selector "${selector}" for ${providerName}`);
              break;
            }
          }
        }
        
        if (rate) break;
      }
    }
    
    // If no rate found with selectors, try regex pattern on the whole page
    if (!rate && config.regex) {
      const match = html.match(config.regex);
      if (match && match[1]) {
        const extractedRate = parseFloat(match[1].replace(',', '.'));
        if (extractedRate > 0) {
          rate = extractedRate;
          matchedSelector = 'regex pattern';
          log(`Extracted rate ${rate} using regex pattern for ${providerName}`);
        }
      }
    }
    
    // If still no rate, try looking for structured data
    if (!rate) {
      const structuredDataScripts = $('script[type="application/ld+json"]');
      if (structuredDataScripts.length > 0) {
        log(`Found ${structuredDataScripts.length} structured data scripts for ${providerName}`);
        
        for (let i = 0; i < structuredDataScripts.length; i++) {
          try {
            const jsonText = $(structuredDataScripts[i]).html();
            if (jsonText) {
              const data = JSON.parse(jsonText);
              // Look for rate-related data in the JSON
              // This is provider-specific and would need customization
              log(`Examining structured data (${i+1}/${structuredDataScripts.length}) for ${providerName}`);
            }
          } catch (e) {
            log(`Error parsing structured data for ${providerName}: ${e.message}`);
          }
        }
      }
    }
    
    if (rate) {
      return {
        rate: rate,
        source: url
      };
    } else {
      log(`Failed to extract rate for ${providerName} from ${url}`);
      return null;
    }
  } catch (error) {
    log(`Error scraping ${providerName}: ${error.message}`);
    return null;
  }
}

/**
 * Scrape exchange rates for all configured providers
 * @param {string} fromCurrency - The source currency (e.g., GBP)
 * @param {string} toCurrency - The target currency (e.g., NGN)
 * @returns {Promise<{provider: string, rate: number, source: string}[]>} Array of provider rates
 */
export async function scrapeAllProviderRates(fromCurrency = 'GBP', toCurrency = 'NGN') {
  const results = [];
  
  // Get all providers from the database
  const providers = await storage.getProviders();
  
  // Process each provider in our configuration
  for (const providerName of Object.keys(PROVIDER_CONFIGS)) {
    const provider = providers.find(p => p.name === providerName);
    
    if (provider) {
      log(`Scraping rates for ${providerName} (${fromCurrency} → ${toCurrency})...`);
      
      try {
        const result = await scrapeProviderRate(providerName, fromCurrency, toCurrency);
        
        if (result) {
          log(`Successfully scraped ${providerName}: 1 ${fromCurrency} = ${result.rate} ${toCurrency}`);
          
          // Store the result
          results.push({
            provider: providerName,
            providerId: provider.id,
            rate: result.rate,
            source: result.source
          });
          
          // Save to database
          await storage.createExchangeRate({
            provider_id: provider.id,
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate: result.rate,
            source: 'SCRAPER',
            source_url: result.source,
            verified: false
          });
          
          log(`Saved ${providerName} rate to database: ${result.rate}`);
        } else {
          log(`Failed to scrape rate for ${providerName}`);
        }
      } catch (error) {
        log(`Error processing ${providerName}: ${error.message}`);
      }
    } else {
      log(`Provider ${providerName} not found in database, skipping`);
    }
  }
  
  return results;
}

export default scrapeAllProviderRates;