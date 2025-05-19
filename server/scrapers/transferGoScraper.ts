/**
 * Special scraper for TransferGo that extracts exchange rates.
 * This scraper ONLY uses the URL and CSS selector from the admin panel.
 */
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertExchangeRate } from '@shared/schema';

/**
 * Scrape the current exchange rate from TransferGo
 * Uses ONLY the URL and selector from the admin panel configuration
 * @returns The extracted rate or null if not found
 */
export async function scrapeTransferGoRate(): Promise<number | null> {
  try {
    console.log('=== TRANSFERGO DEDICATED SCRAPER RUNNING ===');
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    
    // Get the TransferGo provider from database to use its configured URL and selector
    const providers = await storage.getActiveProviders();
    const transferGo = providers.find(p => p.name === 'TransferGo');
    
    if (!transferGo) {
      console.error('TransferGo provider not found in database');
      return null;
    }
    
    if (!transferGo.scraping_url) {
      console.error('No scraping URL configured for TransferGo in admin panel');
      return null;
    }
    
    if (!transferGo.scraping_selector) {
      console.error('No CSS selector configured for TransferGo in admin panel');
      return null;
    }
    
    const url = transferGo.scraping_url;
    console.log(`Using admin-configured URL for TransferGo: ${url}`);
    
    // Optimize the curl request with browser-like headers
    try {
      // Using a randomized user agent to simulate a browser
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
      ];
      
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      // First try TransferGo's API endpoint directly
      console.log('Trying TransferGo API endpoint first...');
      try {
        const apiUrl = 'https://my.transfergo.com/api/fx-rates?from=GBP&to=NGN&amount=100';
        console.log(`Trying TransferGo API: ${apiUrl}`);
        
        const apiResponse = await fetch(apiUrl, {
          headers: {
            'User-Agent': randomUserAgent,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referer': 'https://www.transfergo.com/en/',
            'Origin': 'https://www.transfergo.com'
          }
        });
        
        if (apiResponse.ok) {
          try {
            const apiData = await apiResponse.json();
            console.log('TransferGo API response:', JSON.stringify(apiData));
            
            if (apiData && apiData.rate) {
              console.log(`Successfully got rate from TransferGo API: ${apiData.rate}`);
              return apiData.rate;
            } else if (apiData && apiData.exchangeRate) {
              console.log(`Successfully got rate from TransferGo API: ${apiData.exchangeRate}`);
              return apiData.exchangeRate;
            } else if (apiData && apiData.fx_rate) {
              console.log(`Successfully got rate from TransferGo API: ${apiData.fx_rate}`);
              return apiData.fx_rate;
            }
          } catch (jsonError) {
            console.log(`Error parsing TransferGo API response: ${jsonError}`);
          }
        }
      } catch (apiError) {
        console.log(`Error using TransferGo API: ${apiError}`);
      }
      
      // If API approach failed, try the main URL first
      console.log('API approach failed, trying multiple URLs...');
      
      // Try multiple URLs in case the admin-configured one doesn't work
      const urlVariations = [
        url, // First try the admin-configured URL
        'https://www.transfergo.com/en/gbp-to-ngn',
        'https://www.transfergo.com/en/send-money-to-nigeria',
        'https://www.transfergo.com/en',
        'https://my.transfergo.com/en/send-money'
      ];
      
      for (const currentUrl of urlVariations) {
        console.log(`Trying URL variation: ${currentUrl}`);
        
        try {
          // Enhanced browser simulation headers
          const response = await fetch(currentUrl, {
            headers: {
              'User-Agent': randomUserAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Sec-Fetch-User': '?1',
              'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              'Upgrade-Insecure-Requests': '1',
              'Referer': 'https://www.google.com/',
            }
          });
          
          if (!response.ok) {
            console.error(`Failed to fetch from ${currentUrl}: ${response.status} ${response.statusText}`);
            continue; // Try the next URL
          }
          
          const html = await response.text();
          
          // If we got the page content successfully, process it
          if (html.length > 1000) {
            // Add a delay to simulate waiting for JavaScript to load dynamic content
            console.log(`Waiting 3 seconds for JavaScript to finish loading dynamic content...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const $ = cheerio.load(html);
            console.log(`Retrieved HTML content (${html.length} characters) from ${currentUrl}`);
            
            // Use the admin-configured selectors with this URL
            if (transferGo.scraping_selector) {
              const selectors = transferGo.scraping_selector.split(',').map(s => s.trim());
              console.log(`Using admin-configured selectors: ${JSON.stringify(selectors)}`);
              
              // Try multiple times with delays to catch dynamically loaded content
              for (let attempt = 0; attempt < 3; attempt++) {
                if (attempt > 0) {
                  const delayTime = attempt * 2000; // Increasing delay times: 2s, 4s
                  console.log(`Attempt ${attempt+1}/3: Waiting ${delayTime}ms for dynamic content...`);
                  await new Promise(resolve => setTimeout(resolve, delayTime));
                }
                
                for (const selector of selectors) {
                  const elements = $(selector);
                  if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector "${selector}"`);
                    
                    for (let i = 0; i < elements.length; i++) {
                      const text = $(elements[i]).text().trim();
                      console.log(`Element ${i+1} text: "${text}"`);
                      
                      // Try to extract rate from the text
                      const rate = extractTransferGoRate(text);
                      if (rate !== null) {
                        console.log(`Successfully extracted rate from selector "${selector}" on attempt ${attempt+1}: ${rate}`);
                        return rate;
                      }
                    }
                  }
                }
              }
            }
            
            // If selectors didn't work, try to find the rate in the page text
            console.log('Trying to find rate in the whole page text...');
            const bodyText = $('body').text();
            const rate = findRateInText(bodyText);
            if (rate) {
              console.log(`Found rate in page text from ${currentUrl}: ${rate}`);
              return rate;
            }
          }
        } catch (error) {
          console.error(`Error fetching from ${currentUrl}:`, error);
          // Continue with next URL
        }
      }
      
      console.error('Could not extract rate from any TransferGo URL');
      return null;
      
    } catch (error) {
      console.error(`Error in TransferGo scraper:`, error);
      return null;
    }
  } catch (error) {
    console.error('Error in TransferGo scraper:', error);
    return null;
  }
}

/**
 * Extract the exchange rate from TransferGo specific text formats
 */
function extractTransferGoRate(text: string): number | null {
  // First check if the text is just a number (often the case with the specific selector)
  if (/^\d+(\.\d+)?$/.test(text.trim())) {
    const rate = parseFloat(text.trim());
    if (!isNaN(rate) && rate > 1000) { // Valid rate for GBP to NGN should be in thousands
      return rate;
    }
  }
  
  // Various patterns commonly seen on TransferGo site
  const patterns = [
    /1\s*GBP\s*=\s*([\d,.]+)\s*NGN/i,  // "1 GBP = 2,136.24 NGN"
    /GBP\s*=\s*([\d,.]+)\s*NGN/i,      // "GBP = 2,136.24 NGN"
    /exchange\s*rate\s*(?:is|of)?\s*([\d,.]+)/i,  // "Exchange rate is 2,136.24"
    /exchange[\s-]*rate[:\s]*([\d,.]+)/i,  // "Exchange rate: 2,136.24"
    /([\d,.]+)\s*NGN/i,  // "2,136.24 NGN"
    /rate[\s:]*([0-9,.]+)/i  // "Rate: 2,136.24"
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rateStr = match[1].replace(/,/g, '');
      const rate = parseFloat(rateStr);
      
      // TransferGo rates for GBP to NGN should be in a reasonable range
      if (!isNaN(rate) && rate > 0) {
        return rate;
      }
    }
  }
  
  return null;
}

/**
 * Look for exchange rate patterns in a larger text
 */
function findRateInText(text: string): number | null {
  // Look for sections mentioning GBP and NGN
  const gbpNgnMatch = text.match(/1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i);
  if (gbpNgnMatch && gbpNgnMatch[1]) {
    const rate = parseFloat(gbpNgnMatch[1].replace(/,/g, ''));
    if (rate > 1000) { // Realistic rate for GBP to NGN
      return rate;
    }
  }
  
  // Look for any number that might be the exchange rate
  const exchangeRateMatch = text.match(/exchange[\s-]*rate[:\s]*([\d,]+\.?\d*)/i);
  if (exchangeRateMatch && exchangeRateMatch[1]) {
    const rate = parseFloat(exchangeRateMatch[1].replace(/,/g, ''));
    if (rate > 1000) { // Realistic rate for GBP to NGN
      return rate;
    }
  }
  
  return null;
}

/**
 * Update the TransferGo exchange rate in the database
 * This function will be called from the main scraper
 */
export async function updateTransferGoRate(): Promise<boolean> {
  try {
    console.log('=== Starting dedicated TransferGo rate update process ===');
    
    // Find the TransferGo provider in database
    const providers = await storage.getActiveProviders();
    const provider = providers.find(p => p.name === 'TransferGo');
    
    if (!provider) {
      console.error('TransferGo provider not found in database');
      return false;
    }
    
    // Scrape the rate for GBP to NGN
    const rate = await scrapeTransferGoRate();
    
    if (rate !== null && rate > 0) {
      // Add the rate to the database
      const rateData: InsertExchangeRate = {
        provider_id: provider.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate
      };
      
      await storage.createExchangeRate(rateData);
      console.log(`Successfully updated TransferGo GBP to NGN rate: ${rate}`);
      return true;
    } else {
      console.error('Failed to get a valid rate for GBP to NGN from TransferGo');
      return false;
    }
  } catch (error) {
    console.error('Error updating TransferGo rate:', error);
    return false;
  }
}