/**
 * Specialized implementation for Lemfi scraper
 * 
 * This module provides the core scraping logic for extracting exchange rates from Lemfi,
 * focusing on the specific HTML structure shown in the screenshot.
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

/**
 * Extract the GBP to NGN exchange rate from Lemfi website
 * 
 * @param url The URL to scrape
 * @param cssSelector The primary CSS selector to use (from admin panel)
 * @returns The extracted rate or null if not found
 */
export async function extractLemfiGbpNgnRate(url: string, cssSelector: string): Promise<number | null> {
  try {
    console.log('=== Starting Lemfi GBP to NGN rate extraction ===');
    console.log(`Using URL: ${url}`);
    console.log(`Primary CSS selector: ${cssSelector}`);
    
    // Configure headers to mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    
    // Fetch the HTML content
    console.log('Fetching page content...');
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters)`);
    
    // Wait for JavaScript to load - using a longer timeout
    console.log('Waiting 15 seconds for JavaScript content to fully load...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(html);
    
    // Collection of strategies to try
    const strategies = [
      // Strategy 1: Use the exact selector from the screenshot
      () => {
        console.log('Strategy 1: Using exact CSS selector from screenshot');
        const exactSelector = '.molecule-conversion-box_details__item span.base-text.base-text--size-small--bold';
        const elements = $(exactSelector);
        console.log(`Found ${elements.length} elements with selector "${exactSelector}"`);
        
        for (let i = 0; i < elements.length; i++) {
          const text = elements.eq(i).text().trim();
          console.log(`Element ${i+1} text: "${text}"`);
          
          // Look for the specific pattern "1 GBP = X NGN"
          const match = text.match(/1\s*GBP\s*=\s*([\d,\.]+)\s*NGN/i);
          if (match) {
            const rate = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(rate) && rate > 1000) {
              console.log(`Found exact match with rate: ${rate}`);
              return rate;
            }
          }
        }
        return null;
      },
      
      // Strategy 2: Try provided CSS selector
      () => {
        if (!cssSelector) return null;
        console.log('Strategy 2: Using admin-provided CSS selector');
        const elements = $(cssSelector);
        console.log(`Found ${elements.length} elements with selector "${cssSelector}"`);
        
        for (let i = 0; i < elements.length; i++) {
          const text = elements.eq(i).text().trim();
          console.log(`Element ${i+1} text: "${text}"`);
          
          // Look for GBP and NGN in same element
          if (text.includes('GBP') && text.includes('NGN')) {
            // Extract numeric value
            const match = text.match(/(\d[\d,\.]+)/);
            if (match) {
              const rate = parseFloat(match[1].replace(/,/g, ''));
              if (!isNaN(rate) && rate > 1000) {
                console.log(`Found rate using admin selector: ${rate}`);
                return rate;
              }
            }
          }
        }
        return null;
      },
      
      // Strategy 3: Search by class attribute wildcards
      () => {
        console.log('Strategy 3: Using class attribute wildcards');
        const wildcardSelectors = [
          '[class*="molecule-conversion-box"][class*="details"] span[class*="bold"]',
          '[class*="conversion"][class*="box"] span[class*="bold"]',
          'span[class*="base-text"][class*="bold"]'
        ];
        
        for (const selector of wildcardSelectors) {
          const elements = $(selector);
          console.log(`Found ${elements.length} elements with selector "${selector}"`);
          
          for (let i = 0; i < elements.length; i++) {
            const text = elements.eq(i).text().trim();
            
            // Only log if text has reasonable length
            if (text.length > 0 && text.length < 100) {
              console.log(`Element ${i+1} text: "${text}"`);
            }
            
            // Look for exchange rate pattern
            if (text.match(/1\s*GBP\s*=\s*[\d,\.]+\s*NGN/i)) {
              const match = text.match(/1\s*GBP\s*=\s*([\d,\.]+)\s*NGN/i);
              if (match) {
                const rate = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(rate) && rate > 1000) {
                  console.log(`Found rate using wildcard selector: ${rate}`);
                  return rate;
                }
              }
            }
          }
        }
        return null;
      },
      
      // Strategy 4: Look for elements containing the exchange rate text pattern
      () => {
        console.log('Strategy 4: Looking for elements with exchange rate pattern');
        const pattern = /1\s*GBP\s*=\s*([\d,\.]+)\s*NGN/i;
        
        // Find all text nodes in the document
        const textNodes: { text: string; node: cheerio.Element }[] = [];
        $('*').each((_, element) => {
          $(element).contents().each((_, node) => {
            if (node.type === 'text') {
              const text = $(node).text().trim();
              if (text && text.match(pattern)) {
                textNodes.push({ text, node: element });
              }
            }
          });
        });
        
        console.log(`Found ${textNodes.length} text nodes with exchange rate pattern`);
        
        for (const { text } of textNodes) {
          const match = text.match(pattern);
          if (match) {
            const rate = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(rate) && rate > 1000) {
              console.log(`Found rate in text node: ${rate}`);
              return rate;
            }
          }
        }
        return null;
      },
      
      // Strategy 5: Look for any element with GBP and NGN together
      () => {
        console.log('Strategy 5: Finding elements with both GBP and NGN');
        const elements = $('*:contains("GBP"):contains("NGN")');
        console.log(`Found ${elements.length} elements containing both GBP and NGN`);
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements.eq(i);
          const text = element.text().trim();
          
          // Only process reasonably sized text
          if (text.length > 5 && text.length < 200) {
            console.log(`Element ${i+1} with GBP/NGN: "${text}"`);
            
            // Look for numbers in text
            const numbers = text.match(/(\d[\d,\.]+)/g);
            if (numbers) {
              for (const numStr of numbers) {
                const num = parseFloat(numStr.replace(/,/g, ''));
                // NGN rates for GBP are typically in the 2000-2200 range
                if (!isNaN(num) && num > 1800 && num < 2300) {
                  console.log(`Found likely exchange rate: ${num}`);
                  return num;
                }
              }
            }
          }
        }
        return null;
      }
    ];
    
    // Try each strategy in order until we find a rate
    for (let i = 0; i < strategies.length; i++) {
      const rate = await strategies[i]();
      if (rate !== null) {
        return rate;
      }
    }
    
    console.log('All strategies failed to extract a valid exchange rate');
    return null;
    
  } catch (error) {
    console.error('Error extracting Lemfi exchange rate:', error);
    return null;
  }
}