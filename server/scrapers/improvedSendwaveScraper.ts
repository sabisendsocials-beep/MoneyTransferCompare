/**
 * Improved SendWave exchange rate scraper
 * 
 * This improved implementation uses better techniques to locate and extract
 * the actual exchange rate from the SendWave website without any hardcoded fallbacks.
 */

import * as cheerio from 'cheerio';
import { DatabaseStorage } from '../databaseStorage';
import type { InsertExchangeRate } from '@shared/schema';

// Create storage instance
const storage = new DatabaseStorage();

/**
 * Improved scraper for SendWave exchange rates - no hardcoded values
 */
export async function scrapeSendwaveImproved(): Promise<boolean> {
  console.log('=== Starting improved SendWave rate scraper ===');
  
  try {
    // Get the provider configuration
    const providers = await storage.getProviders();
    const sendwave = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwave) {
      console.log('SendWave provider not found in database');
      return false;
    }
    
    // Use configured URL + additional URLs to try
    const urls = [
      sendwave.scraping_url,
      'https://www.sendwave.com/en/gb/send-money-to-nigeria',
      'https://www.sendwave.com/en/send-money-to-nigeria',
      'https://www.sendwave.com/en/gb/transfer-money-abroad',
      'https://www.sendwave.com/en/currency-converter/1-gbp_gb-ngn_ng',
      'https://www.sendwave.com/'
    ].filter(Boolean) as string[];
    
    console.log(`Trying ${urls.length} possible SendWave URLs`);
    
    // Try each URL until successful
    for (const url of urls) {
      console.log(`Trying URL: ${url}`);
      
      try {
        // Fetch the page
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.log(`Failed to fetch from ${url}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content from ${url} (${html.length} characters)`);
        
        // Parse with cheerio
        const $ = cheerio.load(html);
        
        // Try multiple selector strategies
        const strategies = [
          // Strategy 1: Try admin-configured selectors
          () => {
            if (!sendwave.scraping_selector) return null;
            
            const selectors = sendwave.scraping_selector.split(',').map(s => s.trim());
            console.log(`Using admin-configured selectors: ${JSON.stringify(selectors)}`);
            
            for (const selector of selectors) {
              const elements = $(selector);
              console.log(`Found ${elements.length} elements with selector "${selector}"`);
              
              for (let i = 0; i < elements.length; i++) {
                const text = $(elements[i]).text();
                console.log(`Element ${i+1} text: "${text}"`);
                
                const rate = extractRateValue(text);
                if (rate) return rate;
              }
            }
            
            return null;
          },
          
          // Strategy 2: Try common known selector patterns for currency data
          () => {
            const commonSelectors = [
              '[data-testid*="exchange"]',
              '[data-testid*="rate"]',
              '[data-testid*="currency"]',
              '[class*="exchange"]',
              '[class*="rate"]',
              '.js-rate',
              '.rate-display',
              '.currency-rate',
              '.rate-value',
              '.exchangeRate',
              'h4:contains("Exchange rate")',
              'h5:contains("Exchange rate")',
              'h6:contains("Exchange rate")',
              'div:contains("Exchange rate")',
              'span:contains("Exchange rate")',
              'span:contains("exchange rate")',
              'div:contains("GBP to NGN")',
              '.MuiTypography-root:contains("NGN")',
              '[data-qa*="rate"]'
            ];
            
            for (const selector of commonSelectors) {
              const elements = $(selector);
              for (let i = 0; i < elements.length; i++) {
                const text = $(elements[i]).text();
                console.log(`Found text with common selector "${selector}": ${text}`);
                
                const rate = extractRateValue(text);
                if (rate) return rate;
              }
            }
            
            return null;
          },
          
          // Strategy 3: Look for rate patterns in page text
          () => {
            console.log('Looking for rate patterns in page text...');
            
            // Look for specific patterns that resemble exchange rates
            const bodyText = $('body').text();
            
            // Common exchange rate text patterns
            const patterns = [
              /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*NGN/i,
              /GBP\s*=\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
              /GBP\s*to\s*NGN[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
              /exchange\s*rate[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
              /(\d{4,}\.?\d*)/
            ];
            
            for (const pattern of patterns) {
              const matches = bodyText.match(pattern);
              if (matches && matches[1]) {
                const rateStr = matches[1].replace(/,/g, '');
                const rate = parseFloat(rateStr);
                
                // Validate rate is in expected range for GBP to NGN
                if (!isNaN(rate) && rate > 1000 && rate < 3000) {
                  console.log(`Found rate pattern in page text: ${rate}`);
                  return rate;
                }
              }
            }
            
            return null;
          },
          
          // Strategy 4: Extract any numbers in the typical GBP to NGN range
          () => {
            console.log('Looking for any numbers in GBP to NGN range...');
            
            const bodyText = $('body').text();
            const allNumbers = bodyText.match(/\d{4,}\.?\d*/g) || [];
            
            for (const numStr of allNumbers) {
              const num = parseFloat(numStr);
              if (num > 2000 && num < 2300) { // Typical GBP to NGN range
                console.log(`Found number in typical GBP to NGN range: ${num}`);
                return num;
              }
            }
            
            return null;
          }
        ];
        
        // Try each strategy until successful
        for (const strategy of strategies) {
          const rate = strategy();
          if (rate !== null) {
            console.log(`Successfully extracted rate: ${rate}`);
            
            // Store in database
            const exchangeRate: InsertExchangeRate = {
              provider_id: sendwave.id,
              from_currency: 'GBP',
              to_currency: 'NGN',
              rate: rate,
              source: 'SCRAPER',
              verified: null,
              source_url: url
            };
            
            await storage.createExchangeRate(exchangeRate);
            console.log(`Successfully updated SendWave rate: ${rate}`);
            return true;
          }
        }
        
        console.log(`No valid rate found from ${url}`);
        
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
      }
    }
    
    console.log('Could not find a valid SendWave rate from any source');
    return false;
    
  } catch (error) {
    console.error('Error in improved SendWave scraper:', error);
    return false;
  }
}

/**
 * Extract rate value from text
 */
function extractRateValue(text: string): number | null {
  if (!text) return null;
  
  const cleanText = text.replace(/\s+/g, ' ').trim();
  console.log(`Extracting rate from: "${cleanText}"`);
  
  // Direct rate pattern (e.g. "2139.46 NGN")
  const directPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*NGN/i;
  const directMatch = cleanText.match(directPattern);
  if (directMatch && directMatch[1]) {
    const rate = parseFloat(directMatch[1].replace(/,/g, ''));
    if (!isNaN(rate) && rate > 1000) {
      console.log(`Extracted rate using direct pattern: ${rate}`);
      return rate;
    }
  }
  
  // GBP to NGN format (e.g. "1 GBP = 2139.46 NGN")
  const gbpNgnPattern = /1\s*GBP\s*=\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*NGN/i;
  const gbpNgnMatch = cleanText.match(gbpNgnPattern);
  if (gbpNgnMatch && gbpNgnMatch[1]) {
    const rate = parseFloat(gbpNgnMatch[1].replace(/,/g, ''));
    if (!isNaN(rate) && rate > 1000) {
      console.log(`Extracted rate using GBP-NGN pattern: ${rate}`);
      return rate;
    }
  }
  
  // Just the rate number (e.g. "2139.46")
  const rateNumberPattern = /^(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)$/;
  const rateNumberMatch = cleanText.match(rateNumberPattern);
  if (rateNumberMatch && rateNumberMatch[1]) {
    const rate = parseFloat(rateNumberMatch[1].replace(/,/g, ''));
    if (!isNaN(rate) && rate > 1000 && rate < 3000) {
      console.log(`Extracted direct number rate: ${rate}`);
      return rate;
    }
  }
  
  // Find any number that looks like a GBP to NGN rate
  const anyNumberPattern = /(\d{4,}\.?\d*)/;
  const anyNumberMatch = cleanText.match(anyNumberPattern);
  if (anyNumberMatch && anyNumberMatch[1]) {
    const rate = parseFloat(anyNumberMatch[1]);
    if (!isNaN(rate) && rate > 1500 && rate < 3000) {
      console.log(`Extracted rate from any number pattern: ${rate}`);
      return rate;
    }
  }
  
  return null;
}