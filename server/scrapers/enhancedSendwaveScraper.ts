/**
 * Enhanced SendWave exchange rate scraper
 * 
 * This improved implementation focuses on locating the actual currency rate on
 * the SendWave website by using multiple selector strategies and fallback mechanisms.
 */

import * as cheerio from 'cheerio';
import { DatabaseStorage } from '../databaseStorage';
import type { InsertExchangeRate } from '@shared/schema';

// Create storage instance
const storage = new DatabaseStorage();

/**
 * Update the SendWave exchange rate using a direct extract from the page
 */
export async function enhancedSendwaveRate(): Promise<boolean> {
  console.log('=== Starting enhanced SendWave rate scraper ===');
  
  try {
    // Get the provider configuration
    const providers = await storage.getProviders();
    const sendwave = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwave) {
      console.log('SendWave provider not found in database');
      return false;
    }
    
    // If no URL is configured, use fallback URLs
    const urls = [
      sendwave.scraping_url,
      'https://www.sendwave.com/en/gb/send-money-to-nigeria',
      'https://www.sendwave.com/en/send-money-to-nigeria',
      'https://www.sendwave.com/en/nigeria',
      'https://www.sendwave.com/'
    ].filter(Boolean) as string[];
    
    console.log(`Trying ${urls.length} possible SendWave URLs`);
    
    // Try each URL until we get a valid rate
    for (const url of urls) {
      console.log(`Trying URL: ${url}`);
      
      try {
        // Fetch the page
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.log(`Failed to fetch ${url}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content from ${url} (${html.length} characters)`);
        
        // Parse with cheerio
        const $ = cheerio.load(html);
        
        // Try multiple selectors that might contain the rate
        const selectors = [
          // From the admin panel
          sendwave.scraping_selector,
          // Additional selectors based on structure
          'span[data-testid="rate-value"]',
          '.rate-value',
          '.exchange-rate',
          '[data-testid*="rate"]',
          '[data-testid*="exchange"]',
          'span:contains("NGN")',
          '.js71',
          '.jss71',
          'div.MuiTypography-body1:contains("NGN")',
          'div.MuiTypography-body1:contains("exchange rate")',
          'h6:contains("rate")'
        ].filter(Boolean) as string[];
        
        // Look for rate in the page's text content
        for (const selector of selectors) {
          if (!selector) continue;
          
          const elements = $(selector);
          console.log(`Found ${elements.length} elements matching selector "${selector}"`);
          
          for (let i = 0; i < elements.length; i++) {
            const text = $(elements[i]).text();
            console.log(`Element ${i+1} text: "${text}"`);
            
            // Look for patterns that match GBP to NGN rate
            const ratePatterns = [
              /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*NGN/i,
              /exchange\s*rate[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
              /(\d{4,}\.?\d*)/
            ];
            
            for (const pattern of ratePatterns) {
              const match = text.match(pattern);
              if (match && match[1]) {
                const rate = parseFloat(match[1].replace(/,/g, ''));
                if (rate > 1000 && rate < 3000) { // Valid range for GBP to NGN
                  console.log(`Found valid rate: ${rate}`);
                  
                  // Store in database
                  const exchangeRate: InsertExchangeRate = {
                    provider_id: sendwave.id,
                    from_currency: 'GBP',
                    to_currency: 'NGN',
                    rate: rate,
                    source: 'SCRAPER',
                    verified: null,
                    source_url: url
                  };
                  
                  await storage.createExchangeRate(exchangeRate);
                  console.log(`Successfully updated SendWave rate: ${rate}`);
                  return true;
                }
              }
            }
          }
        }
        
        // If selectors didn't work, try looking for rate patterns in the entire page
        console.log('Trying to extract rate from entire page content...');
        const bodyText = $('body').text();
        
        // Look for currency values in the page text
        const pageRateMatch = bodyText.match(/GBP\s*to\s*NGN[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i) ||
                              bodyText.match(/exchange\s*rate[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i) ||
                              bodyText.match(/(\d{4}\.\d{1,2})\s*NGN/i);
        
        if (pageRateMatch && pageRateMatch[1]) {
          const rate = parseFloat(pageRateMatch[1].replace(/,/g, ''));
          if (rate > 1000 && rate < 3000) {
            console.log(`Found rate in page content: ${rate}`);
            
            // Store in database
            const exchangeRate: InsertExchangeRate = {
              provider_id: sendwave.id,
              from_currency: 'GBP',
              to_currency: 'NGN',
              rate: rate,
              source: 'SCRAPER',
              verified: null,
              source_url: url
            };
            
            await storage.createExchangeRate(exchangeRate);
            console.log(`Successfully updated SendWave rate: ${rate}`);
            return true;
          }
        }
        
        // Look for any number in the expected rate range in the page
        const allNumbers = bodyText.match(/\d{4,}\.?\d*/g) || [];
        for (const numStr of allNumbers) {
          const num = parseFloat(numStr);
          if (num > 2000 && num < 2300) { // Very likely to be GBP to NGN rate
            console.log(`Found probable rate by number analysis: ${num}`);
            
            // Store in database
            const exchangeRate: InsertExchangeRate = {
              provider_id: sendwave.id,
              from_currency: 'GBP',
              to_currency: 'NGN',
              rate: num,
              source: 'SCRAPER',
              verified: null,
              source_url: url
            };
            
            await storage.createExchangeRate(exchangeRate);
            console.log(`Successfully updated SendWave rate: ${num}`);
            return true;
          }
        }
        
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
      }
    }
    
    // If all scraping approaches failed, report that we couldn't find a valid rate
    console.log('All scraping approaches failed, could not find a valid SendWave rate');
    return false;
    
  } catch (error) {
    console.error('Error in enhanced SendWave scraper:', error);
    return false;
  }
}