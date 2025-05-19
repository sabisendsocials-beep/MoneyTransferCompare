import * as cheerio from 'cheerio';

/**
 * Enhanced scraper that uses advanced techniques to extract data from JavaScript-heavy websites
 * without requiring Puppeteer
 */

/**
 * Advanced scraping with customized headers to mimic a real browser
 * @param url The URL to scrape
 * @param selectors Array of CSS selectors to try
 * @returns The extracted text or null if not found
 */
export async function enhancedScrape(
  url: string, 
  selectors: string[]
): Promise<string | null> {
  try {
    // Make sure we're using the correct URL for each provider
    let scrapingUrl = url;
    if (url.includes('lemfi.com')) {
      // Always use this specific URL for Lemfi which contains their calculator
      scrapingUrl = 'https://lemfi.com/en-gb/international-money-transfer';
    } else if (url.includes('nala.money')) {
      // Always use the main page for Nala
      scrapingUrl = 'https://nala.money/';
    } else if (url.includes('worldremit.com')) {
      // For WorldRemit, use a better URL
      scrapingUrl = 'https://www.worldremit.com/en/gbp-to-ngn-exchange-rate';
    }
    
    // Add detailed debugging for WorldRemit
    if (scrapingUrl.includes('worldremit.com')) {
      console.log(`=== WORLDREMIT DEBUG: Scraping URL: ${scrapingUrl} ===`);
      console.log(`=== WORLDREMIT DEBUG: Using selectors: ${JSON.stringify(selectors)} ===`);
    } else {
      console.log(`Enhanced scraping of ${scrapingUrl}...`);
    }
    
    // Use fetch with browser-like headers to avoid being blocked
    const response = await fetch(scrapingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try each selector
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text) {
          if (url.includes('worldremit')) {
            console.log(`=== WORLDREMIT DEBUG: SUCCESS with selector "${selector}" ===`);
            console.log(`=== WORLDREMIT DEBUG: Found text: "${text}" ===`);
            
            // Try to extract rate from this text
            const rate = findExchangeRatePattern(text);
            if (rate) {
              console.log(`=== WORLDREMIT DEBUG: Successfully extracted rate: ${rate} ===`);
            } else {
              console.log(`=== WORLDREMIT DEBUG: Failed to extract rate from text ===`);
            }
          } else {
            console.log(`Found content with selector "${selector}": ${text}`);
          }
          return text;
        }
      }
    }
    
    // If no specific selector worked, try more targeted scraping first
    
    // Try to find any element mentioning exchange rates
    const exchangeRateElements = $('*:contains("exchange rate")');
    if (exchangeRateElements.length > 0) {
      for (let i = 0; i < exchangeRateElements.length; i++) {
        const elemText = $(exchangeRateElements[i]).text();
        const pattern = findExchangeRatePattern(elemText);
        if (pattern) {
          console.log(`Found exchange rate in targeted element: ${pattern}`);
          return pattern;
        }
      }
    }
    
    // Then try the whole page content
    const pageText = $('body').text();
    return findExchangeRatePattern(pageText);
    
  } catch (error) {
    console.error('Error in enhanced scraper:', error);
    return null;
  }
}

/**
 * Find exchange rate patterns in text
 * @param text The text to search in
 * @returns Found exchange rate text or null
 */
export function findExchangeRatePattern(text: string): string | null {
  // First look for common rate patterns
  const patterns = [
    // Standard exchange rate formats
    /(?:1|one)\s*(?:GBP|gbp|£)\s*(?:=|equals|is)\s*([\d,]+\.?\d*)\s*(?:NGN|ngn)/i,
    
    // WorldRemit specific format from screenshot (1 GBP = 2112.8843 NGN)
    /1\s*GBP\s*=\s*([\d,]+\.\d+)\s*NGN/i,
    
    // Rate display patterns
    /(?:rate|exchange rate|fx rate)[^\d]*([\d,]+\.?\d*)/i,
    /GBP\/NGN[^\d]*([\d,]+\.?\d*)/i,
    
    // For rates displayed with decimal points
    /(?:1|one)\s*(?:British Pound|Pound Sterling|GBP|£)[^\d]*(\d{1,3}(?:,\d{3})*\.\d{1,4})/i,
    
    // For rates displayed without decimal points (e.g., "1580 NGN")
    /(?:1|one)\s*(?:GBP|gbp|£)[^\d]*(\d{3,5})[^\d]*(?:NGN|ngn|Naira)/i,
    
    // For currency calculator results - from the screenshot we saw: "You send 100" / "They get 211288"
    /you\s*send\s*\d+.*?they\s*get\s*(\d[\d,]*)/i,
    /receive[^\d]*([\d,]+\.?\d*)[^\d]*(?:NGN|ngn|Naira)/i,
    /you\s*(?:get|receive)[^\d]*([\d,]+\.?\d*)[^\d]*(?:NGN|ngn|Naira)/i,
    /send.*?\s+(\d[\d,.]+)\s*NGN/i,
    /they\s*get\s*(\d[\d,]*)/i,
    
    // For providers that show the inverse rate (NGN to GBP)
    /(?:1000|1,000)\s*(?:NGN|ngn|Naira)[^\d]*([\d\.]+)\s*(?:GBP|gbp|£)/i,
    
    // For providers showing just the number (looking for GBP to NGN rates, which are typically in 1500-2200 range)
    /(1[5-9]\d\d(?:\.\d+)?|2[0-2]\d\d(?:\.\d+)?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // If it's an inverse rate (NGN to GBP), convert it to GBP to NGN
      if (pattern.toString().includes('1000')) {
        const inverseRate = parseFloat(match[1].replace(/,/g, ''));
        if (inverseRate > 0) {
          const directRate = (1000 / inverseRate).toFixed(2);
          return `1 GBP = ${directRate} NGN`;
        }
      }
      
      return `1 GBP = ${match[1]} NGN`;
    }
  }
  
  return null;
}

/**
 * Get enhanced scraping selectors for a specific provider
 */
export function getEnhancedSelectors(providerName: string): string[] {
  switch (providerName) {
    case 'Lemfi':
      return [
        '.exchange-rate', 
        '.rate-value',
        '.currency-calculator__result',
        '[data-testid="exchange-rate"]',
        '.money-transfer-calculator__rate',
        '.ExchangeRate',
        '.calculator__exchange-rate',
        '.calculator-result',
        'span:contains("exchange rate")',
        'div:contains("exchange rate")',
        'p:contains("1 GBP =")',
        'span:contains("1 GBP =")'
      ];
    case 'Nala':
      return [
        '.exchange-rate',
        '.rate-display',
        '.conversion-rate',
        '.calculator-result',
        '.rate',
        '.calculator__rate',
        'span:contains("exchange rate")',
        'div:contains("exchange rate")',
        'p:contains("1 GBP =")',
        'span:contains("1 GBP =")'
      ];
    case 'Wise':
      return [
        '.rate-value',
        '.js-Calculator-rateValue',
        '.exchange-rate',
        '.calculator__value--to',
        '.exchange-calculator__footer',
        'span:contains("1 GBP =")'
      ];
    case 'WorldRemit':
      return [
        // Updated selectors based on actual website structure
        '.exchange-rate-value',
        '.exchange-rate',
        '.converter-result',
        // This one matches the format in the screenshot (1 GBP = 2112.8843 NGN)
        '*:contains("1 GBP = ")',
        '*:contains("GBP")',
        '*:contains("NGN")',
        '*:contains("send")',
        '*:contains("get")',
        'span.font-bold',
        '[data-testid="rateValue"]',
        'h1',
        'h2'
      ];
    // Add more providers as needed
    default:
      return [
        '.exchange-rate',
        '.rate',
        '.rate-value',
        '.conversion-rate',
        '.calculator-result',
        '.calculator__rate',
        'span:contains("exchange rate")',
        'span:contains("1 GBP =")',
        'p:contains("1 GBP =")'
      ];
  }
}