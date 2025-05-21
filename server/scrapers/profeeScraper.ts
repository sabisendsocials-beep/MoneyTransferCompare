/**
 * Profee Dedicated Scraper
 * 
 * This scraper targets the Profee website specifically to extract exchange rates
 * using the admin-configured URL and CSS selectors.
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

interface ScraperResult {
  success: boolean;
  rate?: number;
  error?: string;
  rawData?: string;
}

/**
 * Extracts exchange rate from Profee website
 * @param url The URL to scrape from admin config
 * @param selector The CSS selector from admin config
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 */
export async function scrapeProfeeSite(
  url: string,
  selector: string,
  fromCurrency: string, 
  toCurrency: string
): Promise<ScraperResult> {
  console.log(`=== PROFEE DEDICATED SCRAPER RUNNING ===`);
  console.log(`This scraper will ONLY use the URL and CSS selector from the admin panel`);
  
  if (!url) {
    return { 
      success: false, 
      error: 'No URL provided for Profee scraper' 
    };
  }

  if (!selector) {
    return { 
      success: false, 
      error: 'No CSS selector provided for Profee scraper' 
    };
  }

  console.log(`Using admin-configured URL for Profee: ${url}`);
  console.log(`Using CSS selector: ${selector}`);

  try {
    // Launch headless browser with puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent to mimic regular browser
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Visit the page
    console.log(`Attempting to scrape from URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for content to fully load
    console.log(`Waiting 15 seconds for JavaScript content to fully load...`);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 15000)));

    // Get the page content
    const html = await page.content();
    console.log(`Retrieved HTML content (${html.length} characters)`);

    await browser.close();

    // Parse with cheerio
    const $ = cheerio.load(html);
    
    // Find elements with the selector
    const elements = $(selector);
    console.log(`Found ${elements.length} elements with selector "${selector}"`);

    if (elements.length === 0) {
      console.log(`No elements found with selector "${selector}"`);
      return { 
        success: false, 
        error: `No elements found with selector "${selector}"` 
      };
    }

    // Look at each element
    let rateText = '';
    for (let i = 0; i < Math.min(elements.length, 5); i++) {
      const elementText = $(elements[i]).text().trim();
      console.log(`Element ${i+1} text: "${elementText}"`);
      
      // Store the text for further processing
      rateText = elementText;
      
      // Try to extract rate from the element text
      if (extractRateFromText(rateText, fromCurrency, toCurrency)) {
        console.log(`Found promising rate text in element ${i+1}: "${rateText}"`);
        break;
      }
    }

    // If no rate text was found, try to analyze the whole page
    if (!rateText || !rateText.includes(toCurrency)) {
      console.log('Primary selector failed to find rate, analyzing nearby elements...');
      
      // Try parent elements or siblings
      const parentElements = $(selector).parent();
      const parentText = parentElements.text().trim();
      console.log(`Parent element text: "${parentText}"`);
      
      if (parentText.includes(toCurrency) && parentText.includes(fromCurrency)) {
        rateText = parentText;
      }
    }

    // Process the rate text to extract the numeric value
    const result = extractRateFromText(rateText, fromCurrency, toCurrency);
    if (result) {
      return {
        success: true,
        rate: result.rate,
        rawData: rateText
      };
    }

    // If we couldn't extract the rate, return the raw data for debugging
    return {
      success: false,
      error: 'Could not extract rate from the text',
      rawData: rateText
    };

  } catch (error) {
    console.error('Error scraping Profee website:', error);
    return {
      success: false,
      error: `Error scraping Profee: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Extracts rate value from text containing currency information
 */
function extractRateFromText(
  text: string, 
  fromCurrency: string, 
  toCurrency: string
): { rate: number } | null {
  if (!text) return null;
  
  // Clean up the text
  const cleanText = text.replace(/&nbsp;/g, ' ').trim();
  console.log(`Analyzing text for rate extraction: "${cleanText}"`);
  
  // Handle common formats like "NGN 2,162.23" or "2,162.23 NGN"
  const currencyPattern = new RegExp(`${toCurrency}[\\s]*([\\d,.]+)|(\\d[\\d,.]+)[\\s]*${toCurrency}`, 'i');
  const match = cleanText.match(currencyPattern);
  
  if (match) {
    // Extract the numeric part, using first or second group depending on which matched
    const rateStr = (match[1] || match[2]).replace(/,/g, '');
    const rate = parseFloat(rateStr);
    
    if (!isNaN(rate) && rate > 0) {
      console.log(`Successfully extracted rate: ${rate} ${fromCurrency}/${toCurrency}`);
      return { rate };
    }
  }
  
  // Try a more generic approach - look for numbers in the expected range for NGN/GBP rates
  if (fromCurrency === 'GBP' && toCurrency === 'NGN') {
    const numberPattern = /(\d{1,3}(,\d{3})*(\.\d+)?)/g;
    const numbers = cleanText.match(numberPattern);
    
    if (numbers) {
      for (const num of numbers) {
        const rate = parseFloat(num.replace(/,/g, ''));
        // NGN rates are typically between 1500-2500 for GBP
        if (rate > 1500 && rate < 2500) {
          console.log(`Found likely ${fromCurrency}/${toCurrency} rate by value range: ${rate}`);
          return { rate };
        }
      }
    }
  }
  
  return null;
}

/**
 * Updates exchange rate for Profee using admin-configured settings
 */
export async function updateProfeeRate(
  providerUrl: string,
  rateSelector: string,
  providerId: number,
  fromCurrency: string,
  toCurrency: string,
  updateRateFunc: (providerId: number, fromCurrency: string, toCurrency: string, rate: number) => Promise<boolean>
): Promise<boolean> {
  console.log(`=== Starting dedicated Profee rate update process ===`);
  
  const result = await scrapeProfeeSite(providerUrl, rateSelector, fromCurrency, toCurrency);
  
  if (result.success && result.rate) {
    console.log(`Successfully extracted Profee ${fromCurrency} to ${toCurrency} rate: ${result.rate}`);
    
    // Update the rate in the database
    const updated = await updateRateFunc(providerId, fromCurrency, toCurrency, result.rate);
    
    if (updated) {
      console.log(`Successfully updated Profee ${fromCurrency} to ${toCurrency} rate: ${result.rate}`);
      return true;
    } else {
      console.error(`Failed to update Profee rate in database`);
      return false;
    }
  } else {
    console.error(`Failed to extract Profee rate: ${result.error}`);
    console.log(`Raw data retrieved: ${result.rawData || 'None'}`);
    return false;
  }
}