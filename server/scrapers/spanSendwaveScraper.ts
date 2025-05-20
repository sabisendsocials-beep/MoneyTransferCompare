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
    console.log('=== Starting SendWave span element scraper ===');
    
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
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delayMs = attempt * 3000; // 3s, 6s, 9s
      
      console.log(`\nAttempt ${attempt}/${maxAttempts} with ${delayMs}ms delay...`);
      
      try {
        // Fetch with browser-like headers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(adminUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
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
        
        // Wait to allow JavaScript execution
        console.log(`Waiting ${delayMs}ms before processing...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Parse with cheerio
        const $ = cheerio.load(html);
        
        let foundRate: number | null = null;
        
        // First target from screenshot: span with the style attribute containing "receive_amount"
        console.log('Looking for span with style containing "receive_amount"...');
        $('span[style*="receive_amount"], span[style*="standard"]').each((i, el) => {
          const text = $(el).text().trim();
          console.log(`Found span${i+1}: "${text}"`);
          
          // Check if it contains a number in the valid range (2000-2300)
          const numberMatch = text.match(/([0-9,]+\.?\d*)/);
          if (numberMatch && numberMatch[1]) {
            const rate = parseFloat(numberMatch[1].replace(/,/g, ''));
            if (!isNaN(rate) && rate > 2000 && rate < 2300) {
              console.log(`Found valid rate in span: ${rate}`);
              foundRate = rate;
              return false; // Break the each loop
            }
          }
        });
        
        // Second target: specific data-testid elements from the screenshots
        if (!foundRate) {
          console.log('Looking for elements with exchange-rate data-testid...');
          $('[data-testid="exchange-rate-text"], [data-testid*="exchange"], [data-testid*="calculator"]').each((i, el) => {
            const text = $(el).text().trim();
            console.log(`Found element${i+1}: "${text}"`);
            
            // Check for pattern "1 GBP = X NGN"
            const ratePattern = /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i;
            const match = text.match(ratePattern);
            
            if (match && match[1]) {
              const rate = parseFloat(match[1].replace(/,/g, ''));
              if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                console.log(`Found valid rate in exchange rate text: ${rate}`);
                foundRate = rate;
                return false; // Break the each loop
              }
            }
            
            // Check for any number in the valid range
            const numberMatch = text.match(/([0-9,]+\.?\d*)/);
            if (numberMatch && numberMatch[1]) {
              const rate = parseFloat(numberMatch[1].replace(/,/g, ''));
              if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                console.log(`Found valid rate in exchange rate text: ${rate}`);
                foundRate = rate;
                return false; // Break the each loop
              }
            }
          });
        }
        
        // If we found a rate, save it
        if (foundRate) {
          // Using static rate from screenshots if scraping fails
          // The screenshots indicated a rate of 2143.06
          const finalRate = foundRate;
          
          await storage.createExchangeRate({
            provider_id: sendwaveProvider.id,
            from_currency: 'GBP',
            to_currency: 'NGN',
            rate: finalRate,
            source: 'SCRAPER'
          });
          
          console.log(`Successfully saved SendWave rate: ${finalRate}`);
          return true;
        }
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