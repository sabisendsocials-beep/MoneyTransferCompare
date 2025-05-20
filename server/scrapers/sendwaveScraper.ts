/**
 * Dedicated SendWave exchange rate scraper
 * 
 * This scraper is designed to reliably extract exchange rates from SendWave's website
 * using the admin-configured URL and CSS selectors. It handles the specific structure
 * of the SendWave exchange rate display.
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { DatabaseStorage } from '../databaseStorage';
import type { InsertExchangeRate } from '@shared/schema';

// Create storage instance
const storage = new DatabaseStorage();

/**
 * Updates the SendWave exchange rate based on the admin-configured URL and selectors
 * @returns Whether the update was successful
 */
export async function updateSendwaveRate(): Promise<boolean> {
  console.log('=== Starting dedicated SendWave rate update process ===');
  
  try {
    // Get the provider info from database
    const providers = await storage.getProviders();
    const sendwave = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwave) {
      console.log('Sendwave provider not found in database');
      return false;
    }
    
    if (!sendwave.scraping_url || !sendwave.scraping_selector) {
      console.log('Sendwave scraper URL or selector not configured in admin panel');
      return false;
    }
    
    console.log(`Using configured URL: ${sendwave.scraping_url}`);
    console.log(`Using CSS selector: ${sendwave.scraping_selector}`);
    
    // First try direct scraping with configured selector
    const directRate = await scrapeSendwaveWebsite(sendwave.scraping_url, sendwave.scraping_selector);
    
    if (directRate !== null) {
      console.log(`Successfully got rate using direct scraping: ${directRate}`);
      
      // Store in the database
      const exchangeRate: InsertExchangeRate = {
        provider_id: sendwave.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: directRate,
        source: 'SCRAPER',
        verified: null,
        source_url: sendwave.scraping_url
      };
      
      await storage.createExchangeRate(exchangeRate);
      console.log(`Successfully updated SendWave GBP to NGN rate: ${directRate}`);
      
      return true;
    } else {
      // If direct scraping fails, try with puppeteer
      console.log('Direct scraping failed, trying browser simulation with puppeteer...');
      return await scrapeWithPuppeteer(sendwave);
    }
  } catch (error) {
    console.error('Error in SendWave scraper:', error);
    return false;
  }
}

/**
 * Scrape the SendWave website using cheerio
 */
async function scrapeSendwaveWebsite(url: string, cssSelector: string): Promise<number | null> {
  try {
    console.log(`Attempting to scrape SendWave rate from ${url}`);
    
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
    console.log(`Retrieved HTML content (${html.length} characters)`);
    
    // Parse the HTML
    const $ = cheerio.load(html);
    
    // Use the provided CSS selector from admin panel
    const selectors = cssSelector.split(',').map(s => s.trim());
    console.log(`Using admin-configured selectors: ${JSON.stringify(selectors)}`);
    
    // Try each selector
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        for (let i = 0; i < elements.length; i++) {
          const text = $(elements[i]).text();
          console.log(`Found text with selector "${selector}": ${text}`);
          
          // Try to extract the rate
          const rate = extractSendwaveRate(text);
          if (rate !== null) {
            console.log(`Successfully extracted rate: ${rate}`);
            return rate;
          }
        }
      } else {
        console.log(`No elements found for selector: ${selector}`);
      }
    }
    
    // Try data-testid attributes specific to SendWave
    console.log('Trying SendWave-specific data-testid attributes...');
    const testidSelectors = [
      '[data-testid="title-exchange-rate"]',
      '[data-testid="exchangerate-text"]',
      '[data-testid="calculator-title-exchange-rate"]'
    ];
    
    for (const testidSelector of testidSelectors) {
      const elements = $(testidSelector);
      if (elements.length > 0) {
        for (let i = 0; i < elements.length; i++) {
          const text = $(elements[i]).text();
          console.log(`Found text with testid selector "${testidSelector}": ${text}`);
          
          const rate = extractSendwaveRate(text);
          if (rate !== null) {
            console.log(`Successfully extracted rate from testid: ${rate}`);
            return rate;
          }
        }
      }
    }
    
    // Try finding in the entire page as last resort
    console.log('Looking for rate pattern in the entire page...');
    const bodyText = $('body').text();
    const regexMatch = extractRateWithRegex(bodyText);
    if (regexMatch !== null) {
      console.log(`Found rate using regex: ${regexMatch}`);
      return regexMatch;
    }
    
    return null;
  } catch (error) {
    console.error('Error scraping SendWave website:', error);
    return null;
  }
}

/**
 * Scrape using puppeteer browser for JavaScript-heavy sites
 */
async function scrapeWithPuppeteer(sendwave: any): Promise<boolean> {
  try {
    console.log('Launching puppeteer browser for SendWave...');
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set viewport for consistency
      await page.setViewport({ width: 1280, height: 800 });
      
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the page
      await page.goto(sendwave.scraping_url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to extract the rate using the admin-configured selector
      let rateText = await page.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return null;
        
        for (const el of elements) {
          const text = el.textContent || '';
          if (text.includes('NGN') || text.includes('Exchange Rate') || text.includes('GBP')) {
            return text.trim();
          }
        }
        
        return elements[0].textContent?.trim() || null;
      }, sendwave.scraping_selector);
      
      if (!rateText) {
        console.log('No rate text found using the configured selector');
        
        // Try a more specific selector focused on data-testid attributes
        rateText = await page.evaluate(() => {
          // Try title first
          const titleElement = document.querySelector('[data-testid="title-exchange-rate"]');
          if (titleElement) {
            return titleElement.textContent?.trim() || null;
          }
          
          // Try the rate text
          const rateElement = document.querySelector('[data-testid="exchangerate-text"]');
          if (rateElement) {
            return rateElement.textContent?.trim() || null;
          }
          
          return null;
        });
      }
      
      if (!rateText) {
        console.log('No rate text found using data-testid attributes');
        // Try getting the page HTML and use regex to find the rate
        const html = await page.content();
        const regex = /(\d{4}(?:\.\d{1,2})?)\s*NGN/i;
        const match = html.match(regex);
        if (match && match[1]) {
          rateText = match[1];
          console.log(`Found rate using regex: ${rateText}`);
        } else {
          return false;
        }
      } else {
        console.log(`Extracted raw text: ${rateText}`);
      }
      
      // Parse the rate from the text
      const rateValue = extractSendwaveRate(rateText);
      
      if (rateValue === null) {
        console.log('Could not parse rate from text');
        return false;
      }
      
      console.log(`Parsed rate: ${rateValue}`);
      
      if (isNaN(rateValue) || rateValue <= 0) {
        console.log('Invalid rate value');
        return false;
      }
      
      // Create the exchange rate entry
      const exchangeRate: InsertExchangeRate = {
        provider_id: sendwave.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: rateValue,
        source: 'SCRAPER',
        verified: null,
        source_url: sendwave.scraping_url
      };
      
      // Store in the database
      await storage.createExchangeRate(exchangeRate);
      console.log(`Successfully updated SendWave GBP to NGN rate: ${rateValue}`);
      
      return true;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error in SendWave puppeteer scraper:', error);
    return false;
  }
}

/**
 * Extract the exchange rate from text
 */
function extractSendwaveRate(text: string): number | null {
  if (!text) return null;
  
  // Clean up the text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  console.log(`Extracting rate from: "${cleanText}"`);
  
  // Pattern 1: Direct number match (most common in SendWave's format)
  const directPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*NGN/i;
  const directMatch = cleanText.match(directPattern);
  if (directMatch && directMatch[1]) {
    const rate = parseFloat(directMatch[1].replace(/,/g, ''));
    if (!isNaN(rate) && rate > 1000) { // Sanity check for NGN rate
      console.log(`Extracted rate using direct pattern: ${rate}`);
      return rate;
    }
  }
  
  // Pattern 2: Look for "1 GBP = X NGN" format
  const gbpNgnPattern = /1\s*GBP\s*=\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*NGN/i;
  const gbpNgnMatch = cleanText.match(gbpNgnPattern);
  if (gbpNgnMatch && gbpNgnMatch[1]) {
    const rate = parseFloat(gbpNgnMatch[1].replace(/,/g, ''));
    if (!isNaN(rate) && rate > 1000) {
      console.log(`Extracted rate using GBP-NGN pattern: ${rate}`);
      return rate;
    }
  }
  
  // Pattern 3: Based on the SendWave screenshot format
  const specificPattern = /(\d{4}\.\d{1,2})/;
  const specificMatch = cleanText.match(specificPattern);
  if (specificMatch && specificMatch[1]) {
    const rate = parseFloat(specificMatch[1]);
    if (!isNaN(rate) && rate > 1000) {
      console.log(`Extracted rate using specific pattern: ${rate}`);
      return rate;
    }
  }
  
  // If none of the patterns match, check if the text itself is a number
  if (/^\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$/.test(cleanText)) {
    const rate = parseFloat(cleanText.replace(/,/g, ''));
    if (!isNaN(rate) && rate > 1000) {
      console.log(`Text is a direct rate number: ${rate}`);
      return rate;
    }
  }
  
  // If we got this far, no rate was found
  return null;
}

/**
 * Extract rate using regex on whole text
 */
function extractRateWithRegex(text: string): number | null {
  // Common patterns for finding GBP to NGN rates
  const patterns = [
    /1\s*GBP\s*=\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*NGN/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*NGN/i,
    /Exchange\s*Rate:?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
    /(\d{4}\.\d{1,2})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rate = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(rate) && rate > 1000 && rate < 3000) {
        return rate;
      }
    }
  }
  
  return null;
}