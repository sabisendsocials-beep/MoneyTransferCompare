/**
 * ACE Money Transfer Puppeteer Scraper
 * 
 * This file implements a specialized Puppeteer-based scraper for ACE Money Transfer
 * that can handle Cloudflare protection while only using directly scraped values.
 */
import { storage } from '../storage';
import puppeteer from 'puppeteer';

/**
 * Scrape ACE Money Transfer website for exchange rates using Puppeteer
 * This ensures JavaScript rendering and bypasses anti-scraping measures
 */
export async function scrapeAceMoneyTransferWithPuppeteer(
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  console.log(`=== ACE MONEY TRANSFER PUPPETEER SCRAPER ===`);
  console.log(`Using direct scraping ONLY - no fallbacks`);
  console.log(`Looking for ${fromCurrency}-${toCurrency} rate`);
  
  // Use the dedicated GBP-NGN page which is more reliable
  let url = 'https://acemoneytransfer.com/send-money-online';
  
  if (fromCurrency === 'GBP' && toCurrency === 'NGN') {
    url = 'https://acemoneytransfer.com/united-kingdom/nigeria';
  } else if (fromCurrency === 'EUR' && toCurrency === 'NGN') {
    url = 'https://acemoneytransfer.com/europe/nigeria';
  } else if (fromCurrency === 'GBP' && toCurrency === 'GHS') {
    url = 'https://acemoneytransfer.com/united-kingdom/ghana';
  } else if (fromCurrency === 'EUR' && toCurrency === 'GHS') {
    url = 'https://acemoneytransfer.com/europe/ghana';
  }
  
  console.log(`Using URL: ${url}`);
  
  let browser;
  try {
    // Launch headless browser with special settings to bypass Cloudflare
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--ignore-certificate-errors'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent to mimic a real browser
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set request interception to handle Cloudflare better
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive'
    });
    
    // Navigate to URL with extended timeout
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Page loaded, waiting for content to stabilize...');
    
    // Wait for the page to fully render
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Attempt to extract rate using multiple selectors and strategies
    console.log('Looking for exchange rate information...');
    
    // Method 1: Try to find elements containing exchange rate format (e.g., "1 GBP = 2,189.17 NGN")
    console.log('Method 1: Looking for rate pattern in text');
    const ratePattern = new RegExp(`1\\s*${fromCurrency}\\s*=\\s*([\\d,\\.]+)\\s*${toCurrency}`, 'i');
    const pageText = await page.evaluate(() => document.body.innerText);
    
    const rateMatches = pageText.match(ratePattern);
    if (rateMatches && rateMatches[1]) {
      const rateStr = rateMatches[1].replace(/,/g, '');
      const rate = parseFloat(rateStr);
      
      if (!isNaN(rate) && rate > 0) {
        console.log(`Method 1 success: Found rate ${rate} using text pattern match`);
        
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
      }
    }
    
    // Method 2: Try to find specific HTML elements that might contain the rate
    console.log('Method 2: Looking for rate in specific HTML elements');
    
    // Try common CSS selectors that might contain exchange rate information
    const selectors = [
      '.rate-value', 
      '.exchange-rate',
      '.rate',
      'span.color-000.lt-61C',  // From your screenshot
      'span.color-000',
      '.lt-61C',
      'span[class*="rate"]',
      'div[class*="rate"]',
      'span[class*="value"]',
      'div[class*="value"]',
      'span[class*="amount"]',
      'div[class*="amount"]'
    ];
    
    for (const selector of selectors) {
      console.log(`Trying selector: ${selector}`);
      
      try {
        const elements = await page.$$(selector);
        console.log(`Found ${elements.length} elements with selector "${selector}"`);
        
        for (let i = 0; i < elements.length; i++) {
          const text = await page.evaluate(el => el.textContent ? el.textContent.trim() : "", elements[i]);
          console.log(`Element ${i + 1} text: "${text}"`);
          
          // Check if the text contains a numeric value that might be a rate
          if (text && /[\d,\.]+/.test(text)) {
            // Check for specific patterns based on the currency pair
            if (fromCurrency === 'GBP' && toCurrency === 'NGN' && /\b2[0-9]{3}(\.[0-9]+)?\b/.test(text.replace(/,/g, ''))) {
              // GBP-NGN rates are typically around 2000-2200
              const rateMatch = text.match(/(\d+[,\d]*(\.\d+)?)/);
              if (rateMatch) {
                const rate = parseFloat(rateMatch[0].replace(/,/g, ''));
                
                if (!isNaN(rate) && rate > 0) {
                  console.log(`Method 2 success: Found GBP-NGN rate ${rate} in element with selector ${selector}`);
                  
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
                }
              }
            } else if (fromCurrency === 'EUR' && toCurrency === 'NGN' && /\b1[7-9][0-9]{2}(\.[0-9]+)?\b/.test(text.replace(/,/g, ''))) {
              // EUR-NGN rates are typically around 1800-1900
              const rateMatch = text.match(/(\d+[,\d]*(\.\d+)?)/);
              if (rateMatch) {
                const rate = parseFloat(rateMatch[0].replace(/,/g, ''));
                
                if (!isNaN(rate) && rate > 0) {
                  console.log(`Method 2 success: Found EUR-NGN rate ${rate} in element with selector ${selector}`);
                  
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
                }
              }
            } else if (fromCurrency === 'GBP' && toCurrency === 'GHS' && /\b1[5-9](\.[0-9]+)?\b/.test(text.replace(/,/g, ''))) {
              // GBP-GHS rates are typically around 15-19
              const rateMatch = text.match(/(\d+[,\d]*(\.\d+)?)/);
              if (rateMatch) {
                const rate = parseFloat(rateMatch[0].replace(/,/g, ''));
                
                if (!isNaN(rate) && rate > 0) {
                  console.log(`Method 2 success: Found GBP-GHS rate ${rate} in element with selector ${selector}`);
                  
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
                }
              }
            } else if (fromCurrency === 'EUR' && toCurrency === 'GHS' && /\b1[2-6](\.[0-9]+)?\b/.test(text.replace(/,/g, ''))) {
              // EUR-GHS rates are typically around 12-16
              const rateMatch = text.match(/(\d+[,\d]*(\.\d+)?)/);
              if (rateMatch) {
                const rate = parseFloat(rateMatch[0].replace(/,/g, ''));
                
                if (!isNaN(rate) && rate > 0) {
                  console.log(`Method 2 success: Found EUR-GHS rate ${rate} in element with selector ${selector}`);
                  
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
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error with selector ${selector}:`, error);
      }
    }
    
    // Method 3: Take a screenshot for debugging purposes
    console.log('Method 3: Taking screenshot for debugging');
    await page.screenshot({ path: 'ace-money-transfer-debug.png' });
    
    console.log('All methods failed to extract rate directly');
    return false;
  } catch (error) {
    console.error('Error scraping ACE Money Transfer rate:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}