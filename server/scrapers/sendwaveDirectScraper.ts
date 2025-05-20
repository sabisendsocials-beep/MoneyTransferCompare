/**
 * SendWave direct scraper that only extracts rates from the website
 * No fallbacks, no approximations, no market-based calculations
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Directly scrape SendWave rates using multiple retries with longer timeouts
 */
export async function scrapeSendwaveDirectly(): Promise<boolean> {
  try {
    console.log('=== Starting direct SendWave rate scraping with extended timeouts ===');
    
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
    
    // Get selectors from admin configuration
    const selectors = (sendwaveProvider.scraping_selector || '').split(',').map(s => s.trim()).filter(Boolean);
    console.log(`Using admin-configured selectors: ${selectors.join(', ')}`);
    
    // Try multiple times with increasing delays
    const attempts = 5;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const delayMs = attempt * 3000; // 3s, 6s, 9s, 12s, 15s
      
      console.log(`\nAttempt ${attempt}/${attempts} with ${delayMs}ms delay...`);
      
      try {
        // Use a controller to set a generous timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        // Fetch with detailed headers to avoid bot detection
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
        
        if (!html || html.length < 1000) {
          console.log('Retrieved HTML is too short, might be blocked or redirected');
          continue;
        }
        
        console.log(`Retrieved HTML content (${html.length} characters)`);
        
        // Wait with increasing delay to allow any JS to execute in the user's browser
        console.log(`Waiting ${delayMs}ms before parsing...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Parse the content
        const $ = cheerio.load(html);
        
        // Try each selector from admin panel
        let foundRate = false;
        
        for (const selector of selectors) {
          console.log(`\nTrying selector: "${selector}"`);
          
          const elements = $(selector);
          console.log(`Found ${elements.length} elements matching selector`);
          
          if (elements.length === 0) {
            continue;
          }
          
          elements.each((i, el) => {
            const text = $(el).text().trim();
            console.log(`Element ${i+1} text: "${text}"`);
            
            // Look for patterns that might contain the rate
            const patterns = [
              /([0-9,]+\.\d+)/,              // Basic number with decimal
              /(\d{4,}(?:\.\d+)?)/,          // 4+ digit number
              /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i, // "1 GBP = X NGN"
              /([0-9,]+\.?\d*)\s*NGN/i        // "X NGN"
            ];
            
            for (const pattern of patterns) {
              const match = text.match(pattern);
              if (match && match[1]) {
                const rate = parseFloat(match[1].replace(/,/g, ''));
                
                // Validate rate is in reasonable range for GBP to NGN
                if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                  console.log(`Found valid rate in element ${i+1}: ${rate}`);
                  
                  // Save the rate to database
                  saveRate(sendwaveProvider.id, rate).then(success => {
                    if (success) {
                      console.log(`Successfully saved SendWave rate: ${rate}`);
                      foundRate = true;
                    }
                  });
                  
                  return false; // Break the each loop
                }
              }
            }
          });
          
          if (foundRate) break;
        }
        
        // If no rate found with specific selectors, try common rate patterns in the full page
        if (!foundRate) {
          console.log('\nTrying common rate patterns in full page content...');
          
          // Look for any content that might be the rate display
          $('body *').each((i, el) => {
            if (foundRate) return false; // Exit if already found
            
            const text = $(el).text().trim();
            
            // Skip empty text or very long content
            if (!text || text.length > 200) return true;
            
            // Look for keywords that might indicate a rate display
            if (text.toLowerCase().includes('gbp') || 
                text.toLowerCase().includes('ngn') || 
                text.includes('£') || 
                text.includes('₦') ||
                text.toLowerCase().includes('exchange rate')) {
              
              console.log(`Found potential rate element: "${text}"`);
              
              // Extract numbers that could be rates
              const numbers = text.match(/(\d{4,}(?:\.\d+)?)/g);
              if (numbers) {
                for (const num of numbers) {
                  const rate = parseFloat(num);
                  
                  // Validate rate is in reasonable range
                  if (!isNaN(rate) && rate > 2000 && rate < 2300) {
                    console.log(`Found valid rate: ${rate}`);
                    
                    // Save the rate to database
                    saveRate(sendwaveProvider.id, rate).then(success => {
                      if (success) {
                        console.log(`Successfully saved SendWave rate: ${rate}`);
                        foundRate = true;
                      }
                    });
                    
                    return false; // Break the each loop
                  }
                }
              }
            }
          });
        }
        
        // If we found a rate, we're done
        if (foundRate) {
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
    console.error('Error in SendWave direct scraper:', error);
    return false;
  }
}

/**
 * Save rate to database
 */
async function saveRate(providerId: number, rate: number): Promise<boolean> {
  try {
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: 'GBP',
      to_currency: 'NGN',
      rate: rate,
      source: 'SCRAPER'
    });
    return true;
  } catch (error) {
    console.error('Error saving rate:', error);
    return false;
  }
}