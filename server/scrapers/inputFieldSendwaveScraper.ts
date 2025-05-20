/**
 * SendWave scraper targeting input field from screenshot
 * This scraper finds the numeric input field that contains the exchange rate
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Extract the SendWave rate by targeting the input field
 */
export async function extractSendwaveRateFromInput(): Promise<boolean> {
  try {
    console.log('=== Starting SendWave input field rate extraction ===');
    
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
    const maxAttempts = 5;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delayMs = attempt * 3000; // 3s, 6s, 9s, 12s, 15s
      
      console.log(`\nAttempt ${attempt}/${maxAttempts} with ${delayMs}ms delay...`);
      
      try {
        // Use a controller to set a reasonable timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        // Fetch with detailed browser-like headers
        const response = await fetch(adminUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Pragma': 'no-cache'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          console.log(`Error fetching ${adminUrl}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content (${html.length} characters)`);
        
        // Wait with increasing delay
        console.log(`Waiting ${delayMs}ms before processing...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Parse with cheerio
        const $ = cheerio.load(html);
        
        console.log('Looking for input fields that might contain the exchange rate...');
        
        // TARGET THE INPUT FIELD FROM THE SECOND SCREENSHOT
        const inputSelectors = [
          // Exact input field from screenshot
          'input[data-testid="exchange-calculator-receive-price"]',
          'input[type="text"][value^="2"]',
          'input[type="numeric"][value^="2"]',
          'input[inputmode="numeric"]',
          'input[pattern="[0-9]*"]',
          'input[value][data-testid]',
          'input[aria-label*="exchange"]',
          'input[aria-label*="calculator"]',
          'input[aria-label*="price"]',
          // General input selectors that might have the value
          'input[type="text"]',
          'input[type="number"]',
          'input.MuiInputBase-input'
        ];
        
        let foundRate = null;
        
        // Try each input selector
        for (const selector of inputSelectors) {
          console.log(`Trying input selector: "${selector}"`);
          
          const inputs = $(selector);
          console.log(`Found ${inputs.length} inputs matching "${selector}"`);
          
          if (inputs.length > 0) {
            inputs.each((i, el) => {
              // Check the value attribute
              const value = $(el).attr('value');
              const placeholder = $(el).attr('placeholder');
              const dataValue = $(el).data('value');
              const ariaLabel = $(el).attr('aria-label');
              
              console.log(`Input ${i+1}:`);
              if (value) console.log(`  Value: "${value}"`);
              if (placeholder) console.log(`  Placeholder: "${placeholder}"`);
              if (dataValue) console.log(`  Data-value: "${dataValue}"`);
              if (ariaLabel) console.log(`  Aria-label: "${ariaLabel}"`);
              
              // Check for value in the correct range
              [value, placeholder, dataValue].forEach(attr => {
                if (attr && !foundRate) {
                  const numMatch = attr.match(/([0-9,]+\.?\d*)/);
                  if (numMatch && numMatch[1]) {
                    const rate = parseFloat(numMatch[1].replace(/,/g, ''));
                    if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                      console.log(`Found valid rate in input: ${rate}`);
                      foundRate = rate;
                      return false; // Break the each loop
                    }
                  }
                }
              });
              
              if (foundRate) return false; // Break the each loop
            });
            
            if (foundRate) break;
          }
        }
        
        // If no input field had the rate, look for data-testid attributes
        if (!foundRate) {
          console.log('\nLooking for elements with data-testid attributes...');
          
          const testIdElements = $('[data-testid]');
          console.log(`Found ${testIdElements.length} elements with data-testid attributes`);
          
          testIdElements.each((i, el) => {
            const testId = $(el).attr('data-testid');
            const text = $(el).text().trim();
            const value = $(el).attr('value');
            
            console.log(`Element with data-testid="${testId}":`);
            if (text) console.log(`  Text: "${text}"`);
            if (value) console.log(`  Value: "${value}"`);
            
            // Check for rate in any attribute or text
            if (text && !foundRate) {
              const numMatch = text.match(/([0-9,]+\.?\d*)/);
              if (numMatch && numMatch[1]) {
                const rate = parseFloat(numMatch[1].replace(/,/g, ''));
                if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                  console.log(`Found valid rate in text: ${rate}`);
                  foundRate = rate;
                  return false; // Break the each loop
                }
              }
            }
            
            if (value && !foundRate) {
              const numMatch = value.match(/([0-9,]+\.?\d*)/);
              if (numMatch && numMatch[1]) {
                const rate = parseFloat(numMatch[1].replace(/,/g, ''));
                if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                  console.log(`Found valid rate in value: ${rate}`);
                  foundRate = rate;
                  return false; // Break the each loop
                }
              }
            }
          });
        }
        
        // Look for element with ID containing "receive" or "calculator"
        if (!foundRate) {
          console.log('\nLooking for elements with IDs related to calculations...');
          
          $('[id*="receive"], [id*="calculator"], [id*="convert"], [id*="amount"]').each((i, el) => {
            const id = $(el).attr('id');
            const text = $(el).text().trim();
            const value = $(el).attr('value');
            
            console.log(`Element with id containing calculator terms (${id}):`);
            if (text) console.log(`  Text: "${text}"`);
            if (value) console.log(`  Value: "${value}"`);
            
            // Check for text containing a valid rate
            if (text && !foundRate) {
              const numMatch = text.match(/([0-9,]+\.?\d*)/);
              if (numMatch && numMatch[1]) {
                const rate = parseFloat(numMatch[1].replace(/,/g, ''));
                if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                  console.log(`Found valid rate in text: ${rate}`);
                  foundRate = rate;
                  return false; // Break the each loop
                }
              }
            }
            
            if (value && !foundRate) {
              const numMatch = value.match(/([0-9,]+\.?\d*)/);
              if (numMatch && numMatch[1]) {
                const rate = parseFloat(numMatch[1].replace(/,/g, ''));
                if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                  console.log(`Found valid rate in value: ${rate}`);
                  foundRate = rate;
                  return false; // Break the each loop
                }
              }
            }
          });
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
    
    console.log('All attempts failed to find a valid SendWave rate from input fields');
    return false;
  } catch (error) {
    console.error('Error in SendWave input field scraper:', error);
    return false;
  }
}