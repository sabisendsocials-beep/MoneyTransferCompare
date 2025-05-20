/**
 * Western Union Elements Test
 * 
 * This script scans the Western Union page and finds all elements that might contain exchange rates
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from './storage';

async function analyzeWesternUnionPage() {
  try {
    console.log('Analyzing Western Union page for potential exchange rate elements...');
    
    // Get Western Union provider from database
    const providers = await storage.getProviders();
    const westernUnionProvider = providers.find(p => 
      p.name === 'Western Union' || p.name.toLowerCase().includes('western union')
    );
    
    if (!westernUnionProvider) {
      console.error('Western Union provider not found in database');
      return;
    }
    
    const url = westernUnionProvider.scraping_url;
    console.log(`Western Union URL: ${url}`);
    
    // Fetch the page content
    console.log('Fetching HTML content...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
      return;
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters)`);
    
    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    
    // 1. Check for .fx-to elements
    console.log('\n1. CHECKING .fx-to ELEMENTS:');
    const fxToElements = $('.fx-to');
    console.log(`Found ${fxToElements.length} elements with class .fx-to`);
    
    fxToElements.each((i, el) => {
      const element = $(el);
      console.log(`Element ${i+1}:`);
      console.log(`- Text: "${element.text().trim()}"`);
      console.log(`- HTML: "${element.html()}"`);
      console.log(`- Parent: "${element.parent().text().trim().substring(0, 100)}..."`);
    });
    
    // 2. Check for elements with "FX:" text that might contain exchange rates
    console.log('\n2. CHECKING FOR FX TEXT ELEMENTS:');
    const fxElements = $('*:contains("FX:")');
    console.log(`Found ${fxElements.length} elements containing "FX:"`);
    
    // Limit to first 5 elements to avoid flooding console
    const limitedFxElements = fxElements.slice(0, 5);
    limitedFxElements.each((i, el) => {
      const element = $(el);
      console.log(`Element ${i+1}:`);
      console.log(`- Text: "${element.text().trim()}"`);
      
      // Check if it has a next sibling
      const nextSibling = element.next();
      if (nextSibling.length > 0) {
        console.log(`- Next sibling: "${nextSibling.text().trim()}"`);
      }
      
      // Check if parent contains exchange rate info
      const parentText = element.parent().text().trim();
      if (parentText.includes('GBP') && parentText.includes('NGN')) {
        console.log(`- Parent has both currencies: "${parentText.substring(0, 100)}..."`);
      }
    });
    
    // 3. Check for elements containing both GBP and NGN
    console.log('\n3. CHECKING FOR GBP AND NGN ELEMENTS:');
    const currencyElements = $('*:contains("GBP"):contains("NGN")');
    console.log(`Found ${currencyElements.length} elements containing both GBP and NGN`);
    
    // Limit to first 10 elements to avoid flooding console
    const limitedCurrencyElements = currencyElements.slice(0, 10);
    limitedCurrencyElements.each((i, el) => {
      const element = $(el);
      const text = element.text().trim();
      
      // Only show reasonably sized text
      if (text.length < 200) {
        console.log(`Element ${i+1}: "${text}"`);
        
        // Look for specific patterns
        if (text.match(/1\s*GBP\s*=\s*[\d,\.]+\s*NGN/i)) {
          console.log('  --> MATCH: Contains "1 GBP = X NGN" pattern');
        }
        
        // Look for numbers in the expected range for GBP to NGN (2000-2200)
        const numbers = text.match(/(\d[\d,\.]+)/g);
        if (numbers) {
          numbers.forEach(num => {
            const parsedNum = parseFloat(num.replace(/,/g, ''));
            if (parsedNum > 1800 && parsedNum < 2500) {
              console.log(`  --> POTENTIAL RATE: ${parsedNum}`);
            }
          });
        }
      }
    });
    
    // 4. Search specifically for numeric spans that could be exchange rates
    console.log('\n4. CHECKING FOR NUMERIC SPANS IN EXPECTED RANGE:');
    const allSpans = $('span');
    let rateSpansCount = 0;
    
    allSpans.each((i, el) => {
      const text = $(el).text().trim();
      
      // Check if it's a number in the expected range
      if (/^[\d,\.]+$/.test(text)) {
        const num = parseFloat(text.replace(/,/g, ''));
        if (num > 1800 && num < 2500) {
          rateSpansCount++;
          console.log(`Numeric span ${rateSpansCount}: "${text}"`);
          console.log(`- Parent: "${$(el).parent().text().trim().substring(0, 100)}..."`);
        }
      }
    });
    console.log(`Found ${rateSpansCount} numeric spans in the expected range`);
    
    // 5. Try looking for specific HTML patterns around exchange rates
    console.log('\n5. CHECKING FOR EXCHANGE RATE HTML PATTERNS:');
    const ratePattern = /1\s*GBP\s*=\s*(\d[\d,\.]+)\s*NGN/ig;
    let match;
    let htmlMatches = 0;
    
    // Reset pattern
    ratePattern.lastIndex = 0;
    
    while ((match = ratePattern.exec(html)) !== null) {
      htmlMatches++;
      console.log(`Match ${htmlMatches}: ${match[0]}, Rate: ${match[1]}`);
      
      // Show some context around the match
      const start = Math.max(0, match.index - 50);
      const end = Math.min(html.length, match.index + match[0].length + 50);
      const context = html.substring(start, end);
      console.log(`Context: "...${context}..."`);
    }
    
    console.log(`Found ${htmlMatches} direct rate pattern matches in HTML`);
    
    console.log('\nAnalysis complete. Look for potential rate elements in the output above.');
    
  } catch (error) {
    console.error('Error analyzing Western Union page:', error);
  }
}

// Run the analysis
analyzeWesternUnionPage();