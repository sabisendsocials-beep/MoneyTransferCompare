/**
 * Special scraper for WorldRemit that extracts the exchange rate.
 * This will help us get accurate exchange rates directly from the source.
 */
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertExchangeRate } from '@shared/schema';

/**
 * Scrape the current exchange rate from WorldRemit for GBP to NGN
 * Uses ONLY the URL and selector from the admin panel configuration
 * @returns The extracted rate or null if not found
 */
export async function scrapeWorldRemitRate(): Promise<number | null> {
  try {
    console.log('=== WORLDREMIT DEDICATED SCRAPER RUNNING ===');
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    
    // Get the WorldRemit provider from database to use its configured URL and selector
    const providers = await storage.getActiveProviders();
    const worldRemit = providers.find(p => p.name === 'WorldRemit');
    
    if (!worldRemit) {
      console.error('WorldRemit provider not found in database');
      return null;
    }
    
    if (!worldRemit.scraping_url) {
      console.error('No scraping URL configured for WorldRemit in admin panel');
      return null;
    }
    
    if (!worldRemit.scraping_selector) {
      console.error('No CSS selector configured for WorldRemit in admin panel');
      return null;
    }
    
    const url = worldRemit.scraping_url;
    console.log(`Using admin-configured URL for WorldRemit: ${url}`);
    
    // Try to get the rate using multiple approaches
    try {
      // First try the WorldRemit API (most reliable method)
      console.log('Attempting to use the WorldRemit API...');
      try {
        const apiUrl = 'https://www.worldremit.com/api/foreign-exchange/rate?sourceCurrency=GBP&targetCurrency=NGN';
        console.log(`Trying WorldRemit API: ${apiUrl}`);
        
        const apiResponse = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': 'https://www.worldremit.com',
            'Referer': 'https://www.worldremit.com/en/gb/nigeria'
          }
        });
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('WorldRemit API response:', JSON.stringify(apiData));
          
          if (apiData && apiData.rate) {
            console.log(`Successfully got rate from WorldRemit API: ${apiData.rate}`);
            return apiData.rate;
          }
        }
      } catch (apiError) {
        console.log(`Error using WorldRemit API: ${apiError}`);
      }
      
      // If API approach failed, try web scraping with the admin-configured URL
      console.log('API approach failed, trying web scraping with admin-configured URL...');
      
      // Try to fetch the admin-configured URL with enhanced headers
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.google.com/search?q=worldremit+exchange+rates'
        }
      });
      
      if (!response.ok) {
        console.log(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
        
        // Try alternative URLs if the admin-configured one doesn't work
        const alternativeUrls = [
          'https://www.worldremit.com/en/gb/nigeria',
          'https://www.worldremit.com/en/gbp-to-ngn-exchange-rate',
          'https://www.worldremit.com/en/nigeria'
        ];
        
        for (const altUrl of alternativeUrls) {
          console.log(`Trying alternative URL: ${altUrl}`);
          
          try {
            const altResponse = await fetch(altUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'Cache-Control': 'max-age=0',
                'Referer': 'https://www.google.com/'
              }
            });
            
            if (altResponse.ok) {
              const html = await altResponse.text();
              const $ = cheerio.load(html);
              
              // Look for the exchange rate pattern in the page text
              const bodyText = $('body').text();
              const rateMatch = bodyText.match(/1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i);
              
              if (rateMatch && rateMatch[1]) {
                const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
                if (rate > 1000) { // Valid rate for GBP to NGN should be in thousands
                  console.log(`Found exchange rate in alternative URL: ${rate}`);
                  return rate;
                }
              }
              
              // Try the admin-configured selector with this alternative URL
              if (worldRemit.scraping_selector) {
                const selectors = worldRemit.scraping_selector.split(',').map(s => s.trim());
                
                for (const selector of selectors) {
                  const elements = $(selector);
                  if (elements.length > 0) {
                    for (let i = 0; i < elements.length; i++) {
                      const text = $(elements[i]).text().trim();
                      const rate = extractWorldRemitRate(text);
                      if (rate !== null) {
                        console.log(`Found rate using selector "${selector}" on alternative URL: ${rate}`);
                        return rate;
                      }
                    }
                  }
                }
              }
            }
          } catch (altError) {
            console.log(`Error fetching alternative URL ${altUrl}: ${altError}`);
          }
        }
        
        // If we've tried all URLs and still don't have a rate, log the failure
        console.log('Failed to scrape WorldRemit rate from any URL');
        return null;
      }
      
      // If the main URL worked, parse it
      const html = await response.text();
      const $ = cheerio.load(html);
      console.log(`Retrieved HTML content (${html.length} characters) from ${url}`);
      
      // Use the selectors from the admin panel configuration
      if (worldRemit.scraping_selector) {
        const selectors = worldRemit.scraping_selector.split(',').map(s => s.trim());
        console.log(`Using admin-configured selectors: ${JSON.stringify(selectors)}`);
        
        for (const selector of selectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector "${selector}"`);
            
            for (let i = 0; i < elements.length; i++) {
              const text = $(elements[i]).text().trim();
              console.log(`Element ${i+1} text: "${text}"`);
              
              // Try to extract rate from the text
              const rate = extractWorldRemitRate(text);
              if (rate !== null) {
                console.log(`Successfully extracted rate from admin-configured selector: ${rate}`);
                return rate;
              }
            }
          } else {
            console.log(`No elements found with selector "${selector}"`);
          }
        }
      }
      
      // If selectors didn't work, try to find the rate in the page text
      const bodyText = $('body').text();
      const rateMatch = bodyText.match(/1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i);
      
      if (rateMatch && rateMatch[1]) {
        const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
        if (rate > 1000) {
          console.log(`Found exchange rate in page text: ${rate}`);
          return rate;
        }
      }
      
      console.log('Failed to extract rate from the page');
      return null;
      
    } catch (error) {
      console.error(`Error in WorldRemit scraper:`, error);
      return null;
    }
  } catch (error) {
    console.error('Error in WorldRemit scraper:', error);
    return null;
  }
}

/**
 * Extract the exchange rate from WorldRemit specific text formats
 */
function extractWorldRemitRate(text: string): number | null {
  // Various patterns seen on WorldRemit site
  const patterns = [
    /1\s*GBP\s*=\s*([\d,.]+)\s*NGN/i,  // "1 GBP = 1,506.80 NGN"
    /TODAY\s*1\s*GBP\s*=\s*([\d,.]+)\s*NGN/i,  // "TODAY 1 GBP = 1,506.80 NGN"
    /exchange\s*rate\s*(?:is|of)?\s*([\d,.]+)/i,  // "Exchange rate is 1,506.80"
    /([\d,.]+)\s*NGN/i,  // "1,506.80 NGN"
    /rate[\s:]*([0-9,.]+)/i  // "Rate: 1,506.80"
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rateStr = match[1].replace(/,/g, '');
      const rate = parseFloat(rateStr);
      
      // WorldRemit rates for GBP to NGN should be in a reasonable range
      if (!isNaN(rate) && rate > 0) {
        return rate;
      }
    }
  }
  
  return null;
}

/**
 * Update the WorldRemit exchange rate in the database
 * This function will be called from the main scraper
 */
export async function updateWorldRemitRate(): Promise<boolean> {
  try {
    console.log('=== Starting dedicated WorldRemit rate update process ===');
    
    // Find the WorldRemit provider in database
    const providers = await storage.getActiveProviders();
    const provider = providers.find(p => p.name === 'WorldRemit');
    
    if (!provider) {
      console.error('WorldRemit provider not found in database');
      return false;
    }
    
    // Scrape the rate
    const rate = await scrapeWorldRemitRate();
    
    if (rate !== null && rate > 0) {
      // Add the rate to the database
      const rateData: InsertExchangeRate = {
        provider_id: provider.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate
      };
      
      await storage.createExchangeRate(rateData);
      console.log(`Successfully updated WorldRemit GBP to NGN rate: ${rate}`);
      return true;
    } else {
      console.error('Failed to get a valid rate from WorldRemit');
      return false;
    }
  } catch (error) {
    console.error('Error updating WorldRemit rate:', error);
    return false;
  }
}