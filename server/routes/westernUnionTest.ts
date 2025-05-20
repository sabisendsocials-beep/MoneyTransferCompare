/**
 * Western Union Test Routes
 * 
 * These routes provide detailed debugging for the Western Union scraper
 */
import { Router } from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

const router = Router();

/**
 * Test endpoint to display all potential elements containing exchange rate data
 */
router.get('/test-western-union-elements', async (req, res) => {
  try {
    console.log('Analyzing Western Union page for potential exchange rate elements...');
    
    // Get the Western Union provider from the database
    const providers = await storage.getProviders();
    const westernUnionProvider = providers.find(p => 
      p.name === 'Western Union' || p.name.toLowerCase().includes('western union')
    );
    
    if (!westernUnionProvider) {
      return res.status(404).json({ 
        success: false, 
        error: 'Western Union provider not found in database' 
      });
    }
    
    // Get the URL from the provider
    const url = westernUnionProvider.scraping_url;
    console.log(`URL: ${url}`);
    
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
      return res.status(404).json({ 
        success: false, 
        error: `Failed to fetch content: ${response.status} ${response.statusText}` 
      });
    }
    
    const html = await response.text();
    console.log(`Retrieved HTML content (${html.length} characters)`);
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(html);
    
    // Collection of potential elements that might contain exchange rates
    const potentialElements = [];
    
    // 1. Check for elements with class .fx-to
    const fxToElements = $('.fx-to');
    console.log(`Found ${fxToElements.length} elements with class .fx-to`);
    
    fxToElements.each((i, el) => {
      const element = $(el);
      potentialElements.push({
        type: 'fx-to element',
        index: i + 1,
        text: element.text().trim(),
        html: element.html(),
        parent_text: element.parent().text().trim()
      });
    });
    
    // 2. Check for spans containing "FX:"
    const fxSpans = $('span:contains("FX:")');
    console.log(`Found ${fxSpans.length} spans containing "FX:"`);
    
    fxSpans.each((i, el) => {
      const element = $(el);
      potentialElements.push({
        type: 'FX span',
        index: i + 1,
        text: element.text().trim(),
        html: element.html(),
        parent_text: element.parent().text().trim(),
        next_sibling_text: element.next().text().trim(),
        next_sibling_html: element.next().html()
      });
    });
    
    // 3. Check for elements with classes related to exchange rates
    const exchangeClasses = [
      '.exchange-rate', 
      '.wu-calc-rate',
      '.calc-details',
      '.rate-container',
      '.rate-display',
      '.currency-converter'
    ];
    
    for (const className of exchangeClasses) {
      const elements = $(className);
      console.log(`Found ${elements.length} elements with class ${className}`);
      
      elements.each((i, el) => {
        const element = $(el);
        potentialElements.push({
          type: `${className} element`,
          index: i + 1,
          text: element.text().trim(),
          html: element.html(),
          parent_text: element.parent().text().trim()
        });
      });
    }
    
    // 4. Check for spans containing numeric values in the expected range (2000-2200)
    const allSpans = $('span');
    console.log(`Total spans on the page: ${allSpans.length}`);
    
    const rateSpans = [];
    allSpans.each((i, el) => {
      const element = $(el);
      const text = element.text().trim();
      
      // Check for numeric values in a reasonable range for GBP to NGN
      const match = text.match(/^[\d,\.]+$/);
      if (match) {
        const parsedValue = parseFloat(text.replace(/,/g, ''));
        if (parsedValue > 1500 && parsedValue < 2500) {
          rateSpans.push({
            type: 'numeric span',
            index: i + 1,
            text,
            html: element.html(),
            parent_text: element.parent().text().trim(),
            parent_html: element.parent().html(),
            css_path: getCssPath(element)
          });
        }
      }
    });
    
    console.log(`Found ${rateSpans.length} spans with numeric values in the expected range`);
    potentialElements.push(...rateSpans);
    
    // 5. Look for elements containing both currency codes
    const currencyPairs = $('*:contains("GBP"):contains("NGN")');
    console.log(`Found ${currencyPairs.length} elements containing both GBP and NGN`);
    
    const smallerCurrencyPairs = [];
    currencyPairs.each((i, el) => {
      const element = $(el);
      const text = element.text().trim();
      
      // Only include reasonably sized text (not huge blocks)
      if (text.length > 5 && text.length < 200) {
        smallerCurrencyPairs.push({
          type: 'currency pair element',
          index: i + 1,
          text,
          html: element.html().substring(0, 100) + '...' // Truncate long HTML
        });
      }
    });
    
    console.log(`Found ${smallerCurrencyPairs.length} elements with reasonably sized text containing both currencies`);
    potentialElements.push(...smallerCurrencyPairs.slice(0, 15)); // Limit to 15 elements to avoid excessive data
    
    // 6. Look for text matching specific exchange rate patterns
    const gbpNgnPattern = /1\s*GBP\s*=\s*(\d+[\d,\.]*)\s*NGN/i;
    const allElements = $('*');
    
    const patternMatches = [];
    allElements.each((i, el) => {
      const element = $(el);
      const text = element.text().trim();
      
      const match = text.match(gbpNgnPattern);
      if (match) {
        patternMatches.push({
          type: 'pattern match',
          index: i + 1,
          text,
          matched_pattern: '1 GBP = X NGN',
          matched_value: match[1],
          html: element.html().substring(0, 100) + '...' // Truncate long HTML
        });
      }
    });
    
    console.log(`Found ${patternMatches.length} elements matching the exchange rate pattern`);
    potentialElements.push(...patternMatches);
    
    // 7. Extract and map HTML within a specific div that might contain the rate
    let rateDiv = $('.calc-details');
    if (rateDiv.length === 0) {
      rateDiv = $('.calc-container');
    }
    if (rateDiv.length === 0) {
      rateDiv = $('.currency-converter');
    }
    
    const divContents = [];
    if (rateDiv.length > 0) {
      console.log(`Found ${rateDiv.length} potential rate container divs`);
      
      rateDiv.each((i, el) => {
        const element = $(el);
        // Map all child spans to capture structure
        const childSpans = element.find('span');
        
        const spanTexts = [];
        childSpans.each((j, span) => {
          spanTexts.push({
            index: j + 1,
            text: $(span).text().trim(),
            class: $(span).attr('class')
          });
        });
        
        divContents.push({
          type: 'rate container div',
          index: i + 1,
          div_class: element.attr('class'),
          child_span_count: childSpans.length,
          child_spans: spanTexts,
          full_text: element.text().trim()
        });
      });
    }
    
    potentialElements.push(...divContents);
    
    // Return all the potential elements
    return res.json({
      success: true,
      url,
      provider_id: westernUnionProvider.id,
      scraping_selector: westernUnionProvider.scraping_selector,
      potential_element_count: potentialElements.length,
      potential_elements: potentialElements
    });
    
  } catch (error) {
    console.error('Error analyzing Western Union page:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error analyzing Western Union page'
    });
  }
});

/**
 * Helper function to get a CSS path for an element
 */
function getCssPath(element: any): string {
  try {
    const el = element[0];
    if (!el) return '';
    
    // Get element attributes
    const className = element.attr('class');
    const id = element.attr('id');
    
    // Build a path based on available attributes
    let path = element.prop('tagName').toLowerCase();
    
    if (id) {
      path += `#${id}`;
    } else if (className) {
      path += `.${className.replace(/\s+/g, '.')}`;
    }
    
    return path;
  } catch (error) {
    return 'unknown-path';
  }
}

export default router;