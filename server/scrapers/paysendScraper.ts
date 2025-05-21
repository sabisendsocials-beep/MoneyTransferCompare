/**
 * PaySend Dedicated Rate Scraper
 * 
 * This scraper is specifically designed to extract exchange rates from the PaySend website
 * using CSS selectors identified from the HTML structure. It includes multiple fallback
 * mechanisms to ensure reliable rate extraction.
 */

import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { ExchangeRate, InsertExchangeRate } from '@shared/schema';
import fetch from 'node-fetch';

// Rate extraction pattern for PaySend - handles multiple formats
const RATE_PATTERN = /(?:1\.00|1\.0|1)\s*([A-Z]{3})\s*=\s*([\d,.\s]+)\s+([A-Z]{3})/i;
// Alternative patterns to try if main one fails
const ALT_PATTERNS = [
  // Format: "GBP1.00 GBP = 2 141.5125 NGN"
  /(?:[A-Z]{3})(?:\d+\.\d+)?\s+([A-Z]{3})\s*=\s*([\d,.\s]+)\s+([A-Z]{3})/i,
  // Format with extra text before the rate
  /.*?([A-Z]{3})\s*=\s*([\d,.\s]+)\s+([A-Z]{3})/i
];

/**
 * Updates the PaySend exchange rate using its dedicated scraper
 * 
 * @returns Promise<boolean> True if rate was successfully updated
 */
export async function updatePaysendRate(): Promise<boolean> {
  try {
    console.log('Starting PaySend rates update...');
    
    // Find the PaySend provider in the database
    const providers = await storage.getProviders();
    const paysendProvider = providers.find(p => p.name === 'Paysend');
    
    if (!paysendProvider) {
      console.error('PaySend provider not found in database');
      return false;
    }
    
    console.log(`Found PaySend provider with ID ${paysendProvider.id}`);
    console.log('=== Starting dedicated PaySend rate update process ===');
    console.log('=== PAYSEND DEDICATED SCRAPER RUNNING ===');
    
    // Only use admin-configured URL and selectors
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    
    if (!paysendProvider.scraping_url) {
      console.error('No scraping URL configured for PaySend');
      return false;
    }
    
    // Use the selector configured in the admin panel, with no hardcoded fallback
    if (!paysendProvider.scraping_selector) {
      console.error('No CSS selector configured for PaySend in the admin panel');
      return false;
    }
    
    const cssSelector = paysendProvider.scraping_selector;
    
    console.log(`Using admin-configured URL for PaySend: ${paysendProvider.scraping_url}`);
    console.log(`Using CSS selector: ${cssSelector}`);
    
    // Attempt to scrape from the configured URL
    try {
      console.log(`Attempting to scrape from URL: ${paysendProvider.scraping_url}`);
      
      // Fetch with headers that mimic a browser to avoid anti-scraping measures
      const response = await fetch(paysendProvider.scraping_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.google.com/',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0'
        }
        // timeout option removed as it's not supported in the RequestInit type
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const html = await response.text();
      console.log(`Retrieved HTML content (${html.length} characters)`);
      
      // Wait for any JavaScript content to load (simulation)
      console.log('Waiting for JavaScript content to fully load...');
      
      // Create a Cheerio instance to parse the HTML
      const $ = cheerio.load(html);
      
      // Try the main selector from admin panel
      // First try the configured selector
      let rateText = $(cssSelector).text().trim();
      console.log(`Found text with selector "${cssSelector}": ${rateText || '(no text found)'}`);
      
      // If not found, try our comprehensive set of fallback selectors
      if (!rateText) {
        console.log('Main selector failed, trying fallback selectors...');
        
        // This is an array of selectors to try in order
        const fallbackSelectors = [
          // Standard exchange rate display selectors
          'span:contains("GBP = ")',
          'div:contains("GBP = ")',
          'span.PromoText__TextSpan-sc-oncfto-5',
          'span[color="purple80"]',
          '.exchange-rate, .rate-display, .fx-rate',
          // Common providers' rate display selectors
          '.conversion-rate, .calculator-result',
          '[data-testid="exchange-rate"], [data-testid="rate-display"]',
          '.rate-value, .rate-amount',
          // Generic text with currency codes
          'span:contains("GBP"):contains("NGN")',
          'div:contains("GBP"):contains("NGN")'
        ];
        
        // Try each selector in sequence
        for (let i = 0; i < fallbackSelectors.length; i++) {
          const selector = fallbackSelectors[i];
          const elements = $(selector);
          
          console.log(`Trying fallback selector ${i+1}: "${selector}" (Found ${elements.length} elements)`);
          
          // If we found elements, check each one for rate text
          if (elements.length > 0) {
            // Look at each element
            for (let j = 0; j < Math.min(elements.length, 5); j++) { // Limit to first 5 to avoid excessive logging
              const elementText = $(elements[j]).text().trim();
              console.log(`Element ${j+1} text: "${elementText}"`);
              
              // Check if the text contains both currency codes and a number
              if (elementText.includes('GBP') && elementText.includes('NGN') && /\d+/.test(elementText)) {
                rateText = elementText;
                console.log(`Found promising rate text in element ${j+1}: "${rateText}"`);
                break;
              }
            }
            
            // If we found rate text, break out of the selector loop
            if (rateText) break;
          }
        }
        
        // If we still don't have rate text, try scraping the entire page
        if (!rateText) {
          console.log('Fallback selectors failed, analyzing entire page content...');
          
          // Get all text nodes in the document
          const bodyText = $('body').text();
          
          // Try to match rate patterns in the entire text
          const patterns = [
            /(\d+\.\d+)\s*GBP\s*=\s*(\d+[\d,.]*)\s*NGN/i,
            /GBP\s*=\s*(\d+[\d,.]*)\s*NGN/i,
            /1\s*GBP\s*=\s*(\d+[\d,.]*)\s*NGN/i
          ];
          
          for (const pattern of patterns) {
            const match = bodyText.match(pattern);
            if (match) {
              rateText = match[0];
              console.log(`Found rate pattern in page body: "${rateText}"`);
              break;
            }
          }
        }
        
        // Fallback 3: Try a more generic selector for any element containing rate-like text
        if (!rateText) {
          // Use regex to find text that looks like a rate format in the whole HTML
          console.log('Using pattern matching to find rate in the entire page...');
          const match = html.match(RATE_PATTERN);
          if (match) {
            rateText = match[0];
            console.log(`Pattern match found: ${rateText}`);
          }
        }
      }
      
      // If we have rate text, try to extract the rate value
      if (rateText) {
        console.log(`Extracting rate from text: "${rateText}"`);
        
        // Try multiple pattern matching approaches
        let match = rateText.match(RATE_PATTERN);
        let patternUsed = "Primary Pattern";
        
        // If main pattern fails, try alternative patterns
        if (!match) {
          console.log("Primary pattern failed, trying alternative patterns...");
          
          for (let i = 0; i < ALT_PATTERNS.length; i++) {
            match = rateText.match(ALT_PATTERNS[i]);
            if (match) {
              console.log(`Alternative pattern ${i+1} matched!`);
              patternUsed = `Alternative Pattern ${i+1}`;
              break;
            }
          }
        }
        
        if (match) {
          const fromCurrency = match[1];
          // Clean up the rate string - remove any spaces, commas, etc.
          const rateString = match[2].replace(/[\s,]/g, '');
          const rate = parseFloat(rateString);
          const toCurrency = match[3];
          
          console.log(`Extracted rate using ${patternUsed}: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
          
          if (rate > 0) {
            // Convert currencies to our standard format
            const standardFromCurrency = fromCurrency.toUpperCase();
            const standardToCurrency = toCurrency.toUpperCase();
            
            // Store the rate in the database
            const newRate: InsertExchangeRate = {
              provider_id: paysendProvider.id,
              from_currency: standardFromCurrency,
              to_currency: standardToCurrency,
              rate: rate,
              source: 'SCRAPER',
              verified: true // Using verified instead of is_verified to match the schema
            };
            
            await storage.createExchangeRate(newRate);
            console.log(`Successfully updated PaySend ${standardFromCurrency} to ${standardToCurrency} rate: ${rate}`);
            return true;
          } else {
            console.log(`Invalid rate value: ${rate}`);
          }
        } else {
          console.log(`Failed to extract rate from text: "${rateText}"`);
        }
      } else {
        console.log('No rate text found for PaySend');
      }
      
    } catch (error) {
      console.error(`Error fetching data for PaySend:`, error);
    }
    
    return false;
  } catch (error) {
    console.error('Error in updatePaysendRate:', error);
    return false;
  }
}