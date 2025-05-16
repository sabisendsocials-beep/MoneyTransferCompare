/**
 * Dedicated scraper for TapTap Send
 * Uses multiple approaches to reliably extract exchange rates
 */

import { InsertExchangeRate } from '@shared/schema';
import { storage } from '../storage';
import { log } from '../vite';
import * as cheerio from 'cheerio';
import { findExchangeRatePattern } from './enhancedScraper';

/**
 * Scrape TapTap Send exchange rate using multiple methods
 * Returns the rate if successful, null otherwise
 */
export async function scrapeTapTapRate(): Promise<number | null> {
  try {
    log('=== Starting dedicated TapTap Send scraper ===');
    
    // TapTap Send calculator URL for Nigeria
    const url = 'https://taptapsend.com/send-money-to-nigeria';
    
    // Try with direct fetch using browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      log(`Failed to fetch TapTap Send page: ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try multiple selector patterns
    const selectors = [
      '.calculator .exchange-rate',
      '.calculator .rate-amount',
      '.calculator-result',
      '.conversion-result',
      '.rate-display',
      'span:contains("exchange rate")',
      'div:contains("exchange rate")',
      'p:contains("1 GBP =")',
      'span:contains("1 GBP =")',
      'div:contains("GBP to NGN")',
      '[class*="rate"]',
      '[class*="exchange"]'
    ];
    
    // Try each selector
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        // Try each matching element
        for (let i = 0; i < elements.length; i++) {
          const text = $(elements[i]).text().trim();
          log(`Found text with selector ${selector}: ${text}`);
          
          // Extract the rate using regex
          const extractedRate = findExchangeRatePattern(text);
          if (extractedRate && typeof extractedRate === 'number' && extractedRate > 0) {
            log(`Successfully extracted TapTap Send rate: ${extractedRate}`);
            return extractedRate;
          }
        }
      }
    }
    
    // If no selectors worked, try to find any text that mentions exchange rates
    const pageText = $('body').text();
    
    // Look for specific patterns in the text
    const exchangeRateText = extractTextAroundKeyword(pageText, ['exchange rate', 'rate', 'GBP to NGN', '£1 =']);
    if (exchangeRateText) {
      const extractedRate = findExchangeRatePattern(exchangeRateText);
      if (extractedRate && typeof extractedRate === 'number' && extractedRate > 0) {
        log(`Found TapTap Send rate in context text: ${extractedRate}`);
        return extractedRate;
      }
    }
    
    // Fallback: look for a hard number in a typical exchange rate range for GBP to NGN
    const ratePattern = /(\d{4}(\.\d+)?)/g;
    const allMatches = pageText.match(ratePattern);
    
    if (allMatches) {
      // Filter to numbers in a reasonable range for GBP to NGN (around 1500-2500)
      const possibleRates = allMatches
        .map(match => parseFloat(match))
        .filter(num => num >= 1500 && num <= 2500);
      
      if (possibleRates.length > 0) {
        // Use the most common value or the first one if all are different
        const rate = getMostCommonValue(possibleRates);
        log(`Found potential TapTap Send rate using pattern matching: ${rate}`);
        return rate;
      }
    }
    
    log('=== Dedicated TapTap Send scraper failed to find rate ===');
    return null;
  } catch (error) {
    log(`Error in TapTap Send scraper: ${error}`);
    return null;
  }
}

/**
 * Helper function to extract text around a keyword
 */
function extractTextAroundKeyword(text: string, keywords: string[]): string | null {
  // Split the text into words
  const words = text.split(/\s+/);
  
  for (const keyword of keywords) {
    // Look for the keyword in the text
    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase().includes(keyword.toLowerCase())) {
        // Extract a window of text around the keyword (10 words before and after)
        const start = Math.max(0, i - 10);
        const end = Math.min(words.length, i + 10);
        return words.slice(start, end).join(' ');
      }
    }
  }
  
  return null;
}

/**
 * Helper function to get the most common value in an array
 */
function getMostCommonValue(arr: number[]): number {
  const counts: Record<number, number> = {};
  
  for (const num of arr) {
    counts[num] = (counts[num] || 0) + 1;
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
 * Update the TapTap Send exchange rate in the database
 * Returns true if the update was successful, false otherwise
 */
export async function updateTapTapRate(): Promise<boolean> {
  try {
    const rate = await scrapeTapTapRate();
    
    if (rate !== null) {
      log(`Successfully scraped TapTap Send rate: ${rate}`);
      
      // Get the TapTap Send provider from the database
      const providers = await storage.getProviders();
      const taptap = providers.find(p => p.name === 'Taptap Send');
      
      if (!taptap) {
        log('Could not find TapTap Send provider in database');
        return false;
      }
      
      // Add the rate to database
      const rateData: InsertExchangeRate = {
        provider_id: taptap.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: rate
      };
      
      await storage.createExchangeRate(rateData);
      log(`Added real rate for TapTap Send: 1 GBP = ${rate} NGN`);
      return true;
    }
    
    log('No real rate data found for TapTap Send');
    return false;
  } catch (error) {
    log(`Error updating TapTap Send rate: ${error}`);
    return false;
  }
}