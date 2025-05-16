/**
 * Specialized scraper for MoneyGram
 * Designed based on their website structure
 */

import { InsertExchangeRate } from '@shared/schema';
import { storage } from '../storage';
import { log } from '../vite';
import * as cheerio from 'cheerio';

/**
 * Scrape MoneyGram exchange rate
 * Returns the rate if successful, null otherwise
 */
export async function scrapeMoneyGramRate(): Promise<number | null> {
  try {
    log('=== Starting MoneyGram scraper ===');
    
    // MoneyGram exchange rate page
    const url = 'https://www.moneygram.com/mgo/gb/en/calculator';
    
    // Try with browser-like headers to avoid being blocked
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      log(`Failed to fetch MoneyGram page: ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    log('Successfully fetched MoneyGram page');
    
    // Look for patterns in the page content that might indicate the exchange rate
    // Two approaches:
    // 1. Look for specific selectors
    // 2. Use regex patterns to find the rate in the whole page
    
    const $ = cheerio.load(html);
    
    // Approach 1: Check specific selectors
    const selectors = [
      '.exchange-rate', 
      '.rate-display',
      '.rate-calculator',
      '.calculator-result',
      '.result-exchange-rate',
      '[data-test="exchange-rate"]',
      '.exchange-rate-value',
      '.FX-rate',
      '.estimated-rate',
      '.currency-converter-result',
      'div:contains("Exchange rate")',
      'div:contains("1 GBP =")'
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
              log(`Found MoneyGram rate using pattern match: ${rate}`);
              return rate;
            }
          }
          
          // Alternate pattern just looking for a number in a reasonable range for GBP to NGN
          const numericPattern = /(\d{4}[\.,]?\d*)/;
          const numericMatch = text.match(numericPattern);
          
          if (numericMatch && numericMatch[1]) {
            const possibleRate = parseFloat(numericMatch[1].replace(',', '.'));
            if (!isNaN(possibleRate) && possibleRate >= 1500 && possibleRate <= 2500) {
              log(`Found possible MoneyGram rate using numeric pattern: ${possibleRate}`);
              return possibleRate;
            }
          }
        }
      }
    }
    
    // Approach 2: Scan the entire page for rate patterns
    const pageText = $('body').text();
    
    // Look for patterns like "1 GBP = X NGN" in the entire page
    const fullPageRatePattern = /1\s*GBP\s*=\s*(\d+[\.,]?\d*)\s*NGN/gi;
    const matches = Array.from(pageText.matchAll(fullPageRatePattern));
    
    if (matches.length > 0) {
      for (const match of matches) {
        if (match[1]) {
          const rate = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(rate) && rate > 0) {
            log(`Found MoneyGram rate in page text: ${rate}`);
            return rate;
          }
        }
      }
    }
    
    // Look for potential exchange rate values (numbers around 2000 for GBP to NGN)
    const potentialRatePattern = /(\d{4}[\.,]?\d*)/g;
    const potentialMatches = Array.from(pageText.matchAll(potentialRatePattern));
    
    if (potentialMatches.length > 0) {
      // Filter to values in a reasonable range for GBP to NGN
      const possibleRates = potentialMatches
        .map(m => parseFloat(m[1].replace(',', '.')))
        .filter(num => !isNaN(num) && num >= 1500 && num <= 2500);
      
      if (possibleRates.length > 0) {
        // Use the most common value as it's likely to be the exchange rate
        const mostCommonRate = findMostCommonValue(possibleRates);
        log(`Found potential MoneyGram rate using frequency analysis: ${mostCommonRate}`);
        return mostCommonRate;
      }
    }
    
    // If we're here, we couldn't find a reliable rate
    log('=== MoneyGram scraper could not find a reliable rate ===');
    return null;
  } catch (error) {
    log(`Error in MoneyGram scraper: ${error}`);
    return null;
  }
}

/**
 * Helper function to find the most common value in an array
 */
function findMostCommonValue(arr: number[]): number {
  const counts: Record<string, number> = {};
  
  for (const num of arr) {
    const key = num.toString();
    counts[key] = (counts[key] || 0) + 1;
  }
  
  let maxCount = 0;
  let mostCommon = arr[0];
  
  Object.entries(counts).forEach(([numStr, count]) => {
    const num = parseFloat(numStr);
    if (count > maxCount) {
      maxCount = count;
      mostCommon = num;
    }
  });
  
  return mostCommon;
}

/**
 * Update the MoneyGram exchange rate in the database
 * Returns true if the update was successful, false otherwise
 */
export async function updateMoneyGramRate(): Promise<boolean> {
  try {
    const rate = await scrapeMoneyGramRate();
    
    if (rate !== null) {
      log(`Successfully scraped MoneyGram rate: ${rate}`);
      
      // Get the MoneyGram provider from the database
      const providers = await storage.getProviders();
      const moneyGram = providers.find(p => p.name === 'MoneyGram');
      
      if (!moneyGram) {
        log('Could not find MoneyGram provider in database');
        return false;
      }
      
      // Add the rate to database
      const rateData: InsertExchangeRate = {
        provider_id: moneyGram.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: rate
      };
      
      await storage.createExchangeRate(rateData);
      log(`Added real rate for MoneyGram: 1 GBP = ${rate} NGN`);
      return true;
    }
    
    log('No real rate data found for MoneyGram');
    return false;
  } catch (error) {
    log(`Error updating MoneyGram rate: ${error}`);
    return false;
  }
}