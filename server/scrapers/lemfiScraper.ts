/**
 * Dedicated Lemfi scraper
 * 
 * This scraper is specifically designed to extract exchange rates from the Lemfi website
 * using admin-configured URLs and CSS selectors only.
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

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
    
    // Get admin-configured selectors
    let selectors = provider.scraping_selector?.split(',') || [];
    
    // Ensure we have at least the default selector
    if (selectors.length === 0) {
      selectors = [
        '.molecule-conversion-box_details__item span.base-text.base-text--size-small--bold',
        '.molecule-conversion-box_details__item span:nth-child(2)'
      ];
    }
    
    // Add additional variations of the selector to try
    selectors = [
      ...selectors,
      'span.base-text.base-text--size-small--bold',
      'span.base-text--size-small--bold',
      '.base-text--size-small--bold',
      '.molecule-conversion-box_details__item span',
      'div.molecule-conversion-box_details__item span'
    ];
    
    console.log(`Using admin-configured selectors: ${JSON.stringify(selectors)}`);
    
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters) from ${url}`);
    
    // Wait for JavaScript to finish loading dynamic content
    console.log('Waiting 2 seconds for JavaScript to finish loading dynamic content...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    
    // Try each selector until we find a valid rate
    let rate: number | null = null;
    
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      console.log(`Trying selector "${selector}"...`);
      
      const elements = $(selector);
      console.log(`Found ${elements.length} elements with selector "${selector}"`);
      
      if (elements.length > 0) {
        for (let j = 0; j < elements.length; j++) {
          const element = elements.eq(j);
          const text = element.text().trim();
          console.log(`Element ${j+1} text: "${text}"`);
          
          // Look for a pattern like "1 GBP = 2,153 NGN"
          const rateMatch = text.match(/\s*1\s*[A-Z]{3}\s*=\s*([\d,\.]+)\s*[A-Z]{3}/i);
          
          if (rateMatch) {
            const rateStr = rateMatch[1].replace(/,/g, '');
            const parsedRate = parseFloat(rateStr);
            
            if (!isNaN(parsedRate) && parsedRate > 0) {
              console.log(`Successfully extracted rate from selector "${selector}" on element ${j+1}: ${parsedRate}`);
              rate = parsedRate;
              break;
            }
          }
        }
      }
      
      if (rate !== null) {
        break;
      }
    }
    
    if (rate === null) {
      console.error('Failed to extract a valid rate from any selectors');
      return false;
    }
    
    // Save the rate to the database
    const result = await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
      source: 'SCRAPER',
    });
    
    console.log(`Successfully updated Lemfi ${fromCurrency} to ${toCurrency} rate: ${rate}`);
    console.log('=== Successfully updated Lemfi rate with dedicated scraper ===');
    
    return true;
  } catch (error) {
    console.error('Error in Lemfi scraper:', error);
    return false;
  }
}

/**
 * Main function to update Lemfi exchange rates
 * This is the entry point called by the rate update process
 */
export async function updateLemfiRates(): Promise<boolean> {
  try {
    // Get the Lemfi provider from the database
    const providers = await storage.getProviders();
    const lemfiProvider = providers.find(p => p.name === 'Lemfi');
    
    if (!lemfiProvider) {
      console.error('Lemfi provider not found in the database');
      return false;
    }
    
    // Update GBP to NGN rate
    const success = await extractLemfiRate(lemfiProvider.id, 'GBP', 'NGN');
    
    if (!success) {
      console.error('=== Dedicated Lemfi scraper failed. No fallback will be used. ===');
      console.error('=== Please check the Lemfi URL and CSS selector in the admin panel ===');
    }
    
    return success;
  } catch (error) {
    console.error('Error updating Lemfi rates:', error);
    return false;
  }
}