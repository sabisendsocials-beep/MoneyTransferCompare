/**
 * Test script for ACE Money Transfer scraper
 * 
 * This script directly tests the scraper with the CSS selector from the screenshot
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// The CSS selector from the screenshot that targets the exchange rate
const ACE_RATE_SELECTOR = 'span.color-000.lt-61C';

async function testAceScraper(url: string) {
  console.log('=== ACE Money Transfer Scraper Test ===');
  console.log(`URL: ${url}`);
  console.log(`CSS Selector: ${ACE_RATE_SELECTOR}`);
  
  try {
    console.log('Fetching page content...');
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const html = await response.text();
    console.log(`Retrieved ${html.length} characters of HTML`);
    
    const $ = cheerio.load(html);
    
    // Try the exact selector from the screenshot
    const element = $(ACE_RATE_SELECTOR);
    
    if (element.length > 0) {
      console.log(`Found ${element.length} elements with selector "${ACE_RATE_SELECTOR}"`);
      element.each((i, el) => {
        console.log(`Element ${i+1} text: "${$(el).text().trim()}"`);
      });
      
      // Extract the rate value from the first element
      const rateText = element.first().text().trim();
      if (rateText) {
        const rate = parseFloat(rateText.replace(/[^\d.]/g, ''));
        if (!isNaN(rate) && rate > 0) {
          console.log(`Successfully extracted rate: ${rate}`);
          return true;
        }
      }
    } else {
      console.log(`No elements found with selector "${ACE_RATE_SELECTOR}"`);
    }
    
    // If the exact selector didn't work, look for anything that might contain a rate
    console.log('\nLooking for potential rate elements...');
    
    // Search for elements containing the text "Exchange Rate"
    const exchangeRateElements = $('*:contains("Exchange Rate")');
    console.log(`Found ${exchangeRateElements.length} elements containing "Exchange Rate" text`);
    
    if (exchangeRateElements.length > 0) {
      const paragraphs = $('p.FF-Rubik.fs-13.color-C7C');
      console.log(`Found ${paragraphs.length} paragraphs matching "p.FF-Rubik.fs-13.color-C7C"`);
      
      paragraphs.each((i, el) => {
        console.log(`Paragraph ${i+1} text: "${$(el).text()}"`);
        console.log(`Paragraph ${i+1} HTML: "${$(el).html()}"`);
      });
    }
    
    // Try to locate spans with the color-000 class
    const colorSpans = $('span.color-000');
    console.log(`\nFound ${colorSpans.length} spans with class "color-000"`);
    colorSpans.each((i, el) => {
      console.log(`Span ${i+1} class: "${$(el).attr('class')}", text: "${$(el).text().trim()}"`);
    });
    
    return false;
  } catch (error) {
    console.error('Error scraping ACE Money Transfer site:', error);
    return false;
  }
}

// Run with the URL from command line, or use a default
const url = process.argv[2] || 'https://www.acemoneytransfer.com/send-money-from-uk-to-nigeria';
testAceScraper(url).then(success => {
  console.log(`Test ${success ? 'succeeded' : 'failed'}`);
});