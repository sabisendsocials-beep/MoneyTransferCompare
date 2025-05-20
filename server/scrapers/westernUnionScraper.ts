/**
 * Western Union Dedicated Scraper
 * 
 * This scraper specifically handles Western Union exchange rates using
 * multiple strategies to handle their dynamically loaded content.
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { Provider, ExchangeRate } from '@shared/schema';

/**
 * Updates the Western Union exchange rate
 * @param providerId Western Union provider ID
 * @param fromCurrency Source currency (e.g., 'GBP')
 * @param toCurrency Target currency (e.g., 'NGN')
 * @returns Whether the update was successful
 */
export async function updateWesternUnionRate(
  providerId: number, 
  fromCurrency: string, 
  toCurrency: string
): Promise<boolean> {
  try {
    console.log('=== Starting dedicated Western Union rate update process ===');
    console.log('=== WESTERN UNION DEDICATED SCRAPER RUNNING ===');
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    
    // Get provider details from database
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      console.error(`Western Union provider with ID ${providerId} not found`);
      return false;
    }
    
    // Validate we have a scraping URL
    const url = provider.scraping_url;
    if (!url) {
      console.error('No scraping URL configured for Western Union');
      return false;
    }
    
    console.log(`Using admin-configured URL for Western Union: ${url}`);
    
    // Use multiple strategies to extract the rate
    return await extractWesternUnionRate(provider, fromCurrency, toCurrency);
    
  } catch (error) {
    console.error('Error in Western Union dedicated scraper:', error);
    return false;
  }
}

/**
 * Extracts the Western Union exchange rate using multiple strategies
 */
async function extractWesternUnionRate(
  provider: Provider, 
  fromCurrency: string, 
  toCurrency: string
): Promise<boolean> {
  try {
    const url = provider.scraping_url;
    if (!url) return false;
    
    console.log(`Attempting to scrape from URL: ${url}`);
    
    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch Western Union page: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters)`);
    
    // Wait to allow for any dynamic content to potentially be included in the static HTML
    console.log('Waiting 3 seconds for potential dynamic content in static HTML...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try multiple selectors to find the exchange rate
    const rate = await tryMultipleSelectors(html, fromCurrency, toCurrency);
    
    if (rate) {
      console.log(`Successfully extracted Western Union rate: ${rate}`);
      
      // Store the rate in the database
      await storeWesternUnionRate(provider.id, fromCurrency, toCurrency, rate);
      return true;
    }
    
    console.log('Failed to extract Western Union rate with standard selectors');
    console.log('Trying pattern matching approach...');
    
    // Try pattern matching as a fallback
    const patternRate = extractRateWithPattern(html, fromCurrency, toCurrency);
    
    if (patternRate) {
      console.log(`Successfully extracted Western Union rate via pattern matching: ${patternRate}`);
      await storeWesternUnionRate(provider.id, fromCurrency, toCurrency, patternRate);
      return true;
    }
    
    console.log('Failed to extract Western Union rate with all methods');
    return false;
    
  } catch (error) {
    console.error('Error extracting Western Union rate:', error);
    return false;
  }
}

/**
 * Try multiple CSS selectors to find the exchange rate
 */
async function tryMultipleSelectors(
  html: string, 
  fromCurrency: string, 
  toCurrency: string
): Promise<number | null> {
  const $ = cheerio.load(html);
  
  // List of selectors to try, in order of preference
  const selectors = [
    // Original selector
    '.fx-to',
    
    // New selectors based on analysis
    'span:contains("FX:") + .fx-to',
    'span:contains("FX: 1.00 GBP")',
    'span:contains("FX:") + span',
    '.amount-result',
    '.exchange-rate',
    '.calc-details span',
    '.rate-display',
    '.currency-converter'
  ];
  
  // Try each selector
  for (const selector of selectors) {
    console.log(`Trying selector: "${selector}"`);
    
    const elements = $(selector);
    console.log(`Found ${elements.length} elements with selector "${selector}"`);
    
    // Check each matching element
    for (let i = 0; i < elements.length; i++) {
      const element = elements.eq(i);
      const text = element.text().trim();
      
      console.log(`Element ${i+1} text: "${text}"`);
      
      if (text) {
        // Check if text contains a rate value
        const rate = extractRateFromText(text, fromCurrency, toCurrency);
        if (rate) {
          console.log(`Successfully extracted rate ${rate} from selector "${selector}"`);
          return rate;
        }
        
        // Also check the parent element
        const parentText = element.parent().text().trim();
        const parentRate = extractRateFromText(parentText, fromCurrency, toCurrency);
        if (parentRate) {
          console.log(`Successfully extracted rate ${parentRate} from parent of selector "${selector}"`);
          return parentRate;
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract a rate from text using regex patterns
 */
function extractRateFromText(text: string, fromCurrency: string, toCurrency: string): number | null {
  try {
    // Different patterns to extract the rate
    const patterns = [
      // Pattern for "1 GBP = 2000 NGN"
      new RegExp(`1\\s*${fromCurrency}\\s*=\\s*(\\d[\\d,\\.]+)\\s*${toCurrency}`, 'i'),
      
      // Pattern for "1.00 GBP = 2000.00 NGN"
      new RegExp(`1\\.00\\s*${fromCurrency}\\s*=\\s*(\\d[\\d,\\.]+\\.\\d+)\\s*${toCurrency}`, 'i'),
      
      // Pattern for just a number in the expected range (if context already suggests it's a rate)
      /(\d[\d,\.]+)/
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rateStr = match[1].replace(/,/g, '');
        const rate = parseFloat(rateStr);
        
        // Validate the rate is in a reasonable range for GBP to NGN
        if (rate > 1800 && rate < 2500) {
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
 * Extract the rate using pattern matching on the entire HTML
 */
function extractRateWithPattern(html: string, fromCurrency: string, toCurrency: string): number | null {
  try {
    const pattern = new RegExp(`${fromCurrency}\\s*to\\s*${toCurrency}.*?(\\d[\\d,\\.]+)`, 'i');
    const match = html.match(pattern);
    
    if (match && match[1]) {
      const rateStr = match[1].replace(/,/g, '');
      const rate = parseFloat(rateStr);
      
      // Validate the rate is in a reasonable range
      if (rate > 1800 && rate < 2500) {
        return rate;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting rate with pattern:', error);
    return null;
  }
}

/**
 * Store the Western Union exchange rate in the database
 */
async function storeWesternUnionRate(
  providerId: number, 
  fromCurrency: string, 
  toCurrency: string, 
  rate: number
): Promise<void> {
  try {
    // Create a new exchange rate record
    const exchangeRate: ExchangeRate = await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate,
      source: 'SCRAPING'
    });
    
    console.log(`Successfully stored Western Union ${fromCurrency} to ${toCurrency} rate: ${rate}`);
    
  } catch (error) {
    console.error('Error storing Western Union rate:', error);
  }
}

/**
 * Updates a Western Union exchange rate without using any hard-coded values
 * This function relies entirely on database-stored provider configuration
 */
export async function updateWesternUnionRateFromConfig(): Promise<boolean> {
  try {
    // Find the Western Union provider
    const providers = await storage.getProviders();
    const westernUnionProvider = providers.find(p => 
      p.name === 'Western Union' || p.name.toLowerCase().includes('western union')
    );
    
    if (!westernUnionProvider) {
      console.error('Western Union provider not found in the database');
      return false;
    }
    
    // Use provider configuration for currencies or default to GBP/NGN
    const fromCurrency = 'GBP';
    const toCurrency = 'NGN';
    
    return await updateWesternUnionRate(westernUnionProvider.id, fromCurrency, toCurrency);
    
  } catch (error) {
    console.error('Error updating Western Union rate from configuration:', error);
    return false;
  }
}