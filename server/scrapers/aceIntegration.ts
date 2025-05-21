/**
 * ACE Money Transfer Integration
 * 
 * Complete implementation for ACE Money Transfer scraper and testing functionality
 */
import { storage } from '../storage';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Update the exchange rate for ACE Money Transfer in the database
 * 
 * @param providerId The provider ID for ACE Money Transfer
 * @param fromCurrency Source currency code (e.g., "GBP")
 * @param toCurrency Target currency code (e.g., "NGN")
 * @param rate The exchange rate value
 * @returns Whether the update was successful
 */
async function updateAceRate(
  providerId: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): Promise<boolean> {
  try {
    // Add the exchange rate to the database
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
      source: 'SCRAPER'
    });
    
    console.log(`Successfully updated ACE Money Transfer ${fromCurrency} to ${toCurrency} rate: ${rate}`);
    return true;
  } catch (error) {
    console.error(`Error updating ACE Money Transfer rate in database:`, error);
    return false;
  }
}

/**
 * Scrape the ACE Money Transfer website for exchange rates
 * 
 * @param url The URL to scrape
 * @param selector The CSS selector to use for the exchange rate
 * @param providerId The provider ID for ACE Money Transfer
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @returns Whether the scraping and update was successful
 */
export async function updateAceExchangeRate(
  url: string,
  selector: string,
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  console.log(`=== ACE MONEY TRANSFER SCRAPER ===`);
  console.log(`URL: ${url}`);
  console.log(`CSS Selector: ${selector}`);
  
  try {
    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const html = await response.text();
    console.log(`Retrieved ${html.length} characters from ACE Money Transfer website`);
    
    // Parse the HTML
    const $ = cheerio.load(html);
    
    // Try the exact selector from the screenshot
    let rateText = '';
    let rateValue = 0;
    
    // 1. Try the exact selector first
    const elements = $(selector);
    
    if (elements.length > 0) {
      console.log(`Found ${elements.length} elements with selector "${selector}"`);
      
      elements.each((i, el) => {
        const text = $(el).text().trim();
        console.log(`Element ${i+1} text: "${text}"`);
        
        if (/\d/.test(text)) { // Contains digits
          rateText = text;
          console.log(`Found potential rate: ${rateText}`);
        }
      });
    } else {
      console.log(`No elements found with selector "${selector}"`);
    }
    
    // 2. If the exact selector didn't work, look for elements with similar patterns
    if (!rateText) {
      console.log('Looking for alternative elements...');
      
      // Based on the screenshot, look for paragraph with Exchange Rate text
      const exchangeRateParas = $('p:contains("Exchange Rate")');
      console.log(`Found ${exchangeRateParas.length} paragraphs containing "Exchange Rate"`);
      
      exchangeRateParas.each((i, el) => {
        const paraText = $(el).text();
        console.log(`Paragraph ${i+1} text: "${paraText}"`);
        
        // Look for spans within this paragraph
        const spans = $(el).find('span');
        spans.each((j, span) => {
          const spanText = $(span).text().trim();
          console.log(`  Span ${j+1} text: "${spanText}"`);
          
          // If it looks like a rate (contains numbers)
          if (/\d/.test(spanText)) {
            rateText = spanText;
            console.log(`  Potential rate found in span: ${rateText}`);
          }
        });
      });
    }
    
    // 3. If still no rate, try with other similar CSS patterns
    if (!rateText) {
      const colorSpans = $('span.color-000, span[class*="color-"]');
      console.log(`Found ${colorSpans.length} spans with color classes`);
      
      colorSpans.each((i, el) => {
        const spanText = $(el).text().trim();
        const className = $(el).attr('class') || '';
        console.log(`Span ${i+1} class="${className}" text="${spanText}"`);
        
        if (/\d/.test(spanText)) {
          rateText = spanText;
          console.log(`Potential rate found in color span: ${rateText}`);
        }
      });
    }
    
    // 4. Last resort: look for any text that matches the expected pattern for GBP to NGN
    if (!rateText && fromCurrency === 'GBP' && toCurrency === 'NGN') {
      console.log('Using pattern matching for GBP to NGN rate...');
      
      // Typical GBP to NGN rates are in the 2100-2200 range
      $('*').each((i, el) => {
        const text = $(el).text().trim();
        
        // Use regex to find values like 2150 or 2150.50
        const match = text.match(/\b(2[0-9]{3}(\.\d+)?)\b/);
        if (match && !rateText) {
          rateText = match[1];
          console.log(`Found rate by pattern matching: ${rateText}`);
        }
      });
    }
    
    // If we found a rate, parse it and update the database
    if (rateText) {
      rateValue = parseFloat(rateText.replace(/[^\d.]/g, ''));
      
      if (!isNaN(rateValue) && rateValue > 0) {
        console.log(`Successfully extracted ACE Money Transfer rate: ${rateValue}`);
        
        // Update the rate in the database
        return await updateAceRate(providerId, fromCurrency, toCurrency, rateValue);
      } else {
        console.error(`Invalid rate value: ${rateText}`);
        return false;
      }
    } else {
      console.error('Could not find any valid exchange rate on the page');
      return false;
    }
  } catch (error) {
    console.error('Error scraping ACE Money Transfer site:', error);
    return false;
  }
}

/**
 * Wrapper function for testing the ACE Money Transfer scraper
 */
export async function testAceScraper() {
  try {
    // Get the provider details from the database
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      console.error('ACE Money Transfer provider not found in the database');
      return false;
    }
    
    // Get the URL from the provider
    const url = aceProvider.scraping_url;
    // Use the selector from the screenshot
    const selector = 'span.color-000.lt-61C';
    
    if (!url) {
      console.error('ACE Money Transfer URL not configured in admin panel');
      return false;
    }
    
    // Run the scraper
    return await updateAceExchangeRate(url, selector, aceProvider.id, 'GBP', 'NGN');
  } catch (error) {
    console.error('Error testing ACE Money Transfer scraper:', error);
    return false;
  }
}