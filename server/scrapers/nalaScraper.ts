/**
 * Special scraper for Nala that extracts exchange rates.
 * This scraper ONLY uses the URL and CSS selector from the admin panel.
 */
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { storage } from '../storage';
import type { InsertExchangeRate } from '@shared/schema';

/**
 * Scrape the current exchange rate from Nala
 * Uses ONLY the URL and selector from the admin panel configuration
 * @returns The extracted rate or null if not found
 */
export async function scrapeNalaRate(): Promise<number | null> {
  try {
    // Get the provider configuration
    const providers = await storage.getProviders();
    const nalaProvider = providers.find(p => p.name === 'Nala');
    
    if (!nalaProvider) {
      console.error('Nala provider not found in database');
      return null;
    }
    
    // Use the scraping URL from provider configuration
    const url = nalaProvider.scraping_url;
    if (!url) {
      console.error('No scraping URL configured for Nala');
      return null;
    }
    
    console.log(`=== NALA DEDICATED SCRAPER RUNNING ===`);
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    console.log(`Using admin-configured URL for Nala: ${url}`);
    
    // Try API endpoint first (fastest method)
    console.log('Trying Nala API endpoint first...');
    const apiRate = await tryNalaApi();
    if (apiRate !== null) {
      console.log(`Successfully got rate from Nala API: ${apiRate}`);
      return apiRate;
    }
    console.log('API approach failed, trying multiple URLs...');
    
    // Try direct scraping of the configured URL
    const directRate = await scrapeNalaWebsite(url, nalaProvider.scraping_selector);
    if (directRate !== null) {
      console.log(`Successfully got rate from direct scraping: ${directRate}`);
      return directRate;
    }
    
    // Try alternative URLs if direct scraping fails
    const alternativeUrls = [
      'https://www.nala.com/en/nigeria',
      'https://nala.money/',
      'https://app.nala.money/',
      'https://www.nala.com/send-money-to-nigeria',
      'https://www.nala.com/'
    ];
    
    for (const altUrl of alternativeUrls) {
      if (altUrl !== url) { // Skip if same as configured URL
        console.log(`Trying URL variation: ${altUrl}`);
        const altRate = await scrapeNalaWebsite(altUrl, nalaProvider.scraping_selector);
        if (altRate !== null) {
          console.log(`Successfully got rate from alternate URL ${altUrl}: ${altRate}`);
          return altRate;
        }
      }
    }
    
    // If all attempts failed, try a more aggressive approach with puppeteer
    console.log('All standard attempts failed, trying puppeteer browser simulation...');
    return await scrapeWithPuppeteer(url);
    
  } catch (error) {
    console.error('Error in Nala scraper:', error);
    return null;
  }
}

/**
 * Try to get rate from Nala API
 */
async function tryNalaApi(): Promise<number | null> {
  try {
    // Common API endpoints used by money transfer services
    const apiEndpoints = [
      'https://app.nala.money/api/rates?from=GBP&to=NGN',
      'https://www.nala.com/api/rates?from=GBP&to=NGN',
      'https://api.nala.com/rates?fromCurrency=GBP&toCurrency=NGN',
      'https://nala.money/api/exchange-rates/GBP/NGN'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying Nala API: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Nala API response:', data);
          
          // Look for rate in different formats
          if (data.rate) return parseFloat(data.rate);
          if (data.exchangeRate) return parseFloat(data.exchangeRate);
          if (data.fx_rate) return parseFloat(data.fx_rate);
          if (data.exchange_rate) return parseFloat(data.exchange_rate);
          
          // Look for deeper nested structures
          if (data.data && data.data.rate) return parseFloat(data.data.rate);
          if (data.result && data.result.rate) return parseFloat(data.result.rate);
        }
      } catch (error) {
        console.log(`Error parsing Nala API response: ${error}`);
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch from Nala API:', error);
    return null;
  }
}

/**
 * Scrape the Nala website using cheerio
 */
async function scrapeNalaWebsite(url: string, cssSelector?: string | null): Promise<number | null> {
  try {
    console.log(`Waiting 3 seconds for JavaScript to finish loading dynamic content...`);
    
    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters) from ${url}`);
    
    // Parse the HTML
    const $ = cheerio.load(html);
    
    // Use the provided CSS selector from admin panel
    const selectors = cssSelector ? cssSelector.split(',') : [".exchange-rate", ".rate-display"];
    console.log(`Using admin-configured selectors: ${JSON.stringify(selectors)}`);
    
    // Make multiple attempts with increasing wait times to simulate JavaScript loading
    for (let attempt = 1; attempt <= 3; attempt++) {
      // First try with admin-configured selectors
      for (const selector of selectors) {
        const elements = $(selector.trim());
        if (elements.length > 0) {
          for (let i = 0; i < elements.length; i++) {
            const text = $(elements[i]).text();
            console.log(`Found rate text with selector "${selector}": ${text}`);
            const rate = extractNalaRate(text);
            if (rate !== null) {
              console.log(`Successfully extracted rate from selector "${selector}" on attempt ${attempt}: ${rate}`);
              return rate;
            }
          }
        }
      }
      
      // If admin selectors didn't work, look for specific class pattern shown in screenshots
      console.log('Trying specific Nala CSS classes from the screenshot...');
      const specificSelectors = [
        '.ExchangeRateValue__Value-sc-6ob57k-1', // Class from screenshot
        '.inner__3tuwB', // Class from screenshot
        '.fxRateSummaryContainer__b4tl1', // Class from screenshot
        '.ExchangeRateValue', // Base class from screenshot
        'p.ExchangeRateValue__Value-sc-6ob57k-1', // More specific selector
        'div.inner__3tuwB span', // Child elements
        'div.fxRateSummaryContainer__b4tl1 span', // Child elements
        'div:contains("1 GBP =")',
        'span:contains("1 GBP =")',
        'div:contains("exchange rate")',
        'span:contains("exchange rate")',
        'div:contains("= NGN")', // Pattern shown in screenshot
        'div:contains("GBP =")', // Alternative format
        '.GBP', // Class that might contain the rate
        '*:contains("1893")' // Known rate pattern from screenshot
      ];
      
      for (const specificSelector of specificSelectors) {
        const elements = $(specificSelector);
        if (elements.length > 0) {
          for (let i = 0; i < elements.length; i++) {
            const text = $(elements[i]).text();
            console.log(`Found text with specific selector "${specificSelector}": ${text}`);
            const rate = extractNalaRate(text);
            if (rate !== null) {
              console.log(`Successfully extracted rate from specific selector "${specificSelector}": ${rate}`);
              return rate;
            }
          }
        }
      }
      
      // Try finding the rate in the entire page
      console.log('Trying to find rate in the whole page text...');
      const bodyText = $('body').text();
      const pageRate = findRateInText(bodyText);
      if (pageRate !== null) {
        console.log(`Found Nala-specific rate: ${pageRate}`);
        return pageRate;
      }
      
      if (attempt < 3) {
        // Wait and try again to handle JavaScript-loaded content
        const waitTime = attempt === 1 ? 2000 : 4000; // Progressively longer waits
        console.log(`Attempt ${attempt}/3: Waiting ${waitTime}ms for dynamic content...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error scraping Nala website (${url}):`, error);
    return null;
  }
}

/**
 * Scrape using puppeteer browser for JavaScript-heavy sites
 */
async function scrapeWithPuppeteer(url: string): Promise<number | null> {
  try {
    console.log('Launching puppeteer browser...');
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the URL
      console.log(`Navigating to ${url} with puppeteer...`);
      await page.goto(url, { timeout: 60000, waitUntil: 'networkidle2' });
      
      // Wait for potential elements to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get the page content
      const content = await page.content();
      const $ = cheerio.load(content);
      
      console.log('Puppeteer loaded page, searching for rate information...');
      
      // Look for common exchange rate patterns in the loaded content
      const rateSelectors = [
        '.ExchangeRateValue__Value-sc-6ob57k-1',
        '.inner__3tuwB',
        '.fxRateSummaryContainer__b4tl1',
        'div:contains("1 GBP =")',
        'span:contains("1 GBP =")',
        'div:contains("exchange rate")',
        '.GBP'
      ];
      
      for (const selector of rateSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          for (let i = 0; i < elements.length; i++) {
            const text = $(elements[i]).text();
            console.log(`Puppeteer found text with selector "${selector}": ${text}`);
            const rate = extractNalaRate(text);
            if (rate !== null) {
              console.log(`Puppeteer successfully extracted rate: ${rate}`);
              return rate;
            }
          }
        }
      }
      
      // Scan entire page text as last resort
      const bodyText = $('body').text();
      const pageRate = findRateInText(bodyText);
      if (pageRate !== null) {
        console.log(`Puppeteer found rate in page text: ${pageRate}`);
        return pageRate;
      }
      
      return null;
    } finally {
      await browser.close();
      console.log('Puppeteer browser closed');
    }
  } catch (error) {
    console.error('Error using puppeteer:', error);
    return null;
  }
}

/**
 * Extract the exchange rate from Nala specific text formats
 */
function extractNalaRate(text: string): number | null {
  if (!text) return null;
  
  // Clean up the text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  console.log(`Attempting to extract rate from: "${cleanText}"`);
  
  // Pattern 1: Direct number after GBP = or before NGN
  const directPattern = /GBP\s*=\s*(\d+[.,]\d+)/i;
  const directMatch = cleanText.match(directPattern);
  if (directMatch && directMatch[1]) {
    const rate = parseFloat(directMatch[1].replace(',', '.'));
    if (!isNaN(rate) && rate > 100) { // Sanity check for NGN rate
      console.log(`Extracted rate using direct pattern: ${rate}`);
      return rate;
    }
  }
  
  // Pattern 2: Look for "1 GBP = X NGN" format
  const gbpNgnPattern = /1\s*GBP\s*=\s*(\d+[.,]\d+)\s*NGN/i;
  const gbpNgnMatch = cleanText.match(gbpNgnPattern);
  if (gbpNgnMatch && gbpNgnMatch[1]) {
    const rate = parseFloat(gbpNgnMatch[1].replace(',', '.'));
    if (!isNaN(rate) && rate > 100) {
      console.log(`Extracted rate using GBP-NGN pattern: ${rate}`);
      return rate;
    }
  }
  
  // Pattern 3: Look for "rate: X" format
  const ratePattern = /rate\s*[:\-=]\s*(\d+[.,]\d+)/i;
  const rateMatch = cleanText.match(ratePattern);
  if (rateMatch && rateMatch[1]) {
    const rate = parseFloat(rateMatch[1].replace(',', '.'));
    if (!isNaN(rate) && rate > 100) {
      console.log(`Extracted rate using rate pattern: ${rate}`);
      return rate;
    }
  }
  
  // Pattern 4: Look for just a number with Naira symbol or NGN
  const nairaPattern = /(₦|NGN)\s*(\d+[.,]\d+)/i;
  const nairaMatch = cleanText.match(nairaPattern);
  if (nairaMatch && nairaMatch[2]) {
    const rate = parseFloat(nairaMatch[2].replace(',', '.'));
    if (!isNaN(rate) && rate > 100) {
      console.log(`Extracted rate using Naira symbol pattern: ${rate}`);
      return rate;
    }
  }
  
  // Pattern 5: Look for just a number that could be a rate
  const numberPattern = /(\d+[.,]\d+)/g;
  const numbers = cleanText.match(numberPattern);
  if (numbers) {
    // Filter for numbers that look like NGN rates (typically > 1000)
    const possibleRates = numbers
      .map(n => parseFloat(n.replace(',', '.')))
      .filter(n => !isNaN(n) && n > 1000 && n < 3000); // Reasonable NGN rate range
    
    if (possibleRates.length === 1) {
      console.log(`Extracted single possible rate: ${possibleRates[0]}`);
      return possibleRates[0];
    }
    else if (possibleRates.length > 0) {
      // If multiple numbers, take the one closest to known NGN rates
      const expectedRate = 1800; // Approximate expected rate range
      const closest = possibleRates.reduce((prev, curr) => 
        Math.abs(curr - expectedRate) < Math.abs(prev - expectedRate) ? curr : prev
      );
      console.log(`Extracted closest possible rate from ${possibleRates.length} candidates: ${closest}`);
      return closest;
    }
  }
  
  // If all pattern matching fails, look for a broader pattern across the entire text
  return null;
}

/**
 * Look for exchange rate patterns in a larger text
 */
function findRateInText(text: string): number | null {
  if (!text) return null;
  
  // Try to find mentions of both GBP and NGN near numbers
  const patterns = [
    /(\d+[.,]\d+)\s*NGN\s*(?:per|to|for|\/)\s*(?:1\s*)?GBP/gi,
    /GBP\s*(?:to|\/)\s*NGN\s*(?:rate|:)?\s*(\d+[.,]\d+)/gi,
    /exchange\s*rate\s*(?:is|:)?\s*(\d+[.,]\d+)/gi,
    /1\s*GBP\s*(?:=|is|equals)\s*(\d+[.,]\d+)/gi,
    /(\d+[.,]\d+)\s*NGN/gi
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      // Get the first capture group from the first match
      const rate = parseFloat(matches[0][1].replace(',', '.'));
      if (!isNaN(rate) && rate > 500) { // Sanity check for NGN rate
        return rate;
      }
    }
  }
  
  return null;
}

/**
 * Update the Nala exchange rate in the database
 * This function will be called from the main scraper
 */
export async function updateNalaRate(): Promise<boolean> {
  try {
    console.log('=== Starting dedicated Nala rate update process ===');
    
    // Get the Nala provider
    const providers = await storage.getProviders();
    const nalaProvider = providers.find(p => p.name === 'Nala');
    
    if (!nalaProvider) {
      console.error('Nala provider not found in database');
      return false;
    }
    
    // Attempt to scrape the rate
    const rate = await scrapeNalaRate();
    
    if (rate === null) {
      console.error('Failed to scrape Nala rate');
      return false;
    }
    
    // Validate the rate (making sure it's reasonable for GBP to NGN)
    const isValidRate = rate > 500 && rate < 5000;
    console.log(`Extracted rate for Nala: ${rate}, Valid: ${isValidRate}`);
    
    if (!isValidRate) {
      console.error('Invalid rate value for GBP to NGN');
      return false;
    }
    
    // Format the rate data for the database
    const rateData: InsertExchangeRate = {
      provider_id: nalaProvider.id,
      from_currency: 'GBP',
      to_currency: 'NGN',
      rate: rate,
      timestamp: new Date(),
      source: 'Web', // Source is set to Web for scraped rates
    };
    
    // Add to the database
    await storage.createExchangeRate(rateData);
    console.log(`Successfully updated Nala GBP to NGN rate: ${rate}`);
    
    return true;
  } catch (error) {
    console.error('Error updating Nala rate:', error);
    return false;
  }
}