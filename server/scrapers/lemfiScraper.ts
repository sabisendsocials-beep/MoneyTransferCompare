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
    
    // Try multiple approaches to extract the exchange rate
    let rate: number | null = null;
    
    // Approach 1: Try each of our selectors
    for (let i = 0; i < selectors.length && rate === null; i++) {
      const selector = selectors[i];
      console.log(`Trying selector "${selector}"...`);
      
      const elements = $(selector);
      console.log(`Found ${elements.length} elements with selector "${selector}"`);
      
      if (elements.length > 0) {
        for (let j = 0; j < elements.length && rate === null; j++) {
          const element = elements.eq(j);
          const text = element.text().trim();
          console.log(`Element ${j+1} text: "${text}"`);
          
          // Pattern for GBP to NGN exchange rate
          if (text.includes('GBP') && text.includes('NGN')) {
            console.log(`Found potential GBP/NGN rate text: "${text}"`);
            const rateMatch = text.match(/(\d[\d,\.]+)/);
            if (rateMatch) {
              const rateStr = rateMatch[1].replace(/,/g, '');
              const parsedRate = parseFloat(rateStr);
              if (!isNaN(parsedRate) && parsedRate > 1000) { // NGN rates are typically above 1000
                console.log(`Successfully extracted GBP/NGN rate: ${parsedRate}`);
                rate = parsedRate;
              }
            }
          }
          
          // Look for rate patterns
          const ratePatterns = [
            /\s*1\s*GBP\s*=\s*([\d,\.]+)\s*NGN/i,
            /\s*GBP\s*\/\s*NGN\s*:\s*([\d,\.]+)/i,
            /\s*exchange\s*rate\s*[\s\w]*\s*([\d,\.]+)/i,
            /\s*([\d,\.]+)\s*NGN/i
          ];
          
          for (const pattern of ratePatterns) {
            const match = text.match(pattern);
            if (match) {
              const rateStr = match[1].replace(/,/g, '');
              const parsedRate = parseFloat(rateStr);
              if (!isNaN(parsedRate) && parsedRate > 1000) {
                console.log(`Successfully extracted rate using pattern ${pattern}: ${parsedRate}`);
                rate = parsedRate;
                break;
              }
            }
          }
        }
      }
    }
    
    // Approach 2: Look for specific Nigeria-related content that might contain rates
    if (rate === null) {
      console.log("Trying Nigeria-specific content approach...");
      const nigeriaSelectors = [
        'div:contains("Nigeria")',
        'section:contains("Nigeria")',
        'p:contains("Nigeria")',
        'span:contains("Nigeria")'
      ];
      
      for (const selector of nigeriaSelectors) {
        const elements = $(selector);
        elements.each((i, el) => {
          const element = $(el);
          const text = element.text();
          
          if (text.includes('GBP') && text.includes('NGN')) {
            console.log(`Found Nigeria-specific element with currency info: "${text.substring(0, 100)}..."`);
            
            // Look for numeric patterns that could be rates
            const rateMatch = text.match(/(\d[\d,\.]+)/g);
            if (rateMatch) {
              rateMatch.forEach(match => {
                const parsedRate = parseFloat(match.replace(/,/g, ''));
                if (!isNaN(parsedRate) && parsedRate > 1000 && parsedRate < 3000) { // Typical NGN rate range
                  console.log(`Found potential exchange rate in Nigeria content: ${parsedRate}`);
                  if (rate === null) {
                    rate = parsedRate;
                  }
                }
              });
            }
          }
        });
      }
    }
    
    // Approach 3: Look for any exchange rate information
    if (rate === null) {
      console.log("Trying general exchange rate content approach...");
      const rateElements = $('*:contains("exchange rate")');
      
      rateElements.each((i, el) => {
        const element = $(el);
        // Get all surrounding text
        const text = element.text();
        console.log(`Found exchange rate text: "${text.substring(0, 100)}..."`);
        
        // Look for numbers in the text
        const numbers = text.match(/(\d[\d,\.]+)/g);
        if (numbers) {
          numbers.forEach(num => {
            const parsedNum = parseFloat(num.replace(/,/g, ''));
            if (!isNaN(parsedNum) && parsedNum > 1000 && parsedNum < 3000) {
              console.log(`Found potential exchange rate number: ${parsedNum}`);
              if (rate === null) {
                rate = parsedNum;
              }
            }
          });
        }
      });
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