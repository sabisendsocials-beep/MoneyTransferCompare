/**
 * SendWave precise scraper using targeted CSS selector from Admin panel
 * This scraper uses the CSS selector shown in the screenshot
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Extract SendWave rate using the precise CSS selector from the HTML
 */
export async function extractSendwaveRateWithPreciseSelector(): Promise<boolean> {
  try {
    console.log('=== Starting SendWave precise CSS selector scraper ===');
    
    // Get the SendWave provider from database
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
    
    // Get the CSS selector from admin configuration
    const cssSelector = sendwaveProvider.scraping_selector;
    
    if (!cssSelector) {
      console.error('No CSS selector configured for SendWave in admin panel');
      return false;
    }
    
    console.log(`Using admin-configured CSS selector: ${cssSelector}`);
    
    // Multiple attempts with increasing delays
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delayMs = attempt * 3000; // 3s, 6s, 9s
      
      console.log(`\nAttempt ${attempt}/${maxAttempts} with ${delayMs}ms delay...`);
      
      try {
        // Fetch with browser-like headers to avoid detection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(adminUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.google.com/'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          console.log(`Error fetching ${adminUrl}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content (${html.length} characters)`);
        
        // Wait to allow JavaScript execution
        console.log(`Waiting ${delayMs}ms before processing...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Parse with cheerio
        const $ = cheerio.load(html);
        
        // Try the exact CSS selector from admin panel
        const exactSelectorElement = $(cssSelector);
        
        if (exactSelectorElement.length > 0) {
          console.log(`Found ${exactSelectorElement.length} elements matching the exact CSS selector`);
          
          // Get text content
          const text = exactSelectorElement.text().trim();
          console.log(`Text content of the element: "${text}"`);
          
          // Extract the numeric rate from the text
          // Using regex to find numbers that might be exchange rates
          const rateMatch = text.match(/([0-9,]+\.?[0-9]*)/);
          
          if (rateMatch && rateMatch[1]) {
            const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
            
            // Validate that the rate is in a reasonable range for GBP to NGN
            if (!isNaN(rate) && rate > 2000 && rate < 2300) {
              console.log(`Found valid exchange rate using the exact CSS selector: ${rate}`);
              
              // Save the rate to database
              await storage.createExchangeRate({
                provider_id: sendwaveProvider.id,
                from_currency: 'GBP',
                to_currency: 'NGN',
                rate: rate,
                source: 'SCRAPER'
              });
              
              console.log(`Successfully saved SendWave rate: ${rate}`);
              return true;
            } else {
              console.log(`Found numeric value ${rate} but it's outside the expected range for GBP to NGN`);
            }
          } else {
            console.log(`No valid numeric rate found in the element text: "${text}"`);
          }
        } else {
          console.log(`No elements found with the CSS selector: "${cssSelector}"`);
          
          // Try with a more flexible approach based on the provided HTML structure
          console.log('Trying with alternative selectors based on the HTML structure...');
          
          // Based on the HTML, we can see these classes and elements
          const alternativeSelectors = [
            'p.MuiTypography-root.MuiTypography-body1',
            '[data-testid="cex-rate-table-exchange-rate"] p',
            '[css-1r2n4gj]',
            'td[data-testid="cex-rate-table-exchange-rate"] p'
          ];
          
          for (const altSelector of alternativeSelectors) {
            const elements = $(altSelector);
            
            if (elements.length > 0) {
              console.log(`Found ${elements.length} elements with alternative selector: ${altSelector}`);
              
              for (let i = 0; i < elements.length; i++) {
                const text = $(elements[i]).text().trim();
                console.log(`Element ${i+1} text: "${text}"`);
                
                const rateMatch = text.match(/([0-9,]+\.?[0-9]*)/);
                
                if (rateMatch && rateMatch[1]) {
                  const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
                  
                  if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                    console.log(`Found valid exchange rate with alternative selector: ${rate}`);
                    
                    // Save the rate to database
                    await storage.createExchangeRate({
                      provider_id: sendwaveProvider.id,
                      from_currency: 'GBP',
                      to_currency: 'NGN',
                      rate: rate,
                      source: 'SCRAPER'
                    });
                    
                    console.log(`Successfully saved SendWave rate: ${rate}`);
                    return true;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error);
      }
    }
    
    console.log('All attempts failed to find a valid SendWave rate with the provided CSS selector');
    return false;
  } catch (error) {
    console.error('Error in SendWave precise CSS selector scraper:', error);
    return false;
  }
}