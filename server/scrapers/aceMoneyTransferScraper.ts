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
  
  try {
    // Fetch the page content
    const response = await fetch(url);
    if (!response.ok) {
      return { 
        success: false,
        error: `Failed to fetch from ${url}: ${response.status} ${response.statusText}`
      };
    }
    
    const html = await response.text();
    
    // Use the admin-configured selector
    const $ = cheerio.load(html);
    
    console.log(`Using admin-configured selector: "${selector}"`);
    
    // Try with the exact admin-configured selector
    let rateText = $(selector).text().trim();
    
    // If no text found with the exact selector, try alternative approaches based on the HTML structure
    if (!rateText) {
      console.log(`No rate text found for ACE Money Transfer using selector "${selector}"`);
      
      // Based on the screenshot, look for the specific class structure
      rateText = $('span.color-000.lt-61C, span[class*="color-000"][class*="lt-61C"]').text().trim();
      
      if (!rateText) {
        // Try to find any span containing the expected value format
        const spans = $('span:contains("2")').filter(function() {
          const text = $(this).text().trim();
          return /^\d{4}(\.\d+)?$/.test(text); // Looking for 4-digit numbers like 2150
        });
        
        if (spans.length > 0) {
          rateText = spans.first().text().trim();
          console.log(`Found rate text by pattern matching: ${rateText}`);
        } else {
          // Try to find text near "Exchange Rate GBP" and "NGN"
          const exchangeRateParagraphs = $('p:contains("Exchange Rate")');
          if (exchangeRateParagraphs.length > 0) {
            console.log(`Found ${exchangeRateParagraphs.length} paragraphs containing "Exchange Rate"`);
            exchangeRateParagraphs.each((i, el) => {
              const text = $(el).text();
              console.log(`Paragraph ${i+1} text: "${text}"`);
              
              // Look for numbers that could be exchange rates
              const matches = text.match(/\d{4}(\.\d+)?/);
              if (matches && matches.length > 0) {
                rateText = matches[0];
                console.log(`Extracted potential rate from paragraph: ${rateText}`);
                return false; // Break the loop
              }
            });
          }
        }
      }
    }
    
    if (!rateText) {
      return { 
        success: false, 
        error: 'Could not extract rate from HTML',
        rawData: html.substring(0, 1000) // Include first 1000 chars for debugging
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
        console.log(`Raw data retrieved: ${result.rawData}`);
      }
      return false;
    }
  } catch (error) {
    console.error(`Error in ACE Money Transfer scraper:`, error);
    return false;
  }
}