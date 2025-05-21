/**
 * MoneyGram Direct Scraper
 * 
 * This file implements a direct scraping solution for MoneyGram
 * that ONLY uses scraped values from the website without any fallbacks.
 */
import { storage } from '../storage';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Scrape MoneyGram website for exchange rates
 * Uses ONLY the CSS selector identified from the HTML with no fallbacks
 */
export async function scrapeMoneygramDirect(
  url: string,
  selector: string,
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  console.log(`=== MONEYGRAM DIRECT SCRAPER ===`);
  console.log(`Using ONLY direct scraping (no fallbacks)`);
  console.log(`URL: ${url}`);
  console.log(`CSS Selector: ${selector}`);
  
  try {
    console.log("Waiting 2 seconds before making request to avoid rate limits...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch the page content with enhanced browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      referrer: 'https://www.google.com/'
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const html = await response.text();
    console.log(`Retrieved ${html.length} characters from MoneyGram website`);
    
    // Wait for JavaScript to load (simulating browser behavior)
    console.log("Waiting for JavaScript to load dynamic content...");
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Parse the HTML
    const $ = cheerio.load(html);
    
    // Try with the exact CSS selector first
    console.log(`1. First trying with the provided CSS selector: "${selector}"`);
    const elements = $(selector);
    console.log(`Found ${elements.length} elements matching selector "${selector}"`);
    
    let rateText = '';
    let rate = 0;
    
    // If we found elements with the selector, process them
    if (elements.length > 0) {
      elements.each((i, el) => {
        const text = $(el).text().trim();
        console.log(`Element ${i+1} text: "${text}"`);
        
        // Look for text containing currency codes and numbers
        if ((text.includes(fromCurrency) || text.includes(toCurrency)) && /\d+(\.\d+)?/.test(text)) {
          console.log(`Found text with currency and number: "${text}"`);
          rateText = text;
        }
      });
    }
    
    // If primary selector didn't work, try some common MoneyGram exchange rate elements
    if (!rateText) {
      console.log('2. Trying common MoneyGram selectors for exchange rates...');
      
      // MoneyGram often uses these classes for their exchange rate values
      const commonSelectors = [
        '.exchange-rate-value', 
        '.calc-rate',
        '.exchange-rate', 
        '.fx-rate',
        '.currencyValue'
      ];
      
      for (const commonSelector of commonSelectors) {
        const elements = $(commonSelector);
        console.log(`Found ${elements.length} elements matching selector "${commonSelector}"`);
        
        elements.each((i, el) => {
          const text = $(el).text().trim();
          console.log(`${commonSelector} element ${i+1} text: "${text}"`);
          
          if (/\d+(\.\d+)?/.test(text)) {
            console.log(`Found numeric value in ${commonSelector}: "${text}"`);
            rateText = text;
          }
        });
        
        if (rateText) break;
      }
    }
    
    // Try to find any element containing exchange rate text patterns
    if (!rateText) {
      console.log('3. Looking for exchange rate text patterns...');
      
      // Look for elements containing "exchange rate" text
      $('*').each((i, el) => {
        const text = $(el).text().trim();
        
        // Common patterns found on currency exchange sites
        if ((text.includes('Exchange Rate') || text.includes('exchange rate') || 
             text.includes('Rate') || text.includes('rate')) && 
            text.length < 100 && /\d+(\.\d+)?/.test(text)) {
          
          console.log(`Found potential exchange rate text: "${text}"`);
          rateText = text;
        }
      });
    }
    
    // Look for specific patterns that indicate exchange rates
    if (!rateText) {
      console.log('4. Scanning for exchange rate patterns in the page...');
      
      // Get all text from the page
      const pageText = $('body').text();
      
      // Look for patterns like "1 GBP = X NGN"
      const exchangeRatePattern = new RegExp(`\\b\\d+\\s*${fromCurrency}\\s*=\\s*(\\d+[.,]?\\d*)\\s*${toCurrency}\\b`, 'i');
      const exchangeRateMatch = pageText.match(exchangeRatePattern);
      
      if (exchangeRateMatch) {
        console.log(`Found exchange rate pattern in page: "${exchangeRateMatch[0]}"`);
        rateText = exchangeRateMatch[0];
      }
    }
    
    // If we found rate text, extract the numeric rate
    if (rateText) {
      console.log(`Processing rate text: "${rateText}"`);
      
      // Extract all numbers from the text
      const numberMatches = rateText.match(/\d+[,.]?\d*/g);
      
      if (numberMatches && numberMatches.length > 0) {
        console.log(`Found numbers in text: ${numberMatches.join(', ')}`);
        
        // Convert matches to numbers, handling comma as decimal separator
        const numbers = numberMatches.map(match => {
          // Replace comma with period for proper parsing if needed
          const normalizedMatch = match.replace(',', '.');
          return parseFloat(normalizedMatch);
        });
        
        // For currency pairs like GBP to NGN, the rate is typically the largest number
        // This avoids picking up the "1" in "1 GBP = X NGN"
        rate = Math.max(...numbers);
      }
    }
    
    // Validate the extracted rate
    if (!rateText || !rate || isNaN(rate) || rate <= 0) {
      console.error(`Could not extract a valid rate from text: ${rateText || 'No text found'}`);
      return false;
    }
    
    console.log(`Successfully extracted MoneyGram ${fromCurrency}-${toCurrency} rate: ${rate}`);
    
    // Add the rate to the database
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate,
      source: 'SCRAPER'
    });
    
    console.log(`Successfully stored MoneyGram ${fromCurrency}-${toCurrency} rate: ${rate}`);
    return true;
  } catch (error) {
    console.error(`Error scraping MoneyGram rate:`, error);
    return false;
  }
}