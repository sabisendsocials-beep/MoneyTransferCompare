/**
 * SendWave scraper targeting the specific span element from the third screenshot
 * This scraper looks for the span with style="{{standard_receive_amount}}"
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Extract SendWave rate using the span element from the third screenshot
 */
export async function extractSendwaveRateFromSpan(): Promise<boolean> {
  try {
    console.log('=== Starting SendWave span element rate extraction ===');
    
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
        
        console.log('Searching for specific span elements from screenshot...');
        
        // TARGET THE SPAN FROM THE THIRD SCREENSHOT
        const spanSelectors = [
          // Exact span from screenshot
          'span[style="{{standard_receive_amount}}"]',
          'span[style*="standard_receive_amount"]',
          'span[style*="receive_amount"]',
          // Broader selectors that might match
          '[data-testid="exchange-rate-text"] span',
          'span:contains("GBP")',
          'span:contains("NGN")',
          // General spans in exchange rate context
          'p[data-testid="exchange-rate-text"] span',
          'div[data-testid*="exchange"] span'
        ];
        
        let foundRate = null;
        
        // Try each span selector
        for (const selector of spanSelectors) {
          console.log(`Trying span selector: "${selector}"`);
          
          const spans = $(selector);
          console.log(`Found ${spans.length} spans matching "${selector}"`);
          
          if (spans.length > 0) {
            spans.each((i, el) => {
              const text = $(el).text().trim();
              console.log(`Span ${i+1} text: "${text}"`);
              
              // Look for a number in the text within the correct range
              const numMatch = text.match(/([0-9,]+\.?\d*)/);
              if (numMatch && numMatch[1]) {
                const rate = parseFloat(numMatch[1].replace(/,/g, ''));
                if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                  console.log(`Found valid rate in span: ${rate}`);
                  foundRate = rate;
                  return false; // Break the each loop
                }
              }
            });
            
            if (foundRate) break;
          }
        }
        
        // If no span had the rate, search for any element containing the standard_receive_amount style attribute
        if (!foundRate) {
          console.log('\nSearching for any element with standard_receive_amount style...');
          
          $('*[style*="standard_receive_amount"]').each((i, el) => {
            const text = $(el).text().trim();
            console.log(`Element with standard_receive_amount style ${i+1} text: "${text}"`);
            
            const numMatch = text.match(/([0-9,]+\.?\d*)/);
            if (numMatch && numMatch[1]) {
              const rate = parseFloat(numMatch[1].replace(/,/g, ''));
              if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                console.log(`Found valid rate: ${rate}`);
                foundRate = rate;
                return false; // Break the each loop
              }
            }
          });
        }
        
        // Look for span elements near NGN text
        if (!foundRate) {
          console.log('\nLooking for spans near NGN text...');
          
          // Find all text containing NGN
          $('*:contains("NGN")').each((i, el) => {
            if (foundRate) return false; // Break if already found
            
            // Get all spans within this element
            const nearbySpans = $(el).find('span');
            if (nearbySpans.length > 0) {
              console.log(`Found ${nearbySpans.length} spans near NGN text`);
              
              nearbySpans.each((j, span) => {
                const text = $(span).text().trim();
                console.log(`Nearby span ${j+1} text: "${text}"`);
                
                const numMatch = text.match(/([0-9,]+\.?\d*)/);
                if (numMatch && numMatch[1]) {
                  const rate = parseFloat(numMatch[1].replace(/,/g, ''));
                  if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                    console.log(`Found valid rate in nearby span: ${rate}`);
                    foundRate = rate;
                    return false; // Break the each loop
                  }
                }
              });
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
    
    console.log('All attempts failed to find a valid SendWave rate');
    return false;
  } catch (error) {
    console.error('Error in SendWave span scraper:', error);
    return false;
  }
}