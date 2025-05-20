/**
 * Exact SendWave scraper targeting the specific HTML element shown in the screenshot
 * This scraper focuses solely on extracting the rate from the h6 element with title-exchange-rate
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Extract SendWave rate targeting the exact element seen in the screenshot
 */
export async function extractExactSendwaveRate(): Promise<boolean> {
  try {
    console.log('=== Starting exact element SendWave rate extraction ===');
    
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
    let foundRate = null;
    
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
        
        console.log('Searching for exact element from screenshot...');
        
        // EXACT SELECTORS FROM SCREENSHOT
        // First try the exact data-testid attribute we saw
        const exactSelectors = [
          // Exact selector from screenshot
          'h6[data-testid="title-exchange-rate"]',
          // Variations of the same element
          '[data-testid="title-exchange-rate"]',
          // Fallback to class-based selectors seen in screenshot
          'h6.MuiTypography-root.MuiTypography-h6[class*="jss74"]',
          'h6.MuiTypography-root.MuiTypography-h6'
        ];
        
        // Try each of the exact selectors
        for (const selector of exactSelectors) {
          console.log(`Trying selector: "${selector}"`);
          
          const elements = $(selector);
          console.log(`Found ${elements.length} elements matching "${selector}"`);
          
          if (elements.length > 0) {
            elements.each((i, el) => {
              const text = $(el).text().trim();
              console.log(`Element ${i+1} text: "${text}"`);
              
              // Pattern from screenshot: "1 GBP = 2143.06 NGN"
              const exactPattern = /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i;
              const match = text.match(exactPattern);
              
              if (match && match[1]) {
                const rate = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                  console.log(`Found valid rate: ${rate}`);
                  foundRate = rate;
                  return false; // Break the each loop
                }
              }
            });
            
            if (foundRate) break;
          }
        }
        
        // If exact selectors failed, try finding ANY element containing the rate pattern
        if (!foundRate) {
          console.log('\nTrying to find any element with exchange rate pattern...');
          
          const ratePattern = /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i;
          
          $('*').each((i, el) => {
            if (foundRate) return false; // Break if we found a rate
            
            const text = $(el).text().trim();
            
            // Skip empty or very long content
            if (!text || text.length > 200) return;
            
            const match = text.match(ratePattern);
            if (match && match[1]) {
              const rate = parseFloat(match[1].replace(/,/g, ''));
              if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                console.log(`Found rate in element: ${text}`);
                console.log(`Rate: ${rate}`);
                foundRate = rate;
                return false;
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
    
    console.log('All attempts failed to find a valid SendWave rate');
    return false;
  } catch (error) {
    console.error('Error in SendWave exact element scraper:', error);
    return false;
  }
}