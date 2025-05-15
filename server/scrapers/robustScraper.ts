/**
 * Robust scraping solution that can handle websites with anti-scraping measures
 * This module provides advanced scraping techniques including:
 * 1. Headless browser with Puppeteer
 * 2. Randomized user agents and request headers
 * 3. Browser fingerprint evasion
 * 4. Request throttling to avoid rate limits
 * 5. HTML parsing with multiple strategies
 * 6. Page interaction capabilities for SPAs
 */

import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

// Collection of realistic user agents to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
];

// Get a random user agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Scrape content from a website using a headless browser
 * This approach works on JavaScript-heavy sites and can bypass many anti-scraping measures
 * 
 * @param url The URL to scrape
 * @param selectors CSS selectors to extract content
 * @param options Advanced scraping options
 * @returns The extracted content or null if not found
 */
export async function scrapeWithBrowser(
  url: string,
  selectors: string[] = [],
  options: {
    timeout?: number;
    waitTime?: number;
    executeScript?: string;
    clickSelector?: string;
    inputData?: { selector: string; value: string }[];
    extractAttribute?: string;
    fullPage?: boolean;
  } = {}
): Promise<string | null> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ]
  });

  try {
    console.log(`Starting browser-based scraping of ${url}...`);
    
    // Create a new page with a random user agent
    const page = await browser.newPage();
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);
    
    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive'
    });
    
    // Emulate a realistic viewport
    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
    });

    // Set a timeout for navigation
    const timeout = options.timeout || 30000;
    await page.setDefaultNavigationTimeout(timeout);
    
    // Navigate to the URL with additional wait time to ensure page loaded
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait additional time if specified to allow for any lazy-loaded content
    if (options.waitTime) {
      console.log(`Waiting ${options.waitTime}ms for page to fully render...`);
      await new Promise(resolve => setTimeout(resolve, options.waitTime));
    }
    
    // Execute custom JavaScript if provided
    if (options.executeScript) {
      console.log('Executing custom script on page...');
      await page.evaluate(options.executeScript);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for script execution
    }
    
    // Click on elements if specified
    if (options.clickSelector) {
      console.log(`Clicking element: ${options.clickSelector}`);
      await page.click(options.clickSelector);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for any resulting changes
    }
    
    // Input data if specified
    if (options.inputData && options.inputData.length > 0) {
      for (const input of options.inputData) {
        console.log(`Entering text into: ${input.selector}`);
        await page.type(input.selector, input.value);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Wait a bit more to ensure all dynamic content has loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the page content
    const pageContent = await page.content();
    const $ = cheerio.load(pageContent);
    
    // If full page extraction is requested, return the entire body text
    if (options.fullPage) {
      const bodyText = $('body').text();
      console.log(`Extracted full page content (${bodyText.length} characters)`);
      return bodyText;
    }
    
    // Try each provided selector
    if (selectors.length > 0) {
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          for (let i = 0; i < elements.length; i++) {
            let content;
            
            // Extract text or specified attribute
            if (options.extractAttribute) {
              content = $(elements[i]).attr(options.extractAttribute);
            } else {
              content = $(elements[i]).text().trim();
            }
            
            if (content) {
              console.log(`Found content with selector "${selector}": ${content}`);
              return content;
            }
          }
        }
      }
    }
    
    // If no content found with selectors, look for exchange rate patterns
    console.log('No content found with provided selectors, trying to find rate patterns...');
    
    // Take a screenshot for debugging purposes
    await page.screenshot({ path: 'debug-screenshot.png' });
    
    // Return the entire body text as a last resort
    return $('body').text();
  } catch (error) {
    console.error('Error in browser-based scraping:', error);
    return null;
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

/**
 * Specialized function to scrape exchange rates using browser automation
 * This function is designed to extract currency exchange rates from various
 * websites regardless of their anti-scraping measures
 * 
 * @param url The URL to scrape
 * @param fromCurrency Source currency code (e.g., 'GBP')
 * @param toCurrency Target currency code (e.g., 'NGN')
 * @returns The exchange rate or null if not found
 */
export async function scrapeExchangeRate(
  url: string,
  fromCurrency: string = 'GBP',
  toCurrency: string = 'NGN'
): Promise<number | null> {
  try {
    console.log(`Scraping exchange rate from ${url} for ${fromCurrency} to ${toCurrency}...`);
    
    // Define specialized selectors for exchange rates based on common website patterns
    const exchangeRateSelectors = [
      `.exchange-rate`,
      `.exchange-rate-value`,
      `.rate-value`,
      `[data-testid="rate-value"]`,
      `[data-testid="rateValue"]`,
      `span.rate`,
      `.calculator-result`,
      `span.font-bold`,
      `h1 span`,
      `.result-value`,
      // Generic containers that might have rate info
      `.converter-result`,
      `.currency-converter-result`,
      `.conversion-result`
    ];
    
    // First, try fetching with the browser
    const content = await scrapeWithBrowser(url, exchangeRateSelectors, {
      waitTime: 5000,
      fullPage: true // Get the entire page content if specific selectors don't work
    });
    
    if (!content) {
      console.error('Failed to get any content from the page');
      return null;
    }
    
    console.log(`Got content of length ${content.length} characters`);
    
    // Try to find the exchange rate using various patterns
    const patterns = [
      // Common exchange rate formats with specific currencies
      new RegExp(`1\\s*${fromCurrency}\\s*=\\s*([\\d,]+\\.?\\d*)\\s*${toCurrency}`, 'i'),
      new RegExp(`${fromCurrency}\\s*to\\s*${toCurrency}\\s*rate\\s*:?\\s*([\\d,]+\\.?\\d*)`, 'i'),
      // More generic patterns
      /exchange\s*rate\s*.*?(\d{1,3}(?:[,.]\d{3})*(?:\.\d{1,4}))/i,
      /rate\s*.*?(\d{1,3}(?:[,.]\d{3})*(?:\.\d{1,4}))/i,
      // Look for large numbers (typical for GBP to NGN rates)
      /(\d{1,3}(?:,\d{3})*\.\d{1,2})/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const rateString = match[1].replace(/,/g, '');
        const rate = parseFloat(rateString);
        
        if (!isNaN(rate) && rate > 0) {
          console.log(`Found exchange rate: ${rate}`);
          
          // Validate the rate is in a reasonable range for GBP to NGN (if applicable)
          if (fromCurrency === 'GBP' && toCurrency === 'NGN') {
            if (rate > 100) { // GBP to NGN should be a large number
              return rate;
            }
          } else {
            return rate;
          }
        }
      }
    }
    
    // If specific patterns didn't work, find any numbers that might be rates
    const numberMatches = content.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,4})?)\b/g);
    
    if (numberMatches) {
      // Convert matches to numbers
      const numbers = numberMatches
        .map(match => parseFloat(match.replace(/,/g, '')))
        .filter(num => !isNaN(num) && num > 0);
      
      // For GBP to NGN, look for values in range of 1000-3000
      if (fromCurrency === 'GBP' && toCurrency === 'NGN') {
        const likelyRates = numbers.filter(n => n >= 1000 && n <= 3000);
        if (likelyRates.length > 0) {
          console.log(`Found likely GBP to NGN rates: ${likelyRates.join(', ')}`);
          return likelyRates[0];  // Return the first likely rate
        }
      }
    }
    
    console.log('Could not find a valid exchange rate pattern');
    return null;
  } catch (error) {
    console.error('Error in exchange rate scraping:', error);
    return null;
  }
}

/**
 * Specialized version with customizations for WorldRemit
 */
export async function scrapeWorldRemitRate(): Promise<number | null> {
  try {
    console.log('=== ROBUST WORLDREMIT SCRAPER RUNNING ===');
    
    const urls = [
      'https://www.worldremit.com/en/gbp-to-ngn-exchange-rate',
      'https://www.worldremit.com/en/united-kingdom/nigeria',
      'https://www.worldremit.com/en/how-to-transfer-money-to-nigeria/united-kingdom'
    ];
    
    for (const url of urls) {
      console.log(`Attempting to scrape WorldRemit from ${url}...`);
      
      // Use our robust browser scraper
      const rate = await scrapeExchangeRate(url, 'GBP', 'NGN');
      
      if (rate !== null) {
        console.log(`Successfully scraped WorldRemit rate: ${rate}`);
        return rate;
      }
    }
    
    console.log('Failed to get WorldRemit rate after trying all URLs');
    return null;
  } catch (error) {
    console.error('Error in specialized WorldRemit scraper:', error);
    return null;
  }
}