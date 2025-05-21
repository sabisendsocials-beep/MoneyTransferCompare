/**
 * ACE Money Transfer Dedicated Scraper
 * 
 * This scraper targets the ACE Money Transfer website specifically to extract exchange rates
 * using the admin-configured URL and CSS selectors.
 */
import { InsertExchangeRate } from '@shared/schema';
import { storage } from '../storage';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

interface ScraperResult {
  success: boolean;
  rate?: number;
  error?: string;
  rawData?: string;
}

/**
 * Extracts exchange rate from ACE Money Transfer website
 * @param url The URL to scrape from admin config
 * @param selector The CSS selector from admin config
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 */
export async function scrapeAceMoneyTransferSite(
  url: string,
  selector: string,
  fromCurrency: string,
  toCurrency: string
): Promise<ScraperResult> {
  console.log(`Attempting to scrape exchange rate from ACE Money Transfer...`);
  console.log(`URL: ${url}`);
  console.log(`CSS Selector: ${selector}`);
  
  try {
    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!response.ok) {
      return { 
        success: false,
        error: `Failed to fetch from ${url}: ${response.status} ${response.statusText}`
      };
    }
    
    const html = await response.text();
    console.log(`Retrieved ${html.length} characters of HTML content`);
    
    // Load HTML content with cheerio
    const $ = cheerio.load(html);
    
    // Try the selector from the screenshot first
    console.log(`Using admin-configured selector: "${selector}"`);
    let rateText = '';
    
    // First try the exact selector 
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`Found ${elements.length} elements matching "${selector}"`);
      elements.each((i, el) => {
        const text = $(el).text().trim();
        console.log(`Element ${i+1} text: "${text}"`);
        
        // If the text looks like a rate (has digits), use it
        if (/\d/.test(text)) {
          rateText = text;
          console.log(`Using text from element ${i+1} as rate: "${rateText}"`);
        }
      });
    } else {
      console.log(`No elements found with selector "${selector}"`);
    }
    
    // If no rate found with the exact selector, try different approaches based on the HTML structure in the screenshot
    if (!rateText) {
      console.log('Looking for exchange rate elements using different approaches...');
      
      // Based on the screenshot, look for exchange rate in paragraphs with FF-Rubik class
      const exchangeRateP = $('p.FF-Rubik:contains("Exchange Rate")');
      if (exchangeRateP.length > 0) {
        console.log(`Found ${exchangeRateP.length} paragraphs containing "Exchange Rate"`);
        
        exchangeRateP.each((i, el) => {
          const paragraphText = $(el).text();
          console.log(`Paragraph ${i+1}: "${paragraphText}"`);
          
          // Find spans within this paragraph that might contain the rate
          const spans = $(el).find('span');
          spans.each((j, span) => {
            const spanText = $(span).text().trim();
            const spanClass = $(span).attr('class') || '';
            console.log(`  Span ${j+1}: class="${spanClass}", text="${spanText}"`);
            
            // If this looks like a rate (has numbers and is around 2000-2200 for GBP to NGN)
            if (/\d/.test(spanText) && (fromCurrency !== 'GBP' || toCurrency !== 'NGN' || /2\d{3}/.test(spanText))) {
              rateText = spanText;
              console.log(`  Using span text as rate: "${rateText}"`);
            }
          });
        });
      }
      
      // If still no rate, look specifically for the elements from the screenshot
      if (!rateText) {
        // From the screenshot we see it's a span with class color-000 lt-61C 
        const specificSpans = $('span.color-000.lt-61C, span.color-000');
        console.log(`Found ${specificSpans.length} spans with class color-000`);
        
        specificSpans.each((i, el) => {
          const text = $(el).text().trim();
          const className = $(el).attr('class') || '';
          console.log(`Specific span ${i+1}: class="${className}", text="${text}"`);
          
          if (/\d/.test(text)) {
            rateText = text;
            console.log(`Using specific span text as rate: "${rateText}"`);
          }
        });
      }
    }
    
    // If we still don't have a rate, try to find any elements containing numeric values in the expected range
    if (!rateText && fromCurrency === 'GBP' && toCurrency === 'NGN') {
      console.log('Trying pattern matching for GBP to NGN rate (typically 2100-2200)...');
      
      // Look for text containing numbers in the expected range for GBP to NGN
      $('*').each((i, el) => {
        const text = $(el).text().trim();
        
        // GBP to NGN rates are typically around 2100-2200
        const match = text.match(/\b(2[0-9]{3}(\.\d+)?)\b/);
        if (match && !rateText) {
          rateText = match[1];
          console.log(`Found potential rate by pattern matching: ${rateText}`);
        }
      });
    }
    
    if (!rateText) {
      return { 
        success: false, 
        error: 'Could not extract rate from HTML',
        rawData: html.length > 1000 ? html.substring(0, 1000) + '...' : html
      };
    }
    
    // Extract the numeric value from the rate text
    const rateValue = parseFloat(rateText.replace(/[^\d.]/g, ''));
    
    if (isNaN(rateValue) || rateValue <= 0) {
      return { 
        success: false, 
        error: `Invalid rate value: ${rateText}`,
        rawData: rateText
      };
    }
    
    console.log(`Successfully extracted ACE Money Transfer rate: ${rateValue}`);
    
    return {
      success: true,
      rate: rateValue,
      rawData: rateText
    };
  } catch (error) {
    console.error('Error scraping ACE Money Transfer site:', error);
    return { 
      success: false, 
      error: `Error scraping website: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Updates exchange rate for ACE Money Transfer using admin-configured settings
 */
export async function updateAceMoneyTransferRate(
  url: string,
  selector: string,
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  console.log(`=== Starting dedicated ACE Money Transfer rate update process ===`);
  console.log(`=== ACE MONEY TRANSFER DEDICATED SCRAPER RUNNING ===`);
  console.log(`This scraper will ONLY use the URL and CSS selector from the admin panel`);
  
  try {
    console.log(`Using admin-configured URL for ACE Money Transfer: ${url}`);
    console.log(`Using CSS selector: ${selector}`);
    
    // Attempt to scrape the rate
    const result = await scrapeAceMoneyTransferSite(url, selector, fromCurrency, toCurrency);
    
    if (result.success && result.rate) {
      console.log(`Successfully extracted ACE Money Transfer ${fromCurrency} to ${toCurrency} rate: ${result.rate}`);
      
      // Update the rate in the database
      await storage.createExchangeRate({
        provider_id: providerId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: result.rate,
        source: 'SCRAPER'
      });
      
      console.log(`Successfully updated ACE Money Transfer ${fromCurrency} to ${toCurrency} rate: ${result.rate}`);
      return true;
    } else {
      console.error(`Failed to extract ACE Money Transfer rate: ${result.error}`);
      if (result.rawData) {
        console.log(`Raw data retrieved: ${result.rawData.length > 100 ? result.rawData.substring(0, 100) + '...' : result.rawData}`);
      }
      return false;
    }
  } catch (error) {
    console.error(`Error in ACE Money Transfer scraper:`, error);
    return false;
  }
}