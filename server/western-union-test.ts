/**
 * Western Union Scraper Test
 * 
 * This script tests the Western Union scraper with the provided URL and CSS selector
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from './storage';

async function testWesternUnionScraper() {
  try {
    console.log('Testing Western Union scraper with admin-configured URL and selector...');
    
    // Get the Western Union provider from the database
    const providers = await storage.getProviders();
    const westernUnionProvider = providers.find(p => 
      p.name === 'Western Union' || p.name.toLowerCase().includes('western union')
    );
    
    if (!westernUnionProvider) {
      console.error('Western Union provider not found in database');
      return;
    }
    
    // Get the URL and CSS selector from the provider
    const url = westernUnionProvider.scraping_url;
    const selector = westernUnionProvider.scraping_selector || '.fx-to';
    
    console.log(`Western Union provider found (ID: ${westernUnionProvider.id})`);
    console.log(`URL: ${url}`);
    console.log(`CSS Selector: ${selector}`);
    
    // Fetch the page content
    console.log(`Fetching HTML content from ${url}...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch content: ${response.status} ${response.statusText}`);
      return;
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters)`);
    
    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    
    // Try the specific CSS selector
    const elements = $(selector);
    console.log(`Found ${elements.length} elements with selector "${selector}"`);
    
    // Get text from all matched elements
    elements.each((i, el) => {
      const element = $(el);
      const text = element.text().trim();
      console.log(`Element ${i+1} text: "${text}"`);
      
      // Look for rate pattern
      if (text.includes('NGN')) {
        console.log(`Element ${i+1} contains NGN currency code`);
        
        // Extract numeric value if present
        const rateMatch = text.match(/(\d[\d,\.]+)/);
        if (rateMatch) {
          const rateStr = rateMatch[1].replace(/,/g, '');
          const rate = parseFloat(rateStr);
          console.log(`Extracted rate: ${rate}`);
        }
      }
    });
    
    // Try some additional selectors
    const additionalSelectors = [
      'span.fx-to',
      '.exchange-rate',
      '.wu-calc-rate',
      'span:contains("GBP")',
      'span:contains("NGN")'
    ];
    
    for (const altSelector of additionalSelectors) {
      const altElements = $(altSelector);
      console.log(`Alternative selector "${altSelector}": found ${altElements.length} elements`);
      
      if (altElements.length > 0) {
        altElements.each((i, el) => {
          if (i < 3) { // Limit to first 3 elements to avoid flooding console
            const text = $(el).text().trim();
            console.log(`  - Element ${i+1} text: "${text}"`);
          }
        });
      }
    }
    
    // Look for any element containing both GBP and NGN
    console.log('Looking for elements containing both GBP and NGN...');
    const gbpNgnElements = $('*:contains("GBP"):contains("NGN")');
    console.log(`Found ${gbpNgnElements.length} elements containing both GBP and NGN`);
    
    gbpNgnElements.each((i, el) => {
      if (i < 5) { // Limit to first 5 elements
        const text = $(el).text().trim();
        
        // Only print reasonably sized text blocks
        if (text.length < 200) {
          console.log(`  - Element ${i+1} text: "${text}"`);
          
          // Look for rate patterns
          const ratePatterns = [
            /1\s*GBP\s*=\s*([\d,\.]+)\s*NGN/i,
            /GBP\s*\/\s*NGN\s*:\s*([\d,\.]+)/i,
            /([\d,\.]+)\s*NGN/i
          ];
          
          for (const pattern of ratePatterns) {
            const match = text.match(pattern);
            if (match) {
              const rateStr = match[1].replace(/,/g, '');
              const rate = parseFloat(rateStr);
              if (!isNaN(rate) && rate > 1000) {
                console.log(`  - Found rate using pattern ${pattern}: ${rate}`);
              }
            }
          }
        }
      }
    });
    
    console.log('Western Union scraper test completed');
    
  } catch (error) {
    console.error('Error testing Western Union scraper:', error);
  }
}

// Run the test
testWesternUnionScraper();