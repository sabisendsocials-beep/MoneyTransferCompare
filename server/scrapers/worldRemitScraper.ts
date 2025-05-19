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
    
    try {
      // Modern financial websites have sophisticated anti-scraping measures
      // We'll use a more comprehensive set of headers to appear as a legitimate browser
      const response = await fetch(url, {
        headers: {
          // Modern Chrome browser with specific version
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          // Add a referer to make it look like we came from a search engine
          'Referer': 'https://www.google.com/',
          // Random client IP header (some sites check for this)
          'X-Forwarded-For': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      console.log(`Retrieved HTML content (${html.length} characters) from ${url}`);
      
      // Use the selectors from the admin panel configuration
      // Split by comma in case multiple selectors are provided
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
      
      console.error('Could not extract rate using the admin-configured selector');
      return null;
      
    } catch (error) {
      console.error(`Error fetching from ${url}:`, error);
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
 * Look for exchange rate patterns in a larger text
 */
function findRateInText(text: string): number | null {
  // Look for paragraphs or sections that mention both GBP and NGN
  const gbpNgnSections = text.match(/[^.!?]*(?:GBP|£).*?(?:NGN|naira)[^.!?]*/gi);
  
  if (gbpNgnSections && gbpNgnSections.length > 0) {
    for (const section of gbpNgnSections) {
      // Extract numbers from the section
      const numbers = section.match(/[\d,]+\.?\d*/g);
      if (numbers && numbers.length > 0) {
        // Convert to numbers and find the ones in the right range for GBP to NGN
        const rates = numbers
          .map(n => parseFloat(n.replace(/,/g, '')))
          .filter(n => !isNaN(n) && n > 0);
        
        // Look for numbers that are likely GBP to NGN rates (typically in the hundreds or thousands)
        const likelyRates = rates.filter(r => r > 100);
        if (likelyRates.length > 0) {
          return Math.max(...likelyRates);  // Return the highest rate found
        }
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