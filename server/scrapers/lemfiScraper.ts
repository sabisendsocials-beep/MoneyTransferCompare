/**
 * Dedicated Lemfi scraper
 * 
 * This scraper is specifically designed to extract exchange rates from the Lemfi website
 * using admin-configured URLs and CSS selectors only.
 */
import { storage } from '../storage';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Extract the exchange rate from Lemfi website using admin-configured URL and selectors
 * 
 * @param providerId The ID of the Lemfi provider
 * @param fromCurrency Source currency (e.g., GBP)
 * @param toCurrency Target currency (e.g., NGN)
 * @returns Whether the rate was successfully extracted and saved
 */
export async function extractLemfiRate(
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  try {
    console.log('=== Starting dedicated Lemfi rate update process ===');
    console.log('=== LEMFI DEDICATED SCRAPER RUNNING ===');
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    
    // Get the provider from the database to use admin-configured URL and selectors
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      console.error(`Provider with ID ${providerId} not found`);
      return false;
    }
    
    // Use admin-configured URL
    const url = provider.scraping_url;
    console.log(`Using admin-configured URL for Lemfi: ${url}`);
    
    if (!url) {
      console.error('No URL configured for Lemfi provider');
      return false;
    }
    
    const primarySelector = provider.scraping_selector || '';
    
    // Try primary URL with the admin-configured selector
    let rate = await scrapeExchangeRate(url, primarySelector, fromCurrency, toCurrency);
    
    // If we got a rate, save it to the database
    if (rate !== null) {
      await saveExchangeRate(providerId, fromCurrency, toCurrency, rate);
      return true;
    }
    
    // If primary URL fails, try alternate URLs
    console.log('Primary URL failed, trying alternate URLs...');
    const alternateUrls = [
      'https://www.lemfi.com/send-from-uk-to-nigeria',
      'https://lemfi.com/send-from-uk-to-nigeria',
      'https://lemfi.com/en-gb/send-money-online/united-kingdom-nigeria'
    ];
    
    for (const altUrl of alternateUrls) {
      console.log(`Trying alternate URL: ${altUrl}`);
      rate = await scrapeExchangeRate(altUrl, primarySelector, fromCurrency, toCurrency);
      
      if (rate !== null) {
        await saveExchangeRate(providerId, fromCurrency, toCurrency, rate);
        return true;
      }
    }
    
    console.error('Failed to extract Lemfi rate from any URL');
    return false;
  } catch (error) {
    console.error('Error in Lemfi scraper:', error);
    return false;
  }
}

/**
 * Helper function to scrape exchange rate from a URL
 */
async function scrapeExchangeRate(
  url: string, 
  cssSelector: string,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    console.log(`Attempting to scrape from URL: ${url}`);
    console.log(`Using CSS selector: ${cssSelector}`);
    
    // Fetch the HTML content with browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters)`);
    
    // Wait for JavaScript to fully load dynamic content
    console.log('Waiting 20 seconds for JavaScript content to fully load...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(html);
    
    // Collection of CSS selectors to try
    const selectors = [
      // User the admin-configured selector as priority
      cssSelector,
      // Selectors from the screenshot
      '.molecule-conversion-box_details__item span.base-text.base-text--size-small--bold',
      '.molecule-conversion-box_details__item span:nth-child(2)',
      // Additional selectors with variations
      'div.molecule-conversion-box__details div.molecule-conversion-box__details__item span.base-text--size-small--bold',
      'div[class*="molecule-conversion-box"] div[class*="details"] span[class*="small--bold"]',
      'div[class*="molecule-conversion-box"] span[class*="small--bold"]',
      'div.molecule-conversion-box__details__item span',
      '.molecule-conversion-box__details span',
      'span.base-text.base-text--size-small--bold',
      'span.base-text--size-small--bold',
      '.base-text--size-small--bold',
      '.molecule-conversion-box_details__item span',
      'div.molecule-conversion-box_details__item span',
      'div[class*="conversion-box"] span[class*="small"]'
    ].filter(Boolean); // Remove empty selectors
    
    // Try each selector
    for (const selector of selectors) {
      const rate = tryExtractRateWithSelector($, selector);
      if (rate !== null) {
        return rate;
      }
    }
    
    // Try finding any element with '1 GBP = X NGN' pattern
    console.log('Looking for elements containing GBP and NGN currency codes...');
    let rate = tryExtractRateFromPattern($);
    if (rate !== null) {
      return rate;
    }
    
    console.log('Failed to extract rate from any selector');
    return null;
  } catch (error) {
    console.error('Error scraping exchange rate:', error);
    return null;
  }
}

/**
 * Try to extract rate using a specific CSS selector
 */
function tryExtractRateWithSelector($: cheerio.CheerioAPI, selector: string): number | null {
  try {
    if (!selector) return null;
    
    console.log(`Trying selector: "${selector}"`);
    const elements = $(selector);
    console.log(`Found ${elements.length} elements with selector "${selector}"`);
    
    if (elements.length === 0) return null;
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements.eq(i);
      const text = element.text().trim();
      
      if (text.length === 0) continue;
      
      console.log(`Element ${i+1} text: "${text}"`);
      
      // Check if text contains both currency codes
      if (text.includes('GBP') && text.includes('NGN')) {
        console.log(`Found potential GBP/NGN rate text: "${text}"`);
        
        // Try exact pattern: 1 GBP = X NGN
        const exactPattern = /1\s*GBP\s*=\s*([\d,\.]+)\s*NGN/i;
        const exactMatch = text.match(exactPattern);
        
        if (exactMatch) {
          const rateStr = exactMatch[1].replace(/,/g, '');
          const parsedRate = parseFloat(rateStr);
          
          if (!isNaN(parsedRate) && parsedRate > 1000) {
            console.log(`Successfully extracted exact GBP/NGN rate: ${parsedRate}`);
            return parsedRate;
          }
        }
        
        // If no exact pattern, try to find any number in the expected range
        const anyNumber = text.match(/(\d[\d,\.]+)/g);
        if (anyNumber) {
          for (const numStr of anyNumber) {
            const num = parseFloat(numStr.replace(/,/g, ''));
            // NGN rates are typically in the 1800-2300 range for GBP
            if (!isNaN(num) && num > 1800 && num < 2300) {
              console.log(`Found likely exchange rate: ${num}`);
              return num;
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error trying selector "${selector}":`, error);
    return null;
  }
}

/**
 * Try to extract rate by scanning the page for patterns
 */
function tryExtractRateFromPattern($: cheerio.CheerioAPI): number | null {
  try {
    // Find elements containing both currency codes
    const elements = $('*:contains("GBP"):contains("NGN")');
    console.log(`Found ${elements.length} elements containing both GBP and NGN`);
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements.eq(i);
      const text = element.text().trim();
      
      // Only process reasonably sized text to avoid huge blocks
      if (text.length > 5 && text.length < 200) {
        console.log(`Element with GBP/NGN: "${text}"`);
        
        // Look for specific pattern: 1 GBP = X NGN
        const exactPattern = /1\s*GBP\s*=\s*([\d,\.]+)\s*NGN/i;
        const match = text.match(exactPattern);
        
        if (match) {
          const rateStr = match[1].replace(/,/g, '');
          const parsedRate = parseFloat(rateStr);
          
          if (!isNaN(parsedRate) && parsedRate > 1000) {
            console.log(`Found exact GBP to NGN rate: ${parsedRate}`);
            return parsedRate;
          }
        }
        
        // Try to extract any number in the text that might be the rate
        const numbers = text.match(/(\d[\d,\.]+)/g);
        
        if (numbers) {
          for (const numStr of numbers) {
            const num = parseFloat(numStr.replace(/,/g, ''));
            // NGN rates are typically in the 2000-2300 range for GBP
            if (!isNaN(num) && num > 2000 && num < 2300) {
              console.log(`Found likely exchange rate: ${num}`);
              return num;
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting rate from pattern:', error);
    return null;
  }
}

/**
 * Save exchange rate to database
 */
async function saveExchangeRate(
  providerId: number, 
  fromCurrency: string, 
  toCurrency: string, 
  rate: number
): Promise<void> {
  try {
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
      source: 'SCRAPER',
    });
    
    console.log(`Successfully updated Lemfi ${fromCurrency} to ${toCurrency} rate: ${rate}`);
    console.log('=== Successfully updated Lemfi rate with dedicated scraper ===');
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    throw error;
  }
}

/**
 * Main function to update Lemfi exchange rates
 * This is the entry point called by the rate update process
 */
export async function updateLemfiRates(): Promise<boolean> {
  try {
    console.log('Starting Lemfi rates update...');
    
    // Look for a provider named "Lemfi"
    const providers = await storage.getProviders();
    const lemfiProvider = providers.find(p => p.name === 'Lemfi');
    
    if (!lemfiProvider) {
      console.error('Lemfi provider not found in database');
      return false;
    }
    
    console.log(`Found Lemfi provider with ID ${lemfiProvider.id}`);
    
    // Extract GBP to NGN rate
    return await extractLemfiRate(lemfiProvider.id, 'GBP', 'NGN');
  } catch (error) {
    console.error('Error updating Lemfi rates:', error);
    return false;
  }
}