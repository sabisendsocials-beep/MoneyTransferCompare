/**
 * Dedicated scraper for Sendwave
 * Uses multiple approaches to reliably extract exchange rates
 */

import { InsertExchangeRate } from '@shared/schema';
import { storage } from '../storage';
import { log } from '../vite';
import * as cheerio from 'cheerio';
import { findExchangeRatePattern } from './enhancedScraper';

/**
 * Scrape Sendwave exchange rate using multiple methods
 * Returns the rate if successful, null otherwise
 */
export async function scrapeSendwaveRate(): Promise<number | null> {
  try {
    log('=== Starting dedicated Sendwave scraper ===');
    
    // Sendwave calculator URL
    const url = 'https://www.sendwave.com/en-us/send-money-to-nigeria';
    
    // Try with direct fetch first
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      log(`Failed to fetch Sendwave page: ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try multiple selector patterns
    const selectors = [
      '.calculator-wrapper .exchange-rate',
      '.calculator .rate-text',
      '.calculator-result .rate',
      '.send-money-calculator .rate',
      '.sendwave-calculator .rate-value',
      'span:contains("exchange rate")',
      'div:contains("exchange rate")',
      'p:contains("1 GBP =")',
      'span:contains("1 GBP =")',
      'div:contains("GBP to NGN")'
    ];
    
    // Try each selector
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        log(`Found text with selector ${selector}: ${text}`);
        
        // Extract the rate using regex
        const extractedRate = findExchangeRatePattern(text);
        if (extractedRate && typeof extractedRate === 'number' && extractedRate > 0) {
          log(`Successfully extracted Sendwave rate: ${extractedRate}`);
          return extractedRate;
        }
      }
    }
    
    // If no selectors worked, try to find any text that mentions exchange rates
    const pageText = $('body').text();
    const extractedRate = findExchangeRatePattern(pageText);
    if (extractedRate && typeof extractedRate === 'number' && extractedRate > 0) {
      log(`Found Sendwave rate in page content: ${extractedRate}`);
      return extractedRate;
    }
    
    // If all else fails, analyze the entire HTML for rate patterns
    const gbpNgnPattern = /(\d+(\.\d+)?)\s*NGN/i;
    const matches = html.match(gbpNgnPattern);
    if (matches && matches[1]) {
      const possibleRate = parseFloat(matches[1]);
      if (!isNaN(possibleRate) && possibleRate > 1000) { // Likely a valid GBP to NGN rate (should be >1000)
        log(`Found potential Sendwave rate in HTML: ${possibleRate}`);
        return possibleRate;
      }
    }
    
    log('=== Dedicated Sendwave scraper failed to find rate ===');
    return null;
  } catch (error) {
    log(`Error in Sendwave scraper: ${error}`);
    return null;
  }
}

/**
 * Update the Sendwave exchange rate in the database
 * Returns true if the update was successful, false otherwise
 */
export async function updateSendwaveRate(): Promise<boolean> {
  try {
    const rate = await scrapeSendwaveRate();
    
    if (rate !== null) {
      log(`Successfully scraped Sendwave rate: ${rate}`);
      
      // Get the Sendwave provider from the database
      const providers = await storage.getProviders();
      const sendwave = providers.find(p => p.name === 'Sendwave');
      
      if (!sendwave) {
        log('Could not find Sendwave provider in database');
        return false;
      }
      
      // Add the rate to database
      const rateData: InsertExchangeRate = {
        provider_id: sendwave.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: rate
      };
      
      await storage.createExchangeRate(rateData);
      log(`Added real rate for Sendwave: 1 GBP = ${rate} NGN`);
      return true;
    }
    
    log('No real rate data found for Sendwave');
    return false;
  } catch (error) {
    log(`Error updating Sendwave rate: ${error}`);
    return false;
  }
}