/**
 * ACE Money Transfer Custom Page Scraper
 * 
 * This file implements a specialized scraping approach for ACE Money Transfer
 * that uses a custom page implementation to extract rates from alternative sources
 * while respecting their anti-scraping protection.
 */
import { storage } from '../storage';
import fetch from 'node-fetch';

/**
 * Get ACE Money Transfer rate by using only direct page access
 * with ZERO fallback mechanisms - if no rate can be extracted, return failure
 */
export async function getAceMoneyTransferRateDirectOnly(
  providerId: number,
  fromCurrency: string, 
  toCurrency: string
): Promise<boolean> {
  console.log(`=== ACE MONEY TRANSFER DIRECT-ONLY RATE FETCHER ===`);
  console.log(`Attempting to get ${fromCurrency}-${toCurrency} rate with NO fallbacks`);
  
  try {
    // ACE Money Transfer typically offers rates around these values
    // We'll use their dedicated custom page that shows verified rates
    let baseUrl = 'https://acemoneytransfer.com/exchange-rate/';
    
    if (fromCurrency === 'GBP' && toCurrency === 'NGN') {
      baseUrl += 'gbp-to-ngn';
    } else if (fromCurrency === 'EUR' && toCurrency === 'NGN') {
      baseUrl += 'eur-to-ngn';
    } else if (fromCurrency === 'GBP' && toCurrency === 'GHS') {
      baseUrl += 'gbp-to-ghs';
    } else if (fromCurrency === 'EUR' && toCurrency === 'GHS') {
      baseUrl += 'eur-to-ghs';
    } else {
      console.error(`Unsupported currency pair: ${fromCurrency}-${toCurrency}`);
      return false;
    }
    
    console.log(`Using custom direct page URL: ${baseUrl}`);
    
    // Add a deliberate delay to avoid triggering rate limits
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Fetch with enhanced browser-like headers to avoid being blocked
    const response = await fetch(baseUrl, {
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
    
    // If we couldn't get a successful response, fail immediately
    if (!response.ok) {
      console.error(`Error accessing ACE Money Transfer page: ${response.status} ${response.statusText}`);
      return false;
    }
    
    // Get the HTML content from the response
    const html = await response.text();
    console.log(`Received ${html.length} characters from ACE Money Transfer page`);
    
    // Extract the exchange rate using regex patterns
    // Look for patterns like "1 GBP = 2165.50 NGN" in the HTML
    let rateRegex: RegExp;
    
    if (fromCurrency === 'GBP' && toCurrency === 'NGN') {
      rateRegex = /1\s+GBP\s*=\s*([0-9,]+(\.[0-9]+)?)\s*NGN/i;
    } else if (fromCurrency === 'EUR' && toCurrency === 'NGN') {
      rateRegex = /1\s+EUR\s*=\s*([0-9,]+(\.[0-9]+)?)\s*NGN/i;
    } else if (fromCurrency === 'GBP' && toCurrency === 'GHS') {
      rateRegex = /1\s+GBP\s*=\s*([0-9,]+(\.[0-9]+)?)\s*GHS/i;
    } else if (fromCurrency === 'EUR' && toCurrency === 'GHS') {
      rateRegex = /1\s+EUR\s*=\s*([0-9,]+(\.[0-9]+)?)\s*GHS/i;
    } else {
      console.error(`Unsupported currency pair for regex: ${fromCurrency}-${toCurrency}`);
      return false;
    }
    
    // Find the rate in the HTML content
    const rateMatch = html.match(rateRegex);
    
    if (!rateMatch || !rateMatch[1]) {
      console.error(`Could not find rate pattern in HTML for ${fromCurrency}-${toCurrency}`);
      
      // Log a sample of the HTML for debugging
      console.log(`HTML sample (first 1000 chars): ${html.substring(0, 1000)}`);
      return false;
    }
    
    // Clean up the rate (remove commas) and convert to a number
    const rawRate = rateMatch[1].replace(/,/g, '');
    const rate = parseFloat(rawRate);
    
    if (isNaN(rate) || rate <= 0) {
      console.error(`Invalid rate value extracted: ${rawRate}`);
      return false;
    }
    
    console.log(`Successfully extracted rate for ${fromCurrency}-${toCurrency}: ${rate}`);
    
    // Add the rate to the database
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate,
      source: 'SCRAPER'
    });
    
    console.log(`Successfully stored ACE Money Transfer ${fromCurrency}-${toCurrency} rate: ${rate}`);
    return true;
  } catch (error) {
    console.error(`Error fetching ACE Money Transfer rate:`, error);
    return false;
  }
}