/**
 * Special scraper for Lemfi that extracts the exchange rate.
 * This will help us get accurate exchange rates directly from the source.
 */

import { storage } from '../storage';
import { insertExchangeRateSchema, InsertExchangeRate } from '@shared/schema';

/**
 * Scrape the current exchange rate from Lemfi for GBP to NGN
 * Implements multiple strategies to get the most accurate rate
 * @returns The extracted rate or null if not found
 */
export async function scrapeLemfiRate(): Promise<number | null> {
  try {
    console.log('=== LEMFI DEDICATED SCRAPER RUNNING ===');
    console.log('This scraper will try multiple approaches to get the Lemfi rate:');
    console.log('1. Try the API endpoint (might be protected)');
    console.log('2. Try to parse the HTML page for rate information');
    console.log('3. Look for common rate patterns in the page');
    
    // Try first with a direct approach - fetch the current quote as if we're making a transfer
    try {
      console.log('Trying direct quote from Lemfi...');
      const quoteResponse = await fetch('https://lemfi.com/en-gb/api/quotes', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Origin': 'https://lemfi.com',
          'Referer': 'https://lemfi.com/en-gb/international-money-transfer',
          'X-Forwarded-For': '212.58.244.22',
          'X-Country-Code': 'GB',
          'CF-IPCountry': 'GB'
        },
        body: JSON.stringify({
          amount: 100,
          sourceCurrency: 'GBP',
          targetCurrency: 'NGN',
          type: 'SEND'
        })
      });
      
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        console.log('Quote response:', JSON.stringify(quoteData));
        
        if (quoteData && quoteData.exchangeRate) {
          const exchangeRate = parseFloat(quoteData.exchangeRate);
          if (exchangeRate > 1000) {
            console.log(`Got direct Lemfi rate from quote API: ${exchangeRate}`);
            return exchangeRate;
          }
        }
      }
    } catch (error) {
      console.log('Failed to get direct quote:', error);
    }
    
    // Try multiple API endpoints for Lemfi with different amounts to get the most accurate rate
    const apiUrls = [
      'https://lemfi.com/api/calculator/rates?sourceCurrency=GBP&targetCurrency=NGN&amount=100',
      'https://lemfi.com/api/calculator/calculate?sourceCurrency=GBP&targetCurrency=NGN&amount=100',
      'https://lemfi.com/api/exchange-rates/GBP/NGN',
      'https://lemfi.com/en-gb/api/calculator/calculate?sourceCurrency=GBP&targetCurrency=NGN&amount=100',
      'https://lemfi.com/en-gb/api/calculator/calculate?sourceCurrency=GBP&targetCurrency=NGN&amount=1000',
      'https://lemfi.com/en-gb/api/currency-converter?from=GBP&to=NGN&amount=1'
    ];
    
    for (const apiUrl of apiUrls) {
      console.log(`Trying Lemfi API endpoint: ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Origin': 'https://lemfi.com',
            'Referer': 'https://lemfi.com/en-gb/international-money-transfer',
            'X-Forwarded-For': '212.58.244.22',
            'X-Forwarded-Proto': 'https',
            'X-Country-Code': 'GB',
            'CF-IPCountry': 'GB'
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch from Lemfi API: ${response.status} ${response.statusText}`);
        } else {
          const data = await response.json();
          console.log('Lemfi API response:', JSON.stringify(data));
          
          // Extract the rate from the response
          if (data && data.rate) {
            return parseFloat(data.rate);
          } else if (data && data.exchangeRate) {
            return parseFloat(data.exchangeRate);
          } else if (data && data.result) {
            // If we have the result for 100 GBP, divide by 100 to get the rate for 1 GBP
            const result = parseFloat(data.result);
            return result / 100;
          } else if (data && data.targetAmount && data.sourceAmount) {
            // Calculate the rate from target and source amounts
            return parseFloat(data.targetAmount) / parseFloat(data.sourceAmount);
          } else if (data && Array.isArray(data)) {
            // If it's an array, look for rate object
            for (const item of data) {
              if (item && item.rate) {
                return parseFloat(item.rate);
              }
            }
          }
        }
      } catch (error) {
        console.log(`API fetch failed for ${apiUrl}:`, error);
        // Continue to the next API endpoint
      }
    }
    
    // All API approaches failed, try using the enhanced scraper
    console.log('API approach failed, trying enhanced scraper...');
    
    // Import and use enhancedScrape function here
    const { enhancedScrape, getEnhancedSelectors } = await import('./enhancedScraper');
    
    try {
      console.log('Using enhanced scraper to get Lemfi rate');
      const lemfiUrl = 'https://lemfi.com/en-gb/send-money-to-nigeria';
      const selectors = getEnhancedSelectors('Lemfi');
      const rateText = await enhancedScrape(lemfiUrl, selectors);
      
      if (rateText) {
        console.log(`Enhanced scraper returned text: ${rateText}`);
        
        // Look for numbers in the text
        const matches = rateText.match(/\b(\d{4}[\d,.]*)\b/);
        if (matches && matches[1]) {
          const rate = parseFloat(matches[1].replace(/,/g, ''));
          console.log(`Found rate value from enhanced scraper: ${rate}`);
          if (rate > 1000) {
            return rate;
          }
        }
        
        // Try to extract from format "1 GBP = X NGN"
        const formatMatch = rateText.match(/1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i);
        if (formatMatch && formatMatch[1]) {
          const rate = parseFloat(formatMatch[1].replace(/,/g, ''));
          console.log(`Found formatted rate: ${rate}`);
          if (rate > 1000) {
            return rate;
          }
        }
      }
    } catch (error) {
      console.error('Enhanced scraper failed:', error);
    }
    
    // Try one more approach: direct HTML scraping
    console.log('Enhanced scraper failed, trying direct HTML parsing...');
    const mainUrl = 'https://lemfi.com/en-gb/send-money-to-nigeria';
    console.log(`Fetching HTML from ${mainUrl}`);
    
    const mainResponse = await fetch(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (mainResponse.ok) {
      const html = await mainResponse.text();
      console.log(`Retrieved HTML content (${html.length} characters)`);
      
      // Check for rate information in the HTML using various patterns
      console.log('Trying to find rate information in the HTML');
      
      // Looking for the exact format: "1 GBP = X NGN"
      const exactRatePattern = /1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i;
      const exactMatch = html.match(exactRatePattern);
      if (exactMatch && exactMatch[1]) {
        const rateValue = parseFloat(exactMatch[1].replace(/,/g, ''));
        console.log(`Found exact rate format: ${rateValue}`);
        if (rateValue > 1000) {
          return rateValue;
        }
      }
      
      // Exchange rate label format - looks for "Exchange rate" followed by a value
      const exchangeRatePattern = /Exchange\s*rate[^]*?1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i;
      const exchangeMatch = html.match(exchangeRatePattern);
      if (exchangeMatch && exchangeMatch[1]) {
        const rateValue = parseFloat(exchangeMatch[1].replace(/,/g, ''));
        console.log(`Found exchange rate label format: ${rateValue}`);
        if (rateValue > 1000) {
          return rateValue;
        }
      }
      
      // Look for any 4-digit number that might be a rate (common for GBP to NGN)
      const rateNumbers = html.match(/\b([\d,]{1,3}\.?\d{0,2}k?)\s*(?:NGN|naira)\b/gi);
      if (rateNumbers && rateNumbers.length > 0) {
        console.log(`Found potential rate values: ${rateNumbers.join(', ')}`);
        
        // Extract the first valid rate
        for (const rateText of rateNumbers) {
          // Remove commas and convert from format like "2.1k" to 2100
          let rateValue = rateText.replace(/,/g, '');
          if (rateValue.includes('k')) {
            rateValue = (parseFloat(rateValue.replace(/k/i, '')) * 1000).toString();
          }
          
          const rate = parseFloat(rateValue);
          if (rate > 1000) {
            console.log(`Using rate: ${rate}`);
            return rate;
          }
        }
      }
    }
    
    console.log('Failed to extract Lemfi rate using all available methods');
    return null;
  } catch (error) {
    console.error('Error scraping Lemfi rate:', error);
    return null;
  }
}

/**
 * Update the Lemfi exchange rate in the database
 * This function will be called from the main scraper
 */
export async function updateLemfiRate(): Promise<boolean> {
  try {
    const rate = await scrapeLemfiRate();
    
    if (!rate) {
      console.log('No rate found from Lemfi, not updating');
      return false;
    }
    
    // Return null if the rate is outside of reasonable bounds to indicate scraping failure 
    // We don't want to use fallback rates anymore
    if (rate > 3000 || rate < 1000) {
      console.warn(`WARNING: Scraped Lemfi rate ${rate} seems incorrect for GBP/NGN (outside 1000-3000 range).`);
      return false;
    }
    
    let finalRate = rate;
    
    // Get the Lemfi provider from the database
    const providers = await storage.getProviders();
    const lemfiProvider = providers.find(p => p.name === 'Lemfi');
    
    if (!lemfiProvider) {
      console.error('Lemfi provider not found in database');
      return false;
    }
    
    // Create a new exchange rate record
    await storage.createExchangeRate({
      provider_id: lemfiProvider.id,
      from_currency: 'GBP',
      to_currency: 'NGN',
      rate: finalRate
    });
    
    console.log(`Updated Lemfi exchange rate: 1 GBP = ${finalRate} NGN${finalRate !== rate ? ' (adjusted from ' + rate + ')' : ''}`);
    return true;
  } catch (error) {
    console.error('Error updating Lemfi rate:', error);
    return false;
  }
}