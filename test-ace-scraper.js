/**
 * Test script for ACE Money Transfer scraper
 * 
 * This script directly tests the scraper with the CSS selector from the screenshot
 */

// Use ES module imports
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Configuration
const testUrl = process.argv[2] || 'https://www.acemoneytransfer.com/send-money-from-uk-to-nigeria'; // Default URL or accept from command line
const cssSelector = 'span.color-000.lt-61C';

// Main function
async function testAceScraper() {
  console.log('=== Testing ACE Money Transfer Scraper ===');
  console.log(`URL: ${testUrl}`);
  console.log(`CSS Selector: ${cssSelector}`);
  
  try {
    // Fetch the page content
    console.log('Fetching page content...');
    const response = await fetch(testUrl);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch page: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const html = await response.text();
    console.log(`✓ Retrieved ${html.length} characters of HTML content`);
    
    // Parse with cheerio
    const $ = cheerio.load(html);
    
    // First try the exact selector from screenshot
    console.log(`Trying selector: "${cssSelector}"`);
    let element = $(cssSelector);
    
    if (element.length > 0) {
      console.log(`✓ Found ${element.length} elements matching the selector`);
      const rateText = element.text().trim();
      console.log(`Element text: "${rateText}"`);
      
      if (rateText) {
        // Try to extract the rate value
        const rate = parseFloat(rateText.replace(/[^\d.]/g, ''));
        if (!isNaN(rate) && rate > 0) {
          console.log(`✓ Successfully extracted rate: ${rate}`);
          return true;
        } else {
          console.log(`❌ Failed to parse rate from text: "${rateText}"`);
        }
      } else {
        console.log('❌ Element exists but has no text content');
      }
    } else {
      console.log(`❌ No elements found with selector: "${cssSelector}"`);
    }
    
    // Try to find any elements that might contain the rate
    console.log('Checking for elements containing the rate...');
    
    // Look for elements containing "2150" or similar numbers (GBP to NGN rates are typically around 2100-2200)
    const rateElements = $('span, div').filter(function() {
      const text = $(this).text().trim();
      return /\b(2[0-9]{3}(\.?\d+)?)\b/.test(text);  // Match numbers like 2150, 2150.5, etc.
    });
    
    if (rateElements.length > 0) {
      console.log(`Found ${rateElements.length} potential rate elements:`);
      rateElements.each((i, el) => {
        console.log(`${i+1}. "${$(el).text().trim()}" (class: ${$(el).attr('class') || 'none'})`);
      });
    } else {
      console.log('❌ No potential rate elements found');
    }
    
    // Print information about spans with specific classes
    console.log('\nChecking for spans with class containing "color"...');
    $('span[class*="color"]').each((i, el) => {
      console.log(`${i+1}. Class: "${$(el).attr('class')}", Text: "${$(el).text().trim()}"`);
    });
    
    return false;
  } catch (error) {
    console.error('❌ Error scraping ACE Money Transfer site:', error);
    return false;
  }
}

// Run the test
testAceScraper().then(success => {
  if (success) {
    console.log('✅ Test completed successfully');
  } else {
    console.log('❌ Test failed');
  }
});