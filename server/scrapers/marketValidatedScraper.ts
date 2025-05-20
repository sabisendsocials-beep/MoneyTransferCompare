/**
 * Market-validated SendWave scraper
 * 
 * This implementation prevents false positives by validating rates against current market conditions
 * and explicitly filtering out common false positives like table headers (1000, 2000, etc.)
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Update the SendWave exchange rate using market validation
 * @returns true if rate was successfully updated, false otherwise
 */
export async function updateSendwaveMarketValidated(): Promise<boolean> {
  try {
    console.log('=== Starting market-validated SendWave rate update ===');
    
    // Get the SendWave provider from the database
    const providers = await storage.getProviders();
    const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwaveProvider) {
      console.error('SendWave provider not found in database');
      return false;
    }
    
    // Get rates from reliable providers to establish a valid market range
    // This is essential to detect and filter out false positives
    const latestRates = await storage.getLatestRates('GBP', 'NGN');
    
    // Get reliable providers for comparing rates
    const remitlyProvider = providers.find(p => p.name === 'Remitly');
    const transferGoProvider = providers.find(p => p.name === 'TransferGo');
    
    // Get actual rates from reliable providers
    let remitlyRate = 0;
    let transferGoRate = 0;
    
    if (remitlyProvider) {
      const remitlyRateData = latestRates.find(r => r.provider_id === remitlyProvider.id);
      if (remitlyRateData) {
        remitlyRate = remitlyRateData.rate;
        console.log(`Current Remitly rate: ${remitlyRate}`);
      }
    }
    
    if (transferGoProvider) {
      const transferGoRateData = latestRates.find(r => r.provider_id === transferGoProvider.id);
      if (transferGoRateData) {
        transferGoRate = transferGoRateData.rate;
        console.log(`Current TransferGo rate: ${transferGoRate}`);
      }
    }
    
    // Set up valid rate range based on reliable providers
    let minValidRate = 2100;
    let maxValidRate = 2200;
    
    // If we have actual provider rates, use them to establish more precise bounds
    if (remitlyRate > 0 && transferGoRate > 0) {
      const minRate = Math.min(remitlyRate, transferGoRate);
      const maxRate = Math.max(remitlyRate, transferGoRate);
      
      // Set range to be slightly wider than the actual range to account for variation
      // But not so wide that we pick up false positives like 2000
      minValidRate = Math.max(2100, minRate * 0.97); // At least 2100, but possibly higher
      maxValidRate = maxRate * 1.03;
      
      console.log(`Valid rate range based on market data: ${minValidRate.toFixed(2)} - ${maxValidRate.toFixed(2)}`);
    } else {
      console.log(`Using default valid rate range: ${minValidRate} - ${maxValidRate}`);
    }
    
    // Known false positives that appear in table headers or sample calculations
    const knownFalsePositives = [1, 10, 20, 100, 200, 1000, 2000, 10000, 20000];
    
    // Try multiple URLs for SendWave
    const urls = [
      sendwaveProvider.scraping_url || 'https://www.sendwave.com/en/currency-converter/1-gbp_gb-ngn_ng',
      'https://www.sendwave.com/en/send-money-to-nigeria',
      'https://www.sendwave.com/en/send-money-from-uk-to-nigeria',
      'https://www.sendwave.com/en/gbp-to-ngn',
      'https://www.sendwave.com/en/'
    ].filter(Boolean) as string[];
    
    console.log(`Trying ${urls.length} possible SendWave URLs`);
    
    // Try each URL until we find a valid rate
    for (const url of urls) {
      console.log(`Trying URL: ${url}`);
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        
        if (!response.ok) {
          console.log(`Error fetching ${url}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content (${html.length} characters)`);
        
        // Parse the HTML with cheerio
        const $ = cheerio.load(html);
        
        // First priority: use the admin-configured selectors
        const adminSelectors = (sendwaveProvider.scraping_selector || '').split(',').map(s => s.trim()).filter(Boolean);
        console.log(`Admin-configured selectors: ${adminSelectors.join(', ')}`);
        
        // Only use these fallbacks if no admin selectors are configured
        const fallbackSelectors = [
          // Elements that typically contain exchange rate information
          'input[data-testid="exchange-calculator-receive-price"]',
          'h6[data-testid="title-exchange-rate"]',
          'span[style*="standard_receive_amount"]',
          '[data-testid="exchange-rate-text"] span',
          'input[aria-label*="exchange"]',
          'input[aria-label*="calculator"]',
          'span[style*="receive_amount"]',
          '[data-testid*="exchange"]',
          '[data-testid*="rate"]'
        ];
        
        // Use admin selectors if available, otherwise fall back to our defaults
        const universalSelectors = adminSelectors.length > 0 ? adminSelectors : fallbackSelectors;
        
        console.log(`Trying ${universalSelectors.length} SendWave-specific selectors`);
        
        // Try each selector until we find a valid rate
        for (const selector of universalSelectors) {
          console.log(`Trying selector: "${selector}"`);
          
          const elements = $(selector);
          console.log(`Found ${elements.length} elements matching selector "${selector}"`);
          
          if (elements.length > 0) {
            for (let i = 0; i < Math.min(elements.length, 10); i++) { // Limit to first 10 matches
              const element = elements[i];
              
              // Look for text content or value attribute
              let extractedText = '';
              
              // For input elements, check value attribute
              if ($(element).is('input')) {
                extractedText = $(element).attr('value') || '';
                console.log(`Input element ${i+1} value: "${extractedText}"`);
              } else {
                extractedText = $(element).text().trim();
                console.log(`Element ${i+1} text: "${extractedText}"`);
              }
              
              // Look for patterns in the extracted text
              let rate: number | null = null;
              
              // Pattern 1: Full "1 GBP = X NGN" format
              const gbpPattern = /1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i;
              const gbpMatch = extractedText.match(gbpPattern);
              if (gbpMatch && gbpMatch[1]) {
                rate = parseFloat(gbpMatch[1].replace(/,/g, ''));
              }
              
              // Pattern 2: Just the number (for input fields or spans with just the value)
              if (!rate && /^\s*[\d,.]+\s*$/.test(extractedText)) {
                rate = parseFloat(extractedText.replace(/,/g, ''));
              }
              
              // Pattern 3: Look for NGN followed by a number
              if (!rate) {
                const ngnPattern = /(\d[\d,.]*)\s*(?:NGN|naira)/i;
                const ngnMatch = extractedText.match(ngnPattern);
                if (ngnMatch && ngnMatch[1]) {
                  rate = parseFloat(ngnMatch[1].replace(/,/g, ''));
                }
              }
              
              // If we found a potential rate, validate it
              if (rate !== null) {
                console.log(`Extracted potential rate: ${rate}`);
                  
                // Validate the rate is NOT a known false positive and is in the valid range
                if (!isNaN(rate) && !knownFalsePositives.includes(rate) && rate >= minValidRate && rate <= maxValidRate) {
                  console.log(`Found valid rate from selector "${selector}": ${rate}`);
                  
                  // Update the database with the new rate
                  await storage.createExchangeRate({
                    provider_id: sendwaveProvider.id,
                    from_currency: 'GBP',
                    to_currency: 'NGN',
                    rate: rate,
                    source: 'SCRAPER'
                  });
                  
                  console.log(`Successfully updated SendWave rate: ${rate}`);
                  return true;
                } else if (!isNaN(rate)) {
                  console.log(`Found rate ${rate} but it's either a known false positive or outside valid range`);
                }
              }
            }
          }
        }
        
        // Get all text from the page
        const pageText = $('body').text();
        
        // Look for rate patterns
        const ratePatterns = [
          /1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i,
          /GBP\s*to\s*NGN.*?(\d{4}[\d,.]*)/i,
          /exchange\s*rate.*?(\d{4}[\d,.]*)/i
        ];
        
        for (const pattern of ratePatterns) {
          const match = pageText.match(pattern);
          if (match && match[1]) {
            const rate = parseFloat(match[1].replace(/,/g, ''));
            
            // Validate the rate
            if (!isNaN(rate) && !knownFalsePositives.includes(rate) && rate >= minValidRate && rate <= maxValidRate) {
              console.log(`Found valid rate from pattern: ${rate}`);
              
              // Create a new exchange rate record
              await storage.createExchangeRate({
                provider_id: sendwaveProvider.id,
                from_currency: 'GBP',
                to_currency: 'NGN',
                rate: rate,
                source: 'SCRAPER'
              });
              
              console.log(`Successfully updated SendWave rate: ${rate}`);
              return true;
            } else if (!isNaN(rate)) {
              console.log(`Found rate ${rate} from pattern but it's either a known false positive or outside valid range`);
            }
          }
        }
        
        // Extract all numbers and look for values that could be rates
        const numberMatches = pageText.match(/\b(\d{4,}(?:\.\d+)?)\b/g) || [];
        if (numberMatches.length > 0) {
          console.log(`Found ${numberMatches.length} potential rate numbers`);
          console.log(`Sample numbers: ${numberMatches.slice(0, 10).join(', ')}`);
          
          // Filter out known false positives and validate against expected range
          const validRates = numberMatches
            .map(n => parseFloat(n))
            .filter(n => {
              // Must be a valid number
              if (isNaN(n)) return false;
              
              // Check if it's a known false positive
              if (knownFalsePositives.includes(n)) {
                console.log(`Filtering out known false positive: ${n}`);
                return false;
              }
              
              // Check if it's in the valid rate range
              const isInValidRange = n >= minValidRate && n <= maxValidRate;
              if (!isInValidRange) {
                console.log(`Number ${n} is outside valid rate range (${minValidRate.toFixed(2)} - ${maxValidRate.toFixed(2)})`);
                return false;
              }
              
              console.log(`Found possible valid rate: ${n}`);
              return true;
            });
          
          if (validRates.length > 0) {
            console.log(`Found valid rates: ${validRates.join(', ')}`);
            
            // Use the first valid rate
            const rate = validRates[0];
            
            // Create a new exchange rate record
            await storage.createExchangeRate({
              provider_id: sendwaveProvider.id,
              from_currency: 'GBP',
              to_currency: 'NGN',
              rate: rate,
              source: 'SCRAPER'
            });
            
            console.log(`Successfully updated SendWave rate: ${rate}`);
            return true;
          }
        }
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
      }
    }
    
    // If we get here, we couldn't find a valid rate
    console.log('Failed to find a valid SendWave rate - no rates in the expected range were found');
    return false;
  } catch (error) {
    console.error('Error in SendWave market-validated scraper:', error);
    return false;
  }
}