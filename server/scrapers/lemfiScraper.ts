/**
 * Special scraper for Lemfi that extracts the exchange rate.
 * This will help us get accurate exchange rates directly from the source.
 */

import { storage } from '../storage';

/**
 * Scrape the current exchange rate from Lemfi for GBP to NGN
 * @returns The extracted rate or null if not found
 */
export async function scrapeLemfiRate(): Promise<number | null> {
  try {
    // Use the Lemfi API endpoint that provides rates
    const apiUrl = 'https://lemfi.com/api/calculator/rates?sourceCurrency=GBP&targetCurrency=NGN&amount=100';
    
    console.log(`Scraping Lemfi rate from API endpoint: ${apiUrl}`);
    
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
      return null;
    }
    
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
    
    // Another approach: try to find HTML elements that might contain the rate
    const mainUrl = 'https://lemfi.com/en-gb/international-money-transfer';
    const mainResponse = await fetch(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    
    if (mainResponse.ok) {
      const html = await mainResponse.text();
      
      // Check for rate information in the HTML
      const ratePattern = /1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i;
      const rateMatch = html.match(ratePattern);
      if (rateMatch && rateMatch[1]) {
        const extractedRate = parseFloat(rateMatch[1].replace(/,/g, ''));
        console.log(`Found Lemfi rate in HTML: ${extractedRate}`);
        return extractedRate;
      }
      
      // Look for any number that might be the rate (around 1500-1600)
      const largeNumberPattern = /(1[5-6]\d\d(?:\.\d+)?)/g;
      let numberMatch;
      const possibleRates = [];
      
      // Manually collect all matches
      while ((numberMatch = largeNumberPattern.exec(html)) !== null) {
        if (match[1]) {
          possibleRates.push(parseFloat(match[1]));
        }
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