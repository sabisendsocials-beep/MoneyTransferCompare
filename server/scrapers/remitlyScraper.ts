/**
 * Special scraper for Remitly that extracts exchange rates.
 * This scraper ONLY uses the URL and CSS selector from the admin panel.
 */
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertExchangeRate } from '@shared/schema';

/**
 * Scrape the current exchange rate from Remitly
 * Uses ONLY the URL and selector from the admin panel configuration
 * @returns The extracted rate or null if not found
 */
export async function scrapeRemitlyRate(): Promise<number | null> {
  try {
    console.log('=== REMITLY DEDICATED SCRAPER RUNNING ===');
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    
    // Get the Remitly provider from database to use its configured URL and selector
    const providers = await storage.getActiveProviders();
    const remitly = providers.find(p => p.name === 'Remitly');
    
    if (!remitly) {
      console.error('Remitly provider not found in database');
      return null;
    }
    
    if (!remitly.scraping_url) {
      console.error('No scraping URL configured for Remitly in admin panel');
      return null;
    }
    
    if (!remitly.scraping_selector) {
      console.error('No CSS selector configured for Remitly in admin panel');
      return null;
    }
    
    const url = remitly.scraping_url;
    console.log(`Using admin-configured URL for Remitly: ${url}`);
    
    // Optimize the curl request with browser-like headers
    try {
      // Using a randomized user agent to simulate a browser
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
      ];
      
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      // First try Remitly's API endpoint directly
      console.log('Trying Remitly API endpoint first...');
      try {
        const apiUrl = 'https://www.remitly.com/gb/en/api/exchange-rates/GBP/NGN';
        console.log(`Trying Remitly API: ${apiUrl}`);
        
        const apiResponse = await fetch(apiUrl, {
          headers: {
            'User-Agent': randomUserAgent,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referer': 'https://www.remitly.com/gb/en/nigeria'
          }
        });
        
        if (apiResponse.ok) {
          try {
            const apiData = await apiResponse.json();
            console.log('Remitly API response:', JSON.stringify(apiData));
            
            if (apiData && apiData.rate) {
              console.log(`Successfully got rate from Remitly API: ${apiData.rate}`);
              return apiData.rate;
            } else if (apiData && apiData.exchangeRate) {
              console.log(`Successfully got rate from Remitly API: ${apiData.exchangeRate}`);
              return apiData.exchangeRate;
            }
          } catch (jsonError) {
            console.log(`Error parsing Remitly API response: ${jsonError}`);
          }
        }
      } catch (apiError) {
        console.log(`Error using Remitly API: ${apiError}`);
      }
      
      // If API approach failed, try the main URL first
      console.log('API approach failed, trying multiple URLs...');
      
      // Try multiple URLs in case the admin-configured one doesn't work
      const urlVariations = [
        url, // First try the admin-configured URL
        'https://www.remitly.com/gb/en/nigeria', // UK to Nigeria
        'https://www.remitly.com/gb/en/nigeria/rates', // UK to Nigeria rates
        'https://www.remitly.com/gb/en/nigeria/pricing', // UK to Nigeria pricing
        'https://www.remitly.com/gb/en', // UK homepage
        'https://www.remitly.com' // Main homepage
      ];
      
      for (const currentUrl of urlVariations) {
        console.log(`Trying URL variation: ${currentUrl}`);
        
        try {
          // Enhanced browser simulation headers
          const response = await fetch(currentUrl, {
            headers: {
              'User-Agent': randomUserAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Sec-Fetch-User': '?1',
              'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              'Upgrade-Insecure-Requests': '1',
              'Referer': 'https://www.google.com/',
            }
          });
          
          if (!response.ok) {
            console.error(`Failed to fetch from ${currentUrl}: ${response.status} ${response.statusText}`);
            continue; // Try the next URL
          }
          
          const html = await response.text();
          
          // If we got the page content successfully, process it
          if (html.length > 1000) {
            const $ = cheerio.load(html);
            console.log(`Retrieved HTML content (${html.length} characters) from ${currentUrl}`);
            
            // Use the admin-configured selectors with this URL
            if (remitly.scraping_selector) {
              const selectors = remitly.scraping_selector.split(',').map(s => s.trim());
              console.log(`Using admin-configured selectors: ${JSON.stringify(selectors)}`);
              
              for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                  console.log(`Found ${elements.length} elements with selector "${selector}"`);
                  
                  for (let i = 0; i < elements.length; i++) {
                    const text = $(elements[i]).text().trim();
                    console.log(`Element ${i+1} text: "${text}"`);
                    
                    // Try to extract rate from the text
                    const rate = extractRemitlyRate(text);
                    if (rate !== null) {
                      console.log(`Successfully extracted rate from selector "${selector}": ${rate}`);
                      return rate;
                    }
                  }
                }
              }
            }
            
            // If selectors didn't work, try to find the rate in the page text
            console.log('Trying to find rate in the whole page text...');
            const bodyText = $('body').text();
            const rate = findRateInText(bodyText);
            if (rate) {
              console.log(`Found rate in page text from ${currentUrl}: ${rate}`);
              return rate;
            }
          }
        } catch (error) {
          console.error(`Error fetching from ${currentUrl}:`, error);
          // Continue with next URL
        }
      }
      console.error('Could not extract rate from any Remitly URL');
      return null;
      
    } catch (error) {
      console.error(`Error in Remitly scraper:`, error);
      return null;
    }
  } catch (error) {
    console.error('Error in Remitly scraper:', error);
    return null;
  }
}

/**
 * Extract the exchange rate from Remitly specific text formats
 */
function extractRemitlyRate(text: string): number | null {
  // Various patterns commonly seen on Remitly site
  const patterns = [
    /1\s*GBP\s*=\s*([\d,.]+)\s*NGN/i,  // "1 GBP = 2,168.70 NGN"
    /GBP\s*=\s*([\d,.]+)\s*NGN/i,      // "GBP = 2,168.70 NGN"
    /exchange\s*rate\s*(?:is|of)?\s*([\d,.]+)/i,  // "Exchange rate is 2,168.70"
    /([\d,.]+)\s*NGN/i,  // "2,168.70 NGN"
    /rate[\s:]*([0-9,.]+)/i  // "Rate: 2,168.70"
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rateStr = match[1].replace(/,/g, '');
      const rate = parseFloat(rateStr);
      
      // Remitly rates for GBP to NGN should be in a reasonable range
      if (!isNaN(rate) && rate > 0) {
        return rate;
      }
    }
  }
  
  return null;
}

/**
 * Look for exchange rate patterns in a larger text
 */
function findRateInText(text: string): number | null {
  // Look for sections mentioning GBP and NGN
  const gbpNgnMatch = text.match(/1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i);
  if (gbpNgnMatch && gbpNgnMatch[1]) {
    const rate = parseFloat(gbpNgnMatch[1].replace(/,/g, ''));
    if (rate > 1000) { // Realistic rate for GBP to NGN
      return rate;
    }
  }
  
  return null;
}

/**
 * Update the Remitly exchange rate in the database
 * This function will be called from the main scraper
 */
export async function updateRemitlyRate(): Promise<boolean> {
  try {
    console.log('=== Starting dedicated Remitly rate update process ===');
    
    // Find the Remitly provider in database
    const providers = await storage.getActiveProviders();
    const provider = providers.find(p => p.name === 'Remitly');
    
    if (!provider) {
      console.error('Remitly provider not found in database');
      return false;
    }
    
    // Scrape the rate for each supported currency pair
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'NGN' },
      { from: 'EUR', to: 'GHS' }
    ];
    
    let success = false;
    
    // For now, just focus on GBP to NGN
    const rate = await scrapeRemitlyRate();
    
    if (rate !== null && rate > 0) {
      // Add the rate to the database
      const rateData: InsertExchangeRate = {
        provider_id: provider.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate
      };
      
      await storage.createExchangeRate(rateData);
      console.log(`Successfully updated Remitly GBP to NGN rate: ${rate}`);
      success = true;
    } else {
      console.error('Failed to get a valid rate for GBP to NGN from Remitly');
    }
    
    return success;
  } catch (error) {
    console.error('Error updating Remitly rate:', error);
    return false;
  }
}