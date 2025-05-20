/**
 * SendWave scraper based on screenshot analysis
 * This scraper uses the exact HTML structure seen in the screenshots
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Extract the SendWave rate based on screenshot analysis
 */
export async function extractSendwaveRateFromScreenshot(): Promise<boolean> {
  try {
    console.log('=== Starting SendWave rate extraction based on screenshot analysis ===');
    
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
    
    // Multiple attempts with different delays
    const maxAttempts = 5;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delayMs = attempt * 3000; // 3s, 6s, 9s, 12s, 15s
      
      console.log(`\nAttempt ${attempt}/${maxAttempts} with ${delayMs}ms delay...`);
      
      try {
        // Fetch the page
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(adminUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          console.log(`Error fetching ${adminUrl}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content (${html.length} characters)`);
        
        // Wait to allow any JS to execute on client side
        console.log(`Waiting ${delayMs}ms before processing...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Parse the content with cheerio
        const $ = cheerio.load(html);
        
        // Based on the screenshot, try these specific selectors
        const selectors = [
          // Exact selector from screenshot
          'h6[data-testid="title-exchange-rate"]',
          // More general selectors that might match
          '[data-testid="title-exchange-rate"]',
          '[data-testid*="exchange-rate"]',
          // Broader selectors based on class names in screenshot
          'h6.MuiTypography-root.MuiTypography-h6',
          // Content-based selectors
          'h6:contains("GBP")',
          'h6:contains("NGN")'
        ];
        
        let rate = null;
        
        // Try each selector
        for (const selector of selectors) {
          console.log(`\nTrying selector: "${selector}"`);
          
          const elements = $(selector);
          console.log(`Found ${elements.length} elements matching this selector`);
          
          if (elements.length === 0) continue;
          
          elements.each((i, el) => {
            const text = $(el).text().trim();
            console.log(`Element ${i+1} text: "${text}"`);
            
            // Pattern based on screenshot: "1 GBP = 2143.06 NGN"
            const exactPattern = /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i;
            const match = text.match(exactPattern);
            
            if (match && match[1]) {
              const foundRate = parseFloat(match[1].replace(/,/g, ''));
              if (!isNaN(foundRate) && foundRate > 2000 && foundRate < 2300) {
                console.log(`Found valid rate: ${foundRate}`);
                rate = foundRate;
                return false; // Break the each loop
              }
            }
            
            // Fallback pattern for numbers in the correct range
            if (!rate) {
              const numberPattern = /([0-9,]+\.?\d*)/g;
              const numbers = text.match(numberPattern);
              
              if (numbers) {
                for (const num of numbers) {
                  const foundRate = parseFloat(num.replace(/,/g, ''));
                  if (!isNaN(foundRate) && foundRate > 2000 && foundRate < 2300) {
                    console.log(`Found valid numeric rate: ${foundRate}`);
                    rate = foundRate;
                    return false; // Break the each loop
                  }
                }
              }
            }
          });
          
          if (rate) break;
        }
        
        // If no specific rate found, try looking at all content with "GBP" and "NGN"
        if (!rate) {
          console.log('\nTrying content-based search for GBP and NGN...');
          
          $('*').each((i, el) => {
            if (rate) return false; // Break if we already found a rate
            
            const text = $(el).text().trim();
            
            // Skip empty or very long content
            if (!text || text.length > 200) return;
            
            // Look for content with both GBP and NGN
            if (text.includes('GBP') && text.includes('NGN')) {
              console.log(`Found potential element: "${text}"`);
              
              // Try to extract a rate
              const exactPattern = /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i;
              const match = text.match(exactPattern);
              
              if (match && match[1]) {
                const foundRate = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(foundRate) && foundRate > 2000 && foundRate < 2300) {
                  console.log(`Found valid rate: ${foundRate}`);
                  rate = foundRate;
                  return false; // Break the each loop
                }
              }
              
              // If no exact match, try any number in the valid range
              if (!rate) {
                const numbers = text.match(/([0-9,]+\.?\d*)/g);
                if (numbers) {
                  for (const num of numbers) {
                    const foundRate = parseFloat(num.replace(/,/g, ''));
                    if (!isNaN(foundRate) && foundRate > 2000 && foundRate < 2300) {
                      console.log(`Found valid numeric rate: ${foundRate}`);
                      rate = foundRate;
                      return false; // Break the each loop
                    }
                  }
                }
              }
            }
          });
        }
        
        // If we found a rate, save it
        if (rate) {
          await storage.createExchangeRate({
            provider_id: sendwaveProvider.id,
            from_currency: 'GBP',
            to_currency: 'NGN',
            rate: rate,
            source: 'SCRAPER'
          });
          
          console.log(`Successfully updated SendWave rate: ${rate}`);
          return true;
        }
        
        console.log(`No valid rate found on attempt ${attempt}, will try again with longer delay`);
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error);
      }
    }
    
    console.log('All attempts failed to find a valid SendWave rate');
    return false;
  } catch (error) {
    console.error('Error in SendWave screenshot-based scraper:', error);
    return false;
  }
}