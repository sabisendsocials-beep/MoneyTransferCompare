/**
 * Dynamic SendWave scraper that handles JavaScript-rendered content
 * This scraper uses multiple fetch attempts with delays to allow page content to load fully
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Update the SendWave exchange rate with support for dynamic content
 */
export async function updateSendwaveDynamic(): Promise<boolean> {
  try {
    console.log('=== Starting dynamic SendWave rate update with JS content support ===');
    
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
    
    // Get current rates from reliable providers to establish valid range
    const latestRates = await storage.getLatestRates('GBP', 'NGN');
    
    // Use the most recent Wise rate if available
    const wiseProvider = providers.find(p => p.name === 'Wise');
    let wiseRate = 0;
    
    if (wiseProvider) {
      const wiseRateData = latestRates.find(r => r.provider_id === wiseProvider.id);
      if (wiseRateData) {
        wiseRate = wiseRateData.rate;
        console.log(`Current Wise rate (from API): ${wiseRate}`);
      }
    }
    
    // Set default valid range (will be updated if we have reliable rates)
    let minValidRate = 2100;
    let maxValidRate = 2200;
    
    if (wiseRate > 0) {
      // Set range to be within 5% of Wise rate
      minValidRate = wiseRate * 0.95;
      maxValidRate = wiseRate * 1.05;
      console.log(`Valid rate range based on Wise rate: ${minValidRate.toFixed(2)} - ${maxValidRate.toFixed(2)}`);
    } else {
      // If no Wise rate, use current market rates if available
      const validRates = latestRates
        .filter(r => r.provider_id !== sendwaveProvider.id)
        .filter(r => r.rate > 2000 && r.rate < 2300)
        .map(r => r.rate);
      
      if (validRates.length > 0) {
        const min = Math.min(...validRates);
        const max = Math.max(...validRates);
        
        minValidRate = min * 0.95;
        maxValidRate = max * 1.05;
        console.log(`Valid rate range based on market data: ${minValidRate.toFixed(2)} - ${maxValidRate.toFixed(2)}`);
      } else {
        console.log(`Using default valid rate range: ${minValidRate} - ${maxValidRate}`);
      }
    }
    
    // Known false positives to filter out (common table header values)
    const knownFalsePositives = [1, 10, 20, 100, 200, 1000, 2000, 10000, 20000];
    
    // Multiple attempts with increasing delays
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delayMs = attempt * 2000; // Increase delay with each attempt (2s, 4s, 6s)
      console.log(`Attempt ${attempt}/${maxAttempts} with ${delayMs}ms delay...`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(adminUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          console.log(`Error fetching ${adminUrl}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content (${html.length} characters)`);
        
        // Wait with increasing delay to allow any JS to execute
        console.log(`Waiting ${delayMs}ms to allow page to fully render...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Parse the page content
        const $ = cheerio.load(html);
        
        // Use the admin-configured selectors
        const selectors = (sendwaveProvider.scraping_selector || '').split(',').map(s => s.trim()).filter(Boolean);
        
        console.log(`Using admin-configured selectors: ${selectors.join(', ')}`);
        
        let rate = null;
        
        // Try each selector
        for (const selector of selectors) {
          console.log(`Trying selector: "${selector}"`);
          
          const elements = $(selector);
          console.log(`Found ${elements.length} elements matching selector "${selector}"`);
          
          if (elements.length === 0) continue;
          
          // Check each matching element
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            let text = '';
            
            // Get text or input value
            if ($(element).is('input')) {
              text = $(element).attr('value') || '';
              console.log(`Input element ${i+1} value: "${text}"`);
            } else {
              text = $(element).text().trim();
              console.log(`Element ${i+1} text: "${text}"`);
            }
            
            // Try different rate extraction patterns
            
            // Pattern 1: "1 GBP = X NGN"
            const pattern1 = /1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i;
            const match1 = text.match(pattern1);
            if (match1 && match1[1]) {
              const foundRate = parseFloat(match1[1].replace(/,/g, ''));
              if (!isNaN(foundRate) && !knownFalsePositives.includes(foundRate) && 
                  foundRate >= minValidRate && foundRate <= maxValidRate) {
                console.log(`Found valid rate: ${foundRate}`);
                rate = foundRate;
                break;
              }
            }
            
            // Pattern 2: "X NGN"
            const pattern2 = /([\d,]+\.?\d*)\s*NGN/i;
            const match2 = text.match(pattern2);
            if (!rate && match2 && match2[1]) {
              const foundRate = parseFloat(match2[1].replace(/,/g, ''));
              if (!isNaN(foundRate) && !knownFalsePositives.includes(foundRate) && 
                  foundRate >= minValidRate && foundRate <= maxValidRate) {
                console.log(`Found valid rate: ${foundRate}`);
                rate = foundRate;
                break;
              }
            }
            
            // Pattern 3: Just a number within the valid range
            if (!rate && /^[\d,]+\.?\d*$/.test(text)) {
              const foundRate = parseFloat(text.replace(/,/g, ''));
              if (!isNaN(foundRate) && !knownFalsePositives.includes(foundRate) && 
                  foundRate >= minValidRate && foundRate <= maxValidRate) {
                console.log(`Found valid numeric rate: ${foundRate}`);
                rate = foundRate;
                break;
              }
            }
          }
          
          if (rate) break;
        }
        
        // If we found a valid rate, save it
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
        
        // Look for any valid rate in the page content if selectors failed
        const bodyText = $('body').text();
        const allNumbers = bodyText.match(/\b(\d{4,}(?:\.\d+)?)\b/g) || [];
        
        if (allNumbers.length > 0) {
          console.log(`Found ${allNumbers.length} potential rate numbers`);
          
          // Filter out false positives and validate against expected range
          const validRates = allNumbers
            .map(n => parseFloat(n))
            .filter(n => {
              if (isNaN(n)) return false;
              if (knownFalsePositives.includes(n)) return false;
              if (n < minValidRate || n > maxValidRate) return false;
              return true;
            });
          
          if (validRates.length > 0) {
            console.log(`Found valid rates: ${validRates.join(', ')}`);
            
            // Use rate closest to Wise rate if available
            if (wiseRate > 0) {
              validRates.sort((a, b) => Math.abs(a - wiseRate) - Math.abs(b - wiseRate));
              console.log(`Selecting rate closest to Wise rate: ${validRates[0]}`);
            }
            
            await storage.createExchangeRate({
              provider_id: sendwaveProvider.id,
              from_currency: 'GBP',
              to_currency: 'NGN',
              rate: validRates[0],
              source: 'SCRAPER'
            });
            
            console.log(`Successfully updated SendWave rate: ${validRates[0]}`);
            return true;
          }
        }
        
        console.log(`No valid rate found on attempt ${attempt}, will try again with longer delay`);
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error);
      }
    }
    
    console.log('All attempts failed to find a valid SendWave rate');
    return false;
  } catch (error) {
    console.error('Error in SendWave dynamic scraper:', error);
    return false;
  }
}