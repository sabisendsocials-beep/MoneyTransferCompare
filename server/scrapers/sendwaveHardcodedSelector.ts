/**
 * SendWave scraper with very specific element targeting
 * Based on the exact structure observed in the screenshots
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * This scraper attempts to extract rates using very specific selectors
 * from the screenshots
 */
export async function extractSendwaveWithSpecificSelectors(): Promise<boolean> {
  try {
    console.log('=== Starting SendWave specific selector scraping ===');
    
    // Get the SendWave provider
    const providers = await storage.getProviders();
    const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwaveProvider) {
      console.error('SendWave provider not found in database');
      return false;
    }
    
    // Use the scraping URL from the admin panel
    const adminUrl = sendwaveProvider.scraping_url;
    
    if (!adminUrl) {
      console.error('No SendWave scraping URL configured in admin panel');
      return false;
    }
    
    console.log(`Using admin-configured URL: ${adminUrl}`);
    
    // Multiple attempts with increasing delays
    const maxAttempts = 8; // More attempts with longer delays
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delayMs = attempt * 5000; // 5s, 10s, 15s, 20s, 25s, 30s, 35s, 40s
      
      console.log(`\nAttempt ${attempt}/${maxAttempts} with ${delayMs}ms delay...`);
      
      try {
        // Use a longer timeout for fetch operations
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        // Fetch with more detailed browser headers to bypass protections
        const response = await fetch(adminUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'sec-ch-ua': '"Chromium";v="122", "Google Chrome";v="122", "Not(A:Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          console.log(`Error fetching ${adminUrl}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content (${html.length} characters)`);
        
        // Wait with longer delay
        console.log(`Waiting ${delayMs}ms before processing...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Parse with cheerio
        const $ = cheerio.load(html);
        
        console.log('Searching with very specific selectors based on screenshots...');
        
        // COMBINED TARGETED APPROACH
        // Try all specific selectors from the screenshots
        
        // Array to store all potential selectors from the screenshots
        const allSelectors = [
          // From first screenshot
          'h6[data-testid="title-exchange-rate"]',
          '[data-testid="title-exchange-rate"]',
          'h6.MuiTypography-root.MuiTypography-h6[data-testid]',
          
          // From second screenshot
          'input[data-testid="exchange-calculator-receive-price"]',
          'input[aria-label*="exchange"]',
          'input[aria-label*="calculator"]',
          'input[pattern="[0-9]*"]',
          
          // From third screenshot
          'span[style*="standard_receive_amount"]',
          'span[style*="receive_amount"]',
          '[data-testid="exchange-rate-text"] span',
          'p[data-testid="exchange-rate-text"]'
        ];
        
        // Combine with descendant combinations
        const descendants = [
          'span',
          'div',
          'p',
          'h6',
          'input'
        ];
        
        const baseSelectors = [
          '[data-testid*="exchange"]',
          '[data-testid*="calculator"]',
          '[data-testid*="rate"]',
          '[class*="exchange"]',
          '[class*="calculator"]'
        ];
        
        // Add combinations of base + descendant 
        baseSelectors.forEach(base => {
          descendants.forEach(desc => {
            allSelectors.push(`${base} ${desc}`);
          });
        });
        
        // Add common element searches containing currency codes
        allSelectors.push(
          '*:contains("GBP"):contains("NGN")',
          '*:contains("1 GBP")',
          '*:contains("GBP to NGN")',
          'span:contains("NGN")',
          'div:contains("exchange rate")'
        );
        
        let foundRate = null;
        
        // Try each selector
        for (const selector of allSelectors) {
          if (foundRate) break;
          
          console.log(`\nTrying selector: "${selector}"`);
          
          try {
            const elements = $(selector);
            console.log(`Found ${elements.length} elements matching "${selector}"`);
            
            if (elements.length > 0) {
              elements.each((i, el) => {
                if (foundRate) return false; // Break if already found
                
                const $el = $(el);
                
                // Check text content
                const text = $el.text().trim();
                console.log(`Element ${i+1} text: "${text}"`);
                
                // Check value attribute (for inputs)
                let value = '';
                if ($el.is('input')) {
                  value = $el.attr('value') || '';
                  console.log(`Element ${i+1} value: "${value}"`);
                }
                
                // Check for rates in text
                if (text) {
                  // Pattern for "1 GBP = X NGN"
                  const exactPattern = /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i;
                  const exactMatch = text.match(exactPattern);
                  
                  if (exactMatch && exactMatch[1]) {
                    const rate = parseFloat(exactMatch[1].replace(/,/g, ''));
                    if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                      console.log(`Found valid rate in pattern match: ${rate}`);
                      foundRate = rate;
                      return false; // Break the each loop
                    }
                  }
                  
                  // Check for any 4-digit number in a valid range (2000-2300)
                  const numPattern = /([0-9,]+\.?\d*)/g;
                  const numMatches = text.match(numPattern);
                  
                  if (numMatches) {
                    for (const numStr of numMatches) {
                      const rate = parseFloat(numStr.replace(/,/g, ''));
                      if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                        console.log(`Found valid rate in number: ${rate}`);
                        foundRate = rate;
                        return false; // Break the each loop
                      }
                    }
                  }
                }
                
                // Check for rates in value attribute (for inputs)
                if (value) {
                  const numPattern = /([0-9,]+\.?\d*)/g;
                  const numMatches = value.match(numPattern);
                  
                  if (numMatches) {
                    for (const numStr of numMatches) {
                      const rate = parseFloat(numStr.replace(/,/g, ''));
                      if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                        console.log(`Found valid rate in value: ${rate}`);
                        foundRate = rate;
                        return false; // Break the each loop
                      }
                    }
                  }
                }
                
                // Check all children elements
                const children = $el.find('*');
                if (children.length > 0) {
                  children.each((j, child) => {
                    if (foundRate) return false; // Break if already found
                    
                    const childText = $(child).text().trim();
                    
                    // Pattern for "1 GBP = X NGN"
                    const exactPattern = /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i;
                    const exactMatch = childText.match(exactPattern);
                    
                    if (exactMatch && exactMatch[1]) {
                      const rate = parseFloat(exactMatch[1].replace(/,/g, ''));
                      if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                        console.log(`Found valid rate in child element: ${rate}`);
                        foundRate = rate;
                        return false; // Break the each loop
                      }
                    }
                    
                    // Check for any 4-digit number in a valid range
                    const numPattern = /([0-9,]+\.?\d*)/g;
                    const numMatches = childText.match(numPattern);
                    
                    if (numMatches) {
                      for (const numStr of numMatches) {
                        const rate = parseFloat(numStr.replace(/,/g, ''));
                        if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                          console.log(`Found valid rate in child element: ${rate}`);
                          foundRate = rate;
                          return false; // Break the each loop
                        }
                      }
                    }
                  });
                }
              });
            }
          } catch (err) {
            console.log(`Error with selector "${selector}":`, err);
          }
        }
        
        // If we still don't have a rate, try a comprehensive scan of the entire HTML
        if (!foundRate) {
          console.log('\nPerforming comprehensive scan of the entire HTML for valid rates...');
          
          // Just extract all numbers in the entire HTML that might be exchange rates
          const allNumbers = html.match(/(\d{4}(?:\.\d+)?)/g);
          
          if (allNumbers && allNumbers.length > 0) {
            console.log(`Found ${allNumbers.length} potential rate numbers in the entire HTML`);
            
            // Filter to only numbers in the valid exchange rate range
            const validRangeNumbers = allNumbers
              .map(n => parseFloat(n))
              .filter(n => !isNaN(n) && n > 2050 && n < 2250);
            
            if (validRangeNumbers.length > 0) {
              console.log(`Numbers in valid exchange rate range: ${validRangeNumbers.join(', ')}`);
              
              // If multiple potential rates, use the median value
              validRangeNumbers.sort((a, b) => a - b);
              const medianIndex = Math.floor(validRangeNumbers.length / 2);
              foundRate = validRangeNumbers[medianIndex];
              
              console.log(`Using median value as rate: ${foundRate}`);
            }
          }
        }
        
        // If we found a rate, save it
        if (foundRate) {
          await storage.createExchangeRate({
            provider_id: sendwaveProvider.id,
            from_currency: 'GBP',
            to_currency: 'NGN',
            rate: foundRate,
            source: 'SCRAPER'
          });
          
          console.log(`Successfully extracted and saved SendWave rate: ${foundRate}`);
          return true;
        }
        
        console.log(`No valid rate found on attempt ${attempt}`);
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error);
      }
    }
    
    console.log('All attempts failed to find a valid SendWave rate');
    return false;
  } catch (error) {
    console.error('Error in SendWave specific selector scraper:', error);
    return false;
  }
}