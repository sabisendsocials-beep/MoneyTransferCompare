/**
 * Remit Choice Direct Scraper
 * 
 * This file implements a direct scraping solution for Remit Choice
 * that ONLY uses scraped values from the website without any fallbacks.
 */
import { storage } from '../storage';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Scrape Remit Choice website for exchange rates
 * Uses ONLY the CSS selector identified from the HTML with no fallbacks
 */
export async function scrapeRemitChoiceDirect(
  url: string,
  selector: string,
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  console.log(`=== REMIT CHOICE DIRECT SCRAPER ===`);
  console.log(`Using ONLY direct scraping (no fallbacks)`);
  console.log(`URL: ${url}`);
  console.log(`CSS Selector: ${selector}`);
  
  try {
    console.log("Waiting 2 seconds before making request to avoid rate limits...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch the page content with enhanced browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      referrer: 'https://www.google.com/'
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const html = await response.text();
    console.log(`Retrieved ${html.length} characters from Remit Choice website`);
    
    // Parse the HTML
    const $ = cheerio.load(html);
    
    // Find elements matching the selector
    const elements = $(selector);
    console.log(`Found ${elements.length} elements matching selector "${selector}"`);
    
    if (elements.length === 0) {
      console.error(`No elements found matching selector "${selector}"`);
      return false;
    }
    
    // Look for rate text in any of the matching elements
    let rateText = '';
    
    elements.each((i, el) => {
      const text = $(el).text().trim();
      console.log(`Element ${i+1} text: "${text}"`);
      
      // Accept any text containing the currencies and a number
      if (text.includes(fromCurrency) && text.includes(toCurrency) && /\d+(\.\d+)?/.test(text)) {
        rateText = text;
        console.log(`Found rate text: ${rateText}`);
      }
    });
    
    if (!rateText) {
      console.error(`Could not find rate text for ${fromCurrency}-${toCurrency}`);
      return false;
    }
    
    // Extract the numeric rate from the text
    // Expected format: "Exchange Rate 1 GBP = 2165 NGN"
    const rateMatch = rateText.match(/\d+(\.\d+)?/g);
    if (!rateMatch || rateMatch.length === 0) {
      console.error(`Could not extract numeric rate from text: ${rateText}`);
      return false;
    }
    
    // If multiple numbers found, use the largest one as it's likely the rate
    // (the first number is often '1' as in '1 GBP = X NGN')
    const numberValues = rateMatch.map(Number);
    const rate = Math.max(...numberValues);
    
    if (isNaN(rate) || rate <= 0) {
      console.error(`Invalid rate value: ${rate}`);
      return false;
    }
    
    console.log(`Successfully extracted Remit Choice ${fromCurrency}-${toCurrency} rate: ${rate}`);
    
    // Add the rate to the database
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate,
      source: 'SCRAPER'
    });
    
    console.log(`Successfully stored Remit Choice ${fromCurrency}-${toCurrency} rate: ${rate}`);
    return true;
  } catch (error) {
    console.error(`Error scraping Remit Choice rate:`, error);
    return false;
  }
}