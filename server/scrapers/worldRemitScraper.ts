/**
 * Special scraper for WorldRemit that extracts the exchange rate.
 * This will help us get accurate exchange rates directly from the source.
 */
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertExchangeRate } from '@shared/schema';

/**
 * Scrape the current exchange rate from WorldRemit for GBP to NGN
 * Implements multiple strategies to get the most accurate rate
 * @returns The extracted rate or null if not found
 */
export async function scrapeWorldRemitRate(): Promise<number | null> {
  try {
    console.log('=== WORLDREMIT DEDICATED SCRAPER RUNNING ===');
    console.log('This scraper will try multiple approaches to get the WorldRemit rate:');
    console.log('1. Try the direct URL for GBP to NGN rates');
    console.log('2. Try to parse the HTML page for rate information');
    console.log('3. Look for common rate patterns in the page');
    
    const urls = [
      'https://www.worldremit.com/en/gbp-to-ngn-exchange-rate',
      'https://www.worldremit.com/en/united-kingdom/nigeria',
      'https://www.worldremit.com/en/currency-converter'
    ];
    
    // Try each URL
    for (const url of urls) {
      console.log(`Trying to fetch WorldRemit rate from ${url}...`);
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.log(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        console.log(`Retrieved HTML content (${html.length} characters) from ${url}`);
        
        // Try specific selectors for WorldRemit
        const selectors = [
          '[data-testid="rateValue"]',
          '.exchange-rate-value',
          '.exchange-rate',
          'span.font-bold',
          'h1',
          'h2'
        ];
        
        for (const selector of selectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            for (let i = 0; i < elements.length; i++) {
              const text = $(elements[i]).text().trim();
              console.log(`Found text with selector "${selector}": "${text}"`);
              
              // Try to extract rate from the text
              const rate = extractWorldRemitRate(text);
              if (rate !== null) {
                console.log(`Found valid WorldRemit rate: ${rate}`);
                return rate;
              }
            }
          }
        }
        
        // If selectors didn't work, try to find any text mentioning exchange rates
        const bodyText = $('body').text();
        const rate = findRateInText(bodyText);
        if (rate !== null) {
          console.log(`Found WorldRemit rate in body text: ${rate}`);
          return rate;
        }
      } catch (error) {
        console.error(`Error fetching from ${url}:`, error);
      }
    }
    
    console.log('Failed to find a valid WorldRemit rate');
    return null;
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