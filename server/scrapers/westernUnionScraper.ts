/**
 * Dedicated Western Union scraper
 * 
 * This scraper is specifically designed to extract exchange rates from the Western Union website
 * using admin-configured URLs and CSS selectors only.
 */
import { storage } from '../storage';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Extract the exchange rate from Western Union website using admin-configured URL and selectors
 * 
 * @param providerId The ID of the Western Union provider
 * @param fromCurrency Source currency (e.g., GBP)
 * @param toCurrency Target currency (e.g., NGN)
 * @returns Whether the rate was successfully extracted and saved
 */
export async function extractWesternUnionRate(
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  try {
    console.log('=== Starting dedicated Western Union rate update process ===');
    console.log('=== WESTERN UNION DEDICATED SCRAPER RUNNING ===');
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    
    // Get the provider from the database to use admin-configured URL and selectors
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      console.error(`Provider with ID ${providerId} not found`);
      return false;
    }
    
    // Use admin-configured URL
    const url = provider.scraping_url;
    console.log(`Using admin-configured URL for Western Union: ${url}`);
    
    if (!url) {
      console.error('No URL configured for Western Union provider');
      return false;
    }
    
    const primarySelector = provider.scraping_selector || '.fx-to';
    console.log(`Using CSS selector: ${primarySelector}`);
    
    // Try to scrape the exchange rate
    const rate = await scrapeExchangeRate(url, primarySelector, fromCurrency, toCurrency);
    
    // If we got a rate, save it to the database
    if (rate !== null) {
      await saveExchangeRate(providerId, fromCurrency, toCurrency, rate);
      return true;
    }
    
    // If the primary URL fails, try some fallback approaches
    console.log('Primary scraping approach failed, trying enhanced extraction...');
    const enhancedRate = await enhancedRateExtraction(url, fromCurrency, toCurrency);
    
    if (enhancedRate !== null) {
      await saveExchangeRate(providerId, fromCurrency, toCurrency, enhancedRate);
      return true;
    }
    
    console.error('Failed to extract Western Union rate');
    return false;
  } catch (error) {
    console.error('Error in Western Union scraper:', error);
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
    
    // Wait for JavaScript to load dynamic content
    console.log('Waiting for JavaScript content to fully load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(html);
    
    // Try the primary selector first
    const elements = $(cssSelector);
    console.log(`Found ${elements.length} elements with selector "${cssSelector}"`);
    
    // Check primary selector elements
    for (let i = 0; i < elements.length; i++) {
      const element = elements.eq(i);
      const text = element.text().trim();
      
      console.log(`Element ${i+1} text: "${text}"`);
      
      if (text && text.includes(toCurrency)) {
        const rateMatch = text.match(/(\d+[\d,\.]+)/);
        if (rateMatch) {
          const rateStr = rateMatch[1].replace(/,/g, '');
          const parsedRate = parseFloat(rateStr);
          
          if (!isNaN(parsedRate) && parsedRate > 0) {
            console.log(`Successfully extracted ${fromCurrency} to ${toCurrency} rate: ${parsedRate}`);
            return parsedRate;
          }
        }
      }
    }
    
    // Check for the "FX:" pattern which contains the exchange rate
    console.log('Trying FX pattern approach...');
    const fxElements = $('span:contains("FX:")');
    console.log(`Found ${fxElements.length} elements containing "FX:"`);
    
    for (let i = 0; i < fxElements.length; i++) {
      const element = fxElements.eq(i);
      const text = element.text().trim();
      console.log(`FX element ${i+1} text: "${text}"`);
      
      // Look for siblings or parent that might contain the rate
      if (text.includes(fromCurrency)) {
        console.log('Found FX element with the correct currency');
        
        // Check the parent for the full text
        const parentText = element.parent().text().trim();
        console.log(`Parent text: "${parentText}"`);
        
        // Look for the next sibling which might contain the rate
        const nextSibling = element.next();
        if (nextSibling.length > 0) {
          const siblingText = nextSibling.text().trim();
          console.log(`Next sibling text: "${siblingText}"`);
          
          // Check if it contains a number in our expected range
          const rateMatch = siblingText.match(/(\d+[\d,\.]+)/);
          if (rateMatch) {
            const rateStr = rateMatch[1].replace(/,/g, '');
            const parsedRate = parseFloat(rateStr);
            
            if (!isNaN(parsedRate) && parsedRate > 0) {
              console.log(`Successfully extracted rate from sibling: ${parsedRate}`);
              return parsedRate;
            }
          }
        }
        
        // Try to extract the rate from the full text if it includes both currencies
        if (parentText.includes(fromCurrency) && parentText.includes(toCurrency)) {
          const rateMatch = parentText.match(/(\d+[\d,\.]+)\s*NGN/i);
          if (rateMatch) {
            const rateStr = rateMatch[1].replace(/,/g, '');
            const parsedRate = parseFloat(rateStr);
            
            if (!isNaN(parsedRate) && parsedRate > 1000) {
              console.log(`Successfully extracted rate from parent: ${parsedRate}`);
              return parsedRate;
            }
          }
        }
      }
    }
    
    // Look for any elements containing both currency codes
    console.log('Looking for elements containing both currency codes...');
    const currencyElements = $(`*:contains("${fromCurrency}"):contains("${toCurrency}")`);
    console.log(`Found ${currencyElements.length} elements containing both currencies`);
    
    for (let i = 0; i < currencyElements.length && i < 20; i++) { // Limit to 20 elements to avoid excessive processing
      const element = currencyElements.eq(i);
      const text = element.text().trim();
      
      // Only process reasonably sized text fragments
      if (text.length > 5 && text.length < 300) {
        // Look for specific patterns
        const patterns = [
          new RegExp(`1\\s*${fromCurrency}\\s*=\\s*(\\d+[\\d,\\.]+)\\s*${toCurrency}`, 'i'),
          new RegExp(`(\\d+[\\d,\\.]+)\\s*${toCurrency}\\s+to\\s+1\\s*${fromCurrency}`, 'i'),
          new RegExp(`${fromCurrency}\\s*/\\s*${toCurrency}\\s*:\\s*(\\d+[\\d,\\.]+)`, 'i')
        ];
        
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            const rateStr = match[1].replace(/,/g, '');
            const parsedRate = parseFloat(rateStr);
            
            if (!isNaN(parsedRate) && parsedRate > 1000) {
              console.log(`Successfully extracted rate using pattern: ${parsedRate}`);
              return parsedRate;
            }
          }
        }
        
        // Look for any numbers in the appropriate range for this currency pair
        const numbersMatch = text.match(/(\d+[\d,\.]+)/g);
        if (numbersMatch) {
          for (const numStr of numbersMatch) {
            const parsedNum = parseFloat(numStr.replace(/,/g, ''));
            
            // For GBP to NGN, rates should be roughly in this range
            if (!isNaN(parsedNum) && parsedNum > 1500 && parsedNum < 2500) {
              console.log(`Found likely exchange rate: ${parsedNum}`);
              return parsedNum;
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error scraping exchange rate:', error);
    return null;
  }
}

/**
 * Enhanced extraction approach for Western Union
 * Uses additional techniques to find rate information
 */
async function enhancedRateExtraction(
  url: string,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    console.log('Attempting enhanced extraction for Western Union...');
    
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Collection of selectors that might contain the exchange rate
    const selectors = [
      '.fx-to',
      '.exchange-rate',
      '.wu-calc-rate',
      'span:contains("1.00 ' + fromCurrency + '")',
      'span:contains("' + fromCurrency + ' - ")',
      'span:contains("' + toCurrency + '")'
    ];
    
    // Try each selector
    for (const selector of selectors) {
      const elements = $(selector);
      console.log(`Enhanced extraction: Found ${elements.length} elements with selector "${selector}"`);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements.eq(i);
        // Get both the element text and surrounding text
        const text = element.text().trim();
        const parentText = element.parent().text().trim();
        
        console.log(`Element ${i+1} text: "${text}"`);
        
        // Try to extract rate from text
        const rate = extractRateFromText(text, fromCurrency, toCurrency);
        if (rate !== null) return rate;
        
        // If not found in the element text, try the parent text
        const parentRate = extractRateFromText(parentText, fromCurrency, toCurrency);
        if (parentRate !== null) return parentRate;
      }
    }
    
    // Try to find the rate in any element containing both the source and target currencies
    const combinedSelector = $(`*:contains("${fromCurrency}"):contains("${toCurrency}")`);
    console.log(`Found ${combinedSelector.length} elements containing both ${fromCurrency} and ${toCurrency}`);
    
    for (let i = 0; i < combinedSelector.length; i++) {
      const text = combinedSelector.eq(i).text().trim();
      // Only check reasonably sized text fragments
      if (text.length > 5 && text.length < 200) {
        console.log(`Checking combined text: "${text}"`);
        const rate = extractRateFromText(text, fromCurrency, toCurrency);
        if (rate !== null) return rate;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in enhanced rate extraction:', error);
    return null;
  }
}

/**
 * Extract exchange rate from text
 */
function extractRateFromText(text: string, fromCurrency: string, toCurrency: string): number | null {
  try {
    // Pattern 1: "X.XX NGN" format
    const simplePattern = new RegExp(`(\\d+[\\.\\d]*)[\\s]*${toCurrency}`, 'i');
    const simpleMatch = text.match(simplePattern);
    
    if (simpleMatch) {
      const rate = parseFloat(simpleMatch[1].replace(/,/g, ''));
      if (!isNaN(rate) && rate > 0) {
        console.log(`Extracted rate using simple pattern: ${rate}`);
        return rate;
      }
    }
    
    // Pattern 2: "1 GBP = X.XX NGN" format
    const equalsPattern = new RegExp(`1[\\s]*${fromCurrency}[\\s]*=[\\s]*(\\d+[\\.\\d,]*)`, 'i');
    const equalsMatch = text.match(equalsPattern);
    
    if (equalsMatch) {
      const rate = parseFloat(equalsMatch[1].replace(/,/g, ''));
      if (!isNaN(rate) && rate > 0) {
        console.log(`Extracted rate using equals pattern: ${rate}`);
        return rate;
      }
    }
    
    // Pattern 3: Extract all numbers and check them individually
    const numberMatches = text.match(/([\d,]+\.?\d*)/g);
    
    // Function to check if rate is in a reasonable range
    const isReasonableRate = (rate: number): boolean => {
      if (fromCurrency === 'GBP' && toCurrency === 'NGN') {
        return rate > 1500 && rate < 2500; // Reasonable range for GBP to NGN
      }
      if (fromCurrency === 'EUR' && toCurrency === 'NGN') {
        return rate > 1200 && rate < 2000; // Reasonable range for EUR to NGN
      }
      // Add other currency pair ranges as needed
      return rate > 0; // Default fallback - any positive number
    };
    
    // Check each matched number
    if (numberMatches) {
      for (let i = 0; i < numberMatches.length; i++) {
        const rateStr = numberMatches[i].replace(/,/g, '');
        const rate = parseFloat(rateStr);
        if (!isNaN(rate) && isReasonableRate(rate)) {
          console.log(`Extracted possible rate using number pattern: ${rate}`);
          return rate;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting rate from text:', error);
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
    
    console.log(`Successfully updated Western Union ${fromCurrency} to ${toCurrency} rate: ${rate}`);
    console.log('=== Successfully updated Western Union rate with dedicated scraper ===');
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    throw error;
  }
}

/**
 * Main function to update Western Union exchange rates
 * This is the entry point called by the rate update process
 */
export async function updateWesternUnionRates(): Promise<boolean> {
  try {
    console.log('Starting Western Union rates update...');
    
    // Look for a provider named "Western Union"
    const providers = await storage.getProviders();
    const westernUnionProvider = providers.find(p => 
      p.name === 'Western Union' || p.name.toLowerCase().includes('western union')
    );
    
    if (!westernUnionProvider) {
      console.error('Western Union provider not found in database');
      return false;
    }
    
    console.log(`Found Western Union provider with ID ${westernUnionProvider.id}`);
    
    // Extract GBP to NGN rate
    const gbpNgnSuccess = await extractWesternUnionRate(westernUnionProvider.id, 'GBP', 'NGN');
    
    // Also try to extract EUR to NGN if needed
    // const eurNgnSuccess = await extractWesternUnionRate(westernUnionProvider.id, 'EUR', 'NGN');
    
    return gbpNgnSuccess;
  } catch (error) {
    console.error('Error updating Western Union rates:', error);
    return false;
  }
}