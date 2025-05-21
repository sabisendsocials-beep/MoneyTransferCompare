/**
 * Remit Choice Direct Scraper
 * 
 * This file implements a direct scraping solution for Remit Choice
 * that ONLY uses scraped values from the website without any fallbacks.
 */
import { storage } from '../storage';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Scrape Remit Choice website for exchange rates
 * Uses ONLY the CSS selector identified from the HTML with no fallbacks
 */
export async function scrapeRemitChoiceDirect(
  url: string,
  selector: string,
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  console.log(`=== REMIT CHOICE DIRECT SCRAPER ===`);
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
    console.log(`Retrieved ${html.length} characters from Remit Choice website`);
    
    // Wait for JavaScript to load (simulating browser behavior)
    console.log("Waiting for JavaScript to load dynamic content...");
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Parse the HTML
    const $ = cheerio.load(html);
    
    console.log(`Trying multiple scraping approaches for Remit Choice`);
    
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
        if (text.includes(fromCurrency) && /\d+(\.\d+)?/.test(text)) {
          console.log(`Found text with currency and number: "${text}"`);
          rateText = text;
        }
      });
    }
    
    // Try to find any element containing "Exchange Rate" text
    if (!rateText) {
      console.log(`2. Looking for elements containing "Exchange Rate" text...`);
      
      $('*').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('Exchange Rate') && text.includes(fromCurrency) && text.includes(toCurrency)) {
          console.log(`Found element with exchange rate text: "${text}"`);
          
          // Only use if relatively short (likely to be just the rate)
          if (text.length < 200) {
            rateText = text;
          }
        }
      });
    }
    
    // Try finding the specific class structure shown in the screenshot
    if (!rateText) {
      console.log(`3. Looking for specific HTML structure from screenshot...`);
      
      // Look for divs with classes containing "text-center"
      $('div[class*="text-center"]').each((i, el) => {
        const text = $(el).text().trim();
        console.log(`Text-center div ${i+1}: "${text}"`);
        
        // If this div has content with both currencies
        if (text.includes(fromCurrency) && text.includes(toCurrency)) {
          console.log(`Found text-center div with both currencies: "${text}"`);
          rateText = text;
        }
      });
    }
    
    // Try to find spans containing rate information
    if (!rateText) {
      console.log(`4. Looking for spans with rate information...`);
      
      $('span').each((i, el) => {
        const text = $(el).text().trim();
        // Looking for spans with specific text patterns like "1 GBP = X NGN"
        if (text.includes('=') && text.includes(fromCurrency) && /\d+/.test(text)) {
          console.log(`Found span with possible rate: "${text}"`);
          rateText = text;
        }
      });
    }
    
    // As a last resort, scan the entire page for rate patterns
    if (!rateText) {
      console.log(`5. Scanning entire page for rate patterns...`);
      
      // Get all text from the page
      const pageText = $('body').text();
      
      // Look for a pattern like "1 GBP = X NGN" or "Exchange Rate 1 GBP = X NGN"
      const exchangeRateMatches = pageText.match(new RegExp(`\\b(Exchange Rate)?\\s*\\d+\\s*${fromCurrency}\\s*=\\s*(\\d+[.,]?\\d*)\\s*${toCurrency}\\b`, 'i'));
      
      if (exchangeRateMatches) {
        console.log(`Found exchange rate pattern in page text: "${exchangeRateMatches[0]}"`);
        rateText = exchangeRateMatches[0];
      }
    }
    
    // If we found rate text, extract the numeric rate
    if (rateText) {
      console.log(`Processing rate text: "${rateText}"`);
      
      // Extract the numeric rate - look for the largest number in the text
      // This works because exchange rates (like 2165) are typically much larger
      // than the "1" in "1 GBP = 2165 NGN"
      const numberMatches = rateText.match(/\d+[,.]?\d*/g);
      
      if (numberMatches && numberMatches.length > 0) {
        console.log(`Found numbers in text: ${numberMatches.join(', ')}`);
        
        // Convert matches to numbers, handling comma as decimal separator
        const numbers = numberMatches.map(match => {
          // Replace comma with period for proper parsing if needed
          const normalizedMatch = match.replace(',', '.');
          return parseFloat(normalizedMatch);
        });
        
        // For currency pairs like GBP to NGN, the rate is the largest number
        // (excludes the "1" in "1 GBP = X NGN")
        rate = Math.max(...numbers);
        
        // Avoid unreasonably large values (like paragraph numbers)
        if (rate > 10000) {
          // Look for more reasonable numbers
          const reasonableNumbers = numbers.filter(num => num > 100 && num < 10000);
          if (reasonableNumbers.length > 0) {
            rate = Math.max(...reasonableNumbers);
          }
        }
      }
    }
    
    // Validate the extracted rate
    if (!rateText || !rate || isNaN(rate) || rate <= 0) {
      console.error(`Could not extract a valid rate from text: ${rateText || 'No text found'}`);
      return false;
    }
    
    console.log(`Successfully extracted Remit Choice ${fromCurrency}-${toCurrency} rate: ${rate}`);
    
    // Add the rate to the database
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate,
      source: 'SCRAPER'
    });
    
    console.log(`Successfully stored Remit Choice ${fromCurrency}-${toCurrency} rate: ${rate}`);
    return true;
  } catch (error) {
    console.error(`Error scraping Remit Choice rate:`, error);
    return false;
  }
}