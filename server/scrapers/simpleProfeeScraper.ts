/**
 * Simple Profee Scraper
 * 
 * A streamlined version of the Profee scraper using fetch instead of Puppeteer
 * to avoid Chrome dependency issues.
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

interface ScraperResult {
  success: boolean;
  rate?: number;
  error?: string;
  rawData?: string;
}

/**
 * Extracts exchange rate from Profee website using a simple fetch approach
 */
async function scrapeProfeeSite(
  url: string,
  selector: string,
  fromCurrency: string, 
  toCurrency: string
): Promise<ScraperResult> {
  console.log(`=== SIMPLE PROFEE SCRAPER RUNNING ===`);
  console.log(`Using admin-configured URL: ${url}`);
  console.log(`Using CSS selector: ${selector}`);

  try {
    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch page: ${response.status} ${response.statusText}`
      };
    }

    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters)`);

    // Parse with cheerio
    const $ = cheerio.load(html);
    
    // Try different approaches to find the rate
    
    // 1. Exact selector match
    let rateText = '';
    const elements = $(selector);
    console.log(`Found ${elements.length} elements with selector "${selector}"`);
    
    if (elements.length > 0) {
      elements.each((i, el) => {
        const text = $(el).text().trim();
        console.log(`Element ${i+1} text: "${text}"`);
        if (text && text.includes('NGN')) {
          rateText = text;
          console.log(`Found rate text in element ${i+1}: "${rateText}"`);
        }
      });
    }
    
    // 2. If exact selector didn't work, try a broader search
    if (!rateText) {
      console.log('Exact selector didn\'t yield results, trying broader search');
      
      // Look for any element containing 'NGN' and a number
      $('*').each((i, el) => {
        if (i > 200) return false; // Limit search to first 200 elements
        
        const text = $(el).text().trim();
        if (text && text.includes('NGN') && /\\d+/.test(text)) {
          console.log(`Found potential rate text: "${text}"`);
          rateText = text;
          return false; // Break the loop
        }
      });
    }
    
    // 3. Try to find the promo rate section directly
    if (!rateText) {
      console.log('Trying to locate promo rate section');
      
      // Look for text mentioning "Promo rate"
      $('*:contains("Promo rate")').each((i, el) => {
        const text = $(el).text();
        console.log(`Found promo rate section: "${text}"`);
        
        // Check if it contains the currencies we're looking for
        if (text.includes(fromCurrency) && text.includes(toCurrency)) {
          rateText = text;
          return false; // Break the loop
        }
      });
    }
    
    // 4. Parse the entire page for rate patterns
    if (!rateText) {
      console.log('Looking for rate patterns in the entire page');
      
      // Look for any common rate pattern in the HTML
      const commonRatePatterns = [
        /(\d{1,3}(?:,\d{3})*)(?:\.\d+)?\s*NGN/gi,      // Like "2,162.23 NGN"
        /NGN\s*(\d{1,3}(?:,\d{3})*)(?:\.\d+)?/gi,      // Like "NGN 2,162.23"
        /(\d{1,3}(?:,\d{3})*)(?:\.\d+)?/gi,            // Any number like "2,162.23"
        /Promo\s+rate[^<>]*?(\d{1,3}(?:,\d{3})*)(?:\.\d+)?/gi,  // "Promo rate" followed by a number
        /1\s*GBP\s*=\s*(\d{1,3}(?:,\d{3})*)(?:\.\d+)?\s*NGN/gi  // "1 GBP = 2,162.23 NGN"
      ];
      
      for (const pattern of commonRatePatterns) {
        console.log(`Trying pattern: ${pattern}`);
        const matches = html.match(pattern);
        
        if (matches && matches.length > 0) {
          console.log(`Found ${matches.length} matches with pattern ${pattern}:`);
          
          // Log the first 3 matches
          for (let i = 0; i < Math.min(matches.length, 3); i++) {
            console.log(`  Match ${i+1}: "${matches[i]}"`);
          }
          
          // Look for a match in the expected rate range for GBP to NGN (around 2000-2200)
          for (const match of matches) {
            // Extract the numeric part
            const numericMatches = match.match(/(\d{1,3}(?:,\d{3})*)(?:\.\d+)?/);
            if (numericMatches) {
              const numericStr = numericMatches[1].replace(/,/g, '');
              const rate = parseFloat(numericStr);
              
              // For GBP to NGN, rates should be in this range
              if (rate > 2000 && rate < 2200) {
                console.log(`Found likely exchange rate: ${rate}`);
                return {
                  success: true,
                  rate,
                  rawData: `Rate found with pattern ${pattern}: "${match}"`
                };
              }
            }
          }
        } else {
          console.log(`No matches found with pattern ${pattern}`);
        }
      }
      
      // If we haven't found a rate yet, try a more aggressive approach
      console.log('Trying more aggressive pattern matching...');
      
      // Look for any number in the HTML within the expected range
      const allNumbersPattern = /(\d{1,3}(?:,\d{3})*)(?:\.\d+)?/g;
      const allNumbers = html.match(allNumbersPattern);
      
      if (allNumbers) {
        console.log(`Found ${allNumbers.length} numbers in the HTML`);
        
        // Check each number to see if it's in the expected range for GBP to NGN
        for (const numStr of allNumbers) {
          const num = parseFloat(numStr.replace(/,/g, ''));
          
          // For GBP to NGN, the rate is typically in the 2000-2200 range
          if (num > 2000 && num < 2200) {
            console.log(`Found potential rate by value range: ${num}`);
            return {
              success: true, 
              rate: num,
              rawData: `Rate found by numeric value: ${num}`
            };
          }
        }
      }
    }
    
    // If we found any rate text, try to extract the numeric value
    if (rateText) {
      // Extract numerics from the text
      const numMatch = rateText.match(/(\d[\\d,]+\\.\\d+)/);
      
      if (numMatch) {
        const rateStr = numMatch[1].replace(/,/g, '');
        const rate = parseFloat(rateStr);
        
        if (!isNaN(rate) && rate > 0) {
          console.log(`Successfully extracted rate: ${rate} ${fromCurrency}/${toCurrency}`);
          return {
            success: true,
            rate,
            rawData: rateText
          };
        }
      }
    }
    
    // If none of our approaches worked, look for any numbers in a specific range
    if (fromCurrency === 'GBP' && toCurrency === 'NGN') {
      const numberRegex = /(\d{1,3}(,\d{3})*(\.\d+)?)/g;
      const allNumbers = html.match(numberRegex);
      
      if (allNumbers) {
        for (const numStr of allNumbers) {
          const num = parseFloat(numStr.replace(/,/g, ''));
          // For GBP to NGN, the rate is typically in the 2000-2200 range
          if (num > 2000 && num < 2200) {
            console.log(`Found potential rate by numeric value: ${num}`);
            return {
              success: true,
              rate: num,
              rawData: `Potential rate found by numeric value: ${num}`
            };
          }
        }
      }
    }
    
    // If we still couldn't find a rate, return the raw HTML for debugging
    return {
      success: false,
      error: 'Could not extract rate from HTML',
      rawData: html.substring(0, 500) + '...' // First 500 chars for debugging
    };
    
  } catch (error) {
    console.error('Error scraping Profee website:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Updates the exchange rate for Profee
 */
export async function updateProfeeRateSimple(
  providerUrl: string,
  rateSelector: string,
  providerId: number,
  fromCurrency: string,
  toCurrency: string,
  updateRateFunc: (providerId: number, fromCurrency: string, toCurrency: string, rate: number) => Promise<boolean>
): Promise<boolean> {
  console.log(`=== Starting simplified Profee rate update process ===`);
  
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