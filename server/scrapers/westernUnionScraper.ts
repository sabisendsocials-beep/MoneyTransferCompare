/**
 * Specialized scraper for Western Union
 * Uses a simpler, more reliable approach to get their exchange rates
 */

import { InsertExchangeRate } from '@shared/schema';
import { storage } from '../storage';
import { log } from '../vite';
import * as cheerio from 'cheerio';

/**
 * Scrape Western Union exchange rate using direct approach
 * Returns the rate if successful, null otherwise
 */
export async function scrapeWesternUnionRate(): Promise<number | null> {
  try {
    log('=== Starting Western Union scraper ===');
    
    // Western Union exchange rate URL (using direct URL to their rate calculator)
    const url = 'https://www.westernunion.com/gb/en/web/send-money/start?SendMoneyApp=FXCALCULATOR';
    
    // Try with direct fetch using browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    
    if (!response.ok) {
      log(`Failed to fetch Western Union page: ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try various selectors that might contain the exchange rate
    const selectors = [
      '.exchange-rate-value', 
      '.wu-text--rate',
      '.fxcalculator-rate',
      '.calculator-field-rate',
      '.result-exchange-rate',
      'span:contains("exchange rate")',
      'div:contains("1 GBP = ")'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        // Try each matching element
        for (let i = 0; i < elements.length; i++) {
          const text = $(elements[i]).text().trim();
          log(`Found text with selector ${selector}: ${text}`);
          
          // Look for patterns like "1 GBP = X NGN" or just a number
          const ratePattern = /1\s*GBP\s*=\s*(\d+(\.\d+)?)\s*NGN/i;
          const match = text.match(ratePattern);
          
          if (match && match[1]) {
            const rate = parseFloat(match[1]);
            if (!isNaN(rate) && rate > 0) {
              log(`Successfully extracted Western Union rate: ${rate}`);
              return rate;
            }
          }
          
          // Try just finding a number that could be a rate (around 2000 for GBP to NGN)
          const simpleRatePattern = /(\d{4}(\.\d+)?)/;
          const simpleMatch = text.match(simpleRatePattern);
          
          if (simpleMatch && simpleMatch[1]) {
            const possibleRate = parseFloat(simpleMatch[1]);
            if (!isNaN(possibleRate) && possibleRate > 1500 && possibleRate < 2500) {
              log(`Found possible Western Union rate using simple pattern: ${possibleRate}`);
              return possibleRate;
            }
          }
        }
      }
    }
    
    // Fallback to a conservative estimate based on recent rates (if needed)
    // Western Union GBP to NGN is typically around 2050-2100
    log('=== Western Union scraper could not find rate ===');
    return null;
  } catch (error) {
    log(`Error in Western Union scraper: ${error}`);
    return null;
  }
}

/**
 * Update the Western Union exchange rate in the database
 * Returns true if the update was successful, false otherwise
 */
export async function updateWesternUnionRate(): Promise<boolean> {
  try {
    const rate = await scrapeWesternUnionRate();
    
    if (rate !== null) {
      log(`Successfully scraped Western Union rate: ${rate}`);
      
      // Get the Western Union provider from the database
      const providers = await storage.getProviders();
      const westernUnion = providers.find(p => p.name === 'Western Union');
      
      if (!westernUnion) {
        log('Could not find Western Union provider in database');
        return false;
      }
      
      // Add the rate to database
      const rateData: InsertExchangeRate = {
        provider_id: westernUnion.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: rate
      };
      
      await storage.createExchangeRate(rateData);
      log(`Added real rate for Western Union: 1 GBP = ${rate} NGN`);
      return true;
    }
    
    log('No real rate data found for Western Union');
    return false;
  } catch (error) {
    log(`Error updating Western Union rate: ${error}`);
    return false;
  }
}