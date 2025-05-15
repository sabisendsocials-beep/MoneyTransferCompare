import puppeteer from 'puppeteer';

/**
 * Scrape exchange rate from a website using Puppeteer (headless browser)
 * This allows us to execute JavaScript and access dynamically loaded content
 * 
 * @param url The URL to scrape
 * @param selectors Array of CSS selectors to try for finding rate information
 * @param waitTime Time to wait for page to load in ms (default 5000ms)
 * @returns The extracted text content or null if not found
 */
export async function scrapeWithPuppeteer(
  url: string, 
  selectors: string[], 
  waitTime: number = 5000
): Promise<string | null> {
  let browser = null;
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set viewport and user agent to mimic a desktop browser
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Navigate to the page
    console.log(`Navigating to ${url} with Puppeteer...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait additional time for JavaScript to load dynamic content
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Try each selector
    let content = null;
    for (const selector of selectors) {
      try {
        // Wait for the selector to appear in the page
        await page.waitForSelector(selector, { timeout: 2000 });
        
        // Get the text content of the selector
        content = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          return element ? element.textContent : null;
        }, selector);
        
        if (content) {
          console.log(`Found content with selector "${selector}": ${content}`);
          break;
        }
      } catch (e) {
        console.log(`Selector "${selector}" not found or timed out.`);
      }
    }

    // If no content found with specific selectors, try to get all text on page and search for patterns
    if (!content) {
      console.log('No content found with specific selectors, searching for exchange rate patterns...');
      content = await page.evaluate(() => {
        // Get all visible text on the page
        const allElements = document.querySelectorAll('body *');
        let allText = '';
        
        // Collect text from all elements
        allElements.forEach(el => {
          if (el.textContent) {
            allText += el.textContent + ' ';
          }
        });
        
        // Common exchange rate patterns
        const ratePatterns = [
          /1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i,
          /£1\s*=\s*([\d,]+\.?\d*)\s*NGN/i,
          /1\s*British Pound\s*=\s*([\d,]+\.?\d*)\s*Nigerian Naira/i,
          /GBP\/NGN\s*:?\s*([\d,]+\.?\d*)/i
        ];
        
        // Try each pattern
        for (const pattern of ratePatterns) {
          const match = allText.match(pattern);
          if (match && match[1]) {
            return `1 GBP = ${match[1]} NGN`;
          }
        }
        
        return null;
      });
      
      if (content) {
        console.log(`Found exchange rate pattern in page text: ${content}`);
      }
    }

    // Take a screenshot for debugging (temporarily - can be removed in production)
    await page.screenshot({ path: 'debug-screenshot.png' });
    
    return content;
  } catch (error) {
    console.error('Error in Puppeteer scraper:', error);
    return null;
  } finally {
    // Make sure to close the browser
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Get Puppeteer selectors for a specific provider
 * These are more comprehensive selector sets for different providers
 */
export function getPuppeteerSelectors(providerName: string): string[] {
  switch (providerName) {
    case 'Lemfi':
      return [
        '.exchange-rate', 
        '.rate-value',
        '.currency-calculator__result',
        '[data-testid="exchange-rate"]',
        '.money-transfer-calculator__rate',
        // Look for elements containing text with GBP and NGN
        ':contains("GBP to NGN")',
        ':contains("£1 =")',
        ':contains("1 GBP =")'
      ];
    case 'Nala':
      return [
        '.exchange-rate',
        '.rate-display',
        '.conversion-rate',
        '.calculator-result',
        ':contains("GBP to NGN")',
        ':contains("£1 =")',
        ':contains("1 GBP =")'
      ];
    case 'Wise':
      return [
        '.rate-value',
        '.js-Calculator-rateValue',
        '.exchange-rate',
        ':contains("1 GBP =")'
      ];
    case 'WorldRemit':
      return [
        '.exchange-rate',
        '.converter-result',
        '.rate-display',
        ':contains("1 GBP =")'
      ];
    // Add more providers as needed
    default:
      return [
        '.exchange-rate',
        '.rate',
        '.rate-value',
        '.conversion-rate',
        ':contains("1 GBP =")',
        ':contains("£1 =")'
      ];
  }
}