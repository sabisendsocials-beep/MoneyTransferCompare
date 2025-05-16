/**
 * Specialized scraper for Remitly
 * Designed based on their website structure
 */

import { InsertExchangeRate } from '@shared/schema';
import { storage } from '../storage';
import { log } from '../vite';
import * as cheerio from 'cheerio';

/**
 * Scrape Remitly exchange rate
 * Returns the rate if successful, null otherwise
 */
export async function scrapeRemitlyRate(): Promise<number | null> {
  try {
    log('=== Starting Remitly scraper ===');
    
    // Remitly UK to Nigeria page
    const url = 'https://www.remitly.com/gb/en/nigeria';
    
    // Try with browser-like headers to avoid being blocked
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      log(`Failed to fetch Remitly page: ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    log('Successfully fetched Remitly page');
    
    const $ = cheerio.load(html);
    
    // Approach 1: Check specific selectors based on their website structure
    const selectors = [
      '.exchange-rate-display',
      '.rate-calculator-result',
      '.exchange-rate-container',
      '.fx-rate-display',
      '.rate-box',
      '.rate-display-container',
      '#exchange-rate-value',
      '[data-testid="exchange-rate"]',
      'span:contains("exchange rate")',
      'span:contains("1 GBP = ")',
      'div:contains("1 GBP = ")'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        log(`Found element matching selector: ${selector}`);
        
        // Try each matching element
        for (let i = 0; i < elements.length; i++) {
          const text = $(elements[i]).text().trim();
          log(`Element text: ${text}`);
          
          // Try different patterns to extract the rate
          // Pattern for "1 GBP = X NGN"
          const ratePattern = /1\s*GBP\s*=\s*(\d+[\.,]?\d*)\s*NGN/i;
          const match = text.match(ratePattern);
          
          if (match && match[1]) {
            const rate = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(rate) && rate > 0) {
              log(`Found Remitly rate using pattern match: ${rate}`);
              return rate;
            }
          }
          
          // Alternate pattern just looking for a number in a reasonable range for GBP to NGN
          const numericPattern = /(\d{4}[\.,]?\d*)/;
          const numericMatch = text.match(numericPattern);
          
          if (numericMatch && numericMatch[1]) {
            const possibleRate = parseFloat(numericMatch[1].replace(',', '.'));
            if (!isNaN(possibleRate) && possibleRate >= 1500 && possibleRate <= 2500) {
              log(`Found possible Remitly rate using numeric pattern: ${possibleRate}`);
              return possibleRate;
            }
          }
        }
      }
    }
    
    // Approach 2: Look for exchange rate in the entire page
    const pageText = $('body').text();
    
    // Look for patterns like "1 GBP = X NGN" in the entire page
    const fullPageRatePattern = /1\s*GBP\s*=\s*(\d+[\.,]?\d*)\s*NGN/gi;
    const matches = Array.from(pageText.matchAll(fullPageRatePattern));
    
    if (matches.length > 0) {
      for (const match of matches) {
        if (match[1]) {
          const rate = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(rate) && rate > 0) {
            log(`Found Remitly rate in page text: ${rate}`);
            return rate;
          }
        }
      }
    }
    
    // Approach 3: Look for exchange rate in script tags (often contains JSON data)
    const scripts = $('script').map((i, el) => $(el).html()).get();
    for (const script of scripts) {
      if (!script) continue;
      
      // Look for patterns that might indicate an exchange rate in the script
      const scriptRatePattern = /"exchangeRate"\s*:\s*"?(\d+[\.,]?\d*)"?/;
      const scriptMatch = script.match(scriptRatePattern);
      
      if (scriptMatch && scriptMatch[1]) {
        const rate = parseFloat(scriptMatch[1].replace(',', '.'));
        if (!isNaN(rate) && rate > 0) {
          log(`Found Remitly rate in script data: ${rate}`);
          return rate;
        }
      }
      
      // Alternative pattern for finding rates in script
      const alternateScriptPattern = /"rate"\s*:\s*"?(\d+[\.,]?\d*)"?/;
      const alternateMatch = script.match(alternateScriptPattern);
      
      if (alternateMatch && alternateMatch[1]) {
        const rate = parseFloat(alternateMatch[1].replace(',', '.'));
        if (!isNaN(rate) && rate > 1500 && rate <= 2500) {
          log(`Found Remitly rate in script data (alternate pattern): ${rate}`);
          return rate;
        }
      }
    }
    
    log('=== Remitly scraper could not find a reliable rate ===');
    return null;
  } catch (error) {
    log(`Error in Remitly scraper: ${error}`);
    return null;
  }
}

/**
 * Update the Remitly exchange rate in the database
 * Returns true if the update was successful, false otherwise
 */
export async function updateRemitlyRate(): Promise<boolean> {
  try {
    const rate = await scrapeRemitlyRate();
    
    if (rate !== null) {
      log(`Successfully scraped Remitly rate: ${rate}`);
      
      // Get the Remitly provider from the database
      const providers = await storage.getProviders();
      const remitly = providers.find(p => p.name === 'Remitly');
      
      if (!remitly) {
        log('Could not find Remitly provider in database');
        return false;
      }
      
      // Add the rate to database
      const rateData: InsertExchangeRate = {
        provider_id: remitly.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: rate
      };
      
      await storage.createExchangeRate(rateData);
      log(`Added real rate for Remitly: 1 GBP = ${rate} NGN`);
      return true;
    }
    
    log('No real rate data found for Remitly');
    return false;
  } catch (error) {
    log(`Error updating Remitly rate: ${error}`);
    return false;
  }
}