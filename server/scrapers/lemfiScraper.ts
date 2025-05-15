/**
 * Special scraper for Lemfi that extracts the exchange rate.
 * This will help us get accurate exchange rates directly from the source.
 */

import { storage } from '../storage';

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
    
    // Use the Lemfi API endpoint that provides rates (first strategy)
    const apiUrl = 'https://lemfi.com/api/calculator/rates?sourceCurrency=GBP&targetCurrency=NGN&amount=100';
    
    console.log(`Scraping Lemfi rate from API endpoint: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Origin': 'https://lemfi.com',
          'Referer': 'https://lemfi.com/en-gb/international-money-transfer'
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
        }
      }
    } catch (error) {
      console.log('API fetch failed:', error);
      // Continue to the HTML scraping
    }
    
    // Another approach: try to find HTML elements that might contain the rate
    console.log('API approach failed, trying to scrape HTML page...');
    const mainUrl = 'https://lemfi.com/en-gb/international-money-transfer';
    console.log(`Fetching HTML from ${mainUrl}`);
    
    const mainResponse = await fetch(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (mainResponse.ok) {
      const html = await mainResponse.text();
      console.log(`Retrieved HTML content (${html.length} characters)`);
      
      // Check for rate information in the HTML using various patterns
      console.log('Trying to find rate information in the HTML using pattern: 1 GBP = X NGN');
      const ratePatterns = [
        /1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i,
        /GBP\s*1\s*=\s*NGN\s*([\d,]+\.?\d*)/i,
        /exchange\s*rate\s*.*?(\d+[\d,.]*)\s/i,
        /rate\s*.*?(\d+[\d,.]*)\s/i
      ];
      
      for (const pattern of ratePatterns) {
        const rateMatch = html.match(pattern);
        if (rateMatch && rateMatch[1]) {
          const extractedRate = parseFloat(rateMatch[1].replace(/,/g, ''));
          console.log(`Found Lemfi rate in HTML using pattern ${pattern}: ${extractedRate}`);
          
          if (extractedRate >= 1400 && extractedRate <= 1700) {
            return extractedRate;
          }
        }
      }
      
      console.log('Specific rate patterns failed, looking for any numbers in the range 1500-1600...');
      // Look for any number that might be the rate (around 1500-1600)
      const largeNumberPattern = /(1[4-7]\d\d(?:\.\d+)?)/g;
      let numberMatch;
      const possibleRates = [];
      
      // Manually collect all matches
      while ((numberMatch = largeNumberPattern.exec(html)) !== null) {
        if (numberMatch[1]) {
          possibleRates.push(parseFloat(numberMatch[1]));
        }
      }
      
      console.log(`Found ${possibleRates.length} possible rate values in the HTML`);
      if (possibleRates.length > 0) {
        console.log(`Possible rates: ${possibleRates.join(', ')}`);
      }
      
      // Filter rates that are in a reasonable range for GBP to NGN
      const reasonableRates = possibleRates.filter(r => r >= 1500 && r <= 1650);
      if (reasonableRates.length > 0) {
        console.log(`Found possible Lemfi rates in HTML: ${reasonableRates.join(', ')}`);
        return reasonableRates[0]; // Return the first reasonable rate
      }
    }
    
    console.log('Failed to extract Lemfi rate from both API and HTML');
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
      rate
    });
    
    console.log(`Updated Lemfi exchange rate: 1 GBP = ${rate} NGN`);
    return true;
  } catch (error) {
    console.error('Error updating Lemfi rate:', error);
    return false;
  }
}