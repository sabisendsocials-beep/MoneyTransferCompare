/**
 * ACE Money Transfer Simple Direct Scraper
 * 
 * This scraper uses a direct and simple approach to extract the exchange rate
 * from the ACE Money Transfer website with NO fallbacks.
 */
import { storage } from '../storage';
import puppeteer from 'puppeteer';

/**
 * Scrape ACE Money Transfer website for exchange rates using Puppeteer
 * This ensures JavaScript rendering and bypasses anti-scraping measures
 */
export async function scrapeAceMoneyTransferDirect(
  url: string,
  selector: string,
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  console.log(`=== ACE MONEY TRANSFER DIRECT SCRAPER ===`);
  console.log(`Using direct scraping with NO fallbacks`);
  console.log(`URL: ${url}`);
  console.log(`CSS Selector: ${selector}`);
  
  let browser;
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent to mimic a real browser
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Page loaded, waiting for content to stabilize...');
    
    // Wait for the page to fully render (important for JavaScript-heavy pages)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Extract exchange rate using the provided selector
    console.log(`Looking for element with selector: ${selector}`);
    const rateElements = await page.$$(selector);
    console.log(`Found ${rateElements.length} elements matching the selector`);
    
    if (rateElements.length === 0) {
      console.error('No elements found with the specified selector');
      return false;
    }
    
    // Extract text from each element and look for the exchange rate pattern
    let rateText = '';
    for (let i = 0; i < rateElements.length; i++) {
      const text = await page.evaluate(el => el.textContent, rateElements[i]);
      console.log(`Element ${i + 1} text: "${text}"`);
      
      // Look for a pattern like "1 GBP = 2,189.17 NGN"
      if (text && text.includes(fromCurrency) && text.includes(toCurrency)) {
        rateText = text;
        console.log(`Found text containing both currencies: ${rateText}`);
        break;
      }
      
      // If we don't find an exact match with both currencies, look for numeric content
      // that might represent an exchange rate
      if (text && /\d+(\.\d+)?/.test(text)) {
        rateText = text;
        console.log(`Found text with numeric content: ${rateText}`);
      }
    }
    
    if (!rateText) {
      console.error('Could not find any text containing rate information');
      return false;
    }
    
    // Extract the numeric rate value using regex
    const rateMatch = rateText.match(/(\d+[,\d]*(\.\d+)?)/);
    if (!rateMatch) {
      console.error(`Could not extract numeric rate from text: ${rateText}`);
      return false;
    }
    
    // Clean the rate (remove commas) and parse as float
    const cleanRate = rateMatch[0].replace(/,/g, '');
    const rate = parseFloat(cleanRate);
    
    if (isNaN(rate) || rate <= 0) {
      console.error(`Invalid rate value: ${rate}`);
      return false;
    }
    
    console.log(`Successfully extracted ACE Money Transfer ${fromCurrency} to ${toCurrency} rate: ${rate}`);
    
    // Store the rate in the database
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate,
      source: 'SCRAPER'
    });
    
    console.log(`Successfully stored ACE Money Transfer ${fromCurrency} to ${toCurrency} rate: ${rate}`);
    return true;
  } catch (error) {
    console.error('Error scraping ACE Money Transfer rate:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}