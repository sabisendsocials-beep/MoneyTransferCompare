/**
 * Test script for the Lemfi scraper
 * 
 * This script tests the Lemfi scraper with the CSS selector from the screenshot
 * `.molecule-conversion-box_details__item span.base-text.base-text--size-small--bold`
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testLemfiScraper() {
  console.log('=== Testing Lemfi scraper with CSS selector from screenshot ===');
  
  // Define the URL and selector
  const url = 'https://www.lemfi.com/send-from-uk-to-nigeria';
  const selector = '.molecule-conversion-box_details__item span.base-text.base-text--size-small--bold';
  
  try {
    console.log(`Fetching content from ${url}...`);
    
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters)`);
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(html);
    
    // Find the element with the CSS selector
    const elements = $(selector);
    console.log(`Found ${elements.length} elements with selector "${selector}"`);
    
    if (elements.length === 0) {
      console.log('No elements found with the specified selector');
      
      // Try alternate selectors
      const alternateSelectors = [
        'span.base-text.base-text--size-small--bold',
        '.molecule-conversion-box_details__item span',
        'span.base-text--size-small--bold'
      ];
      
      for (const altSelector of alternateSelectors) {
        const altElements = $(altSelector);
        console.log(`Found ${altElements.length} elements with alternate selector "${altSelector}"`);
        
        if (altElements.length > 0) {
          console.log('Element texts:');
          altElements.each((i, el) => {
            console.log(`  ${i + 1}: "${$(el).text().trim()}"`);
          });
        }
      }
      
      // Look for any elements with text containing "GBP" and "NGN"
      console.log('\nSearching for elements containing "GBP" and "NGN":');
      $('*:contains("GBP"):contains("NGN")').each((i, el) => {
        console.log(`  Element ${i + 1}: "${$(el).text().trim()}"`);
      });
    } else {
      console.log('Element texts:');
      elements.each((i, el) => {
        const text = $(el).text().trim();
        console.log(`  ${i + 1}: "${text}"`);
        
        // Extract the rate if it matches the pattern
        const rateMatch = text.match(/1\s*GBP\s*=\s*([\d,\.]+)\s*NGN/i);
        if (rateMatch) {
          const rateStr = rateMatch[1].replace(/,/g, '');
          const rate = parseFloat(rateStr);
          console.log(`  Found exchange rate: ${rate} NGN per GBP`);
        }
      });
    }
    
    // Get page title as a sanity check
    console.log(`\nPage title: "${$('title').text()}"`);
    
  } catch (error) {
    console.error('Error testing Lemfi scraper:', error);
  }
}

// Run the test
testLemfiScraper();