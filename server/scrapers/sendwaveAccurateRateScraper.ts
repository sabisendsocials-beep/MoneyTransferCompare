/**
 * SendWave accurate rate scraper
 * 
 * This implementation focuses on extracting only accurate rates
 * by filtering out common false positives and validating against market ranges
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Update the SendWave exchange rate
 * @returns true if rate was successfully updated, false otherwise
 */
export async function updateSendwaveAccurateRate(): Promise<boolean> {
  try {
    console.log('=== Starting SendWave accurate rate update ===');
    
    // Get the SendWave provider from the database
    const providers = await storage.getProviders();
    const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwaveProvider) {
      console.error('SendWave provider not found in database');
      return false;
    }
    
    // Get current rates from reliable providers to establish a valid range
    const latestRates = await storage.getLatestRates('GBP', 'NGN');
    
    // Find reliable providers in the database
    const remitlyProvider = providers.find(p => p.name === 'Remitly');
    const transferGoProvider = providers.find(p => p.name === 'TransferGo');
    
    // Get rates from reliable providers
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
    
    // Set up a valid range for rates based on market data
    // This helps filter out false positives like 2000 in table headers
    let minValidRate = 2100;
    let maxValidRate = 2200;
    
    // If we have reliable provider rates, use them to establish bounds
    if (remitlyRate > 0 && transferGoRate > 0) {
      const minRate = Math.min(remitlyRate, transferGoRate);
      const maxRate = Math.max(remitlyRate, transferGoRate);
      
      // Create a range that's 3% wider than the min/max to account for variations
      minValidRate = minRate * 0.97;
      maxValidRate = maxRate * 1.03;
      
      console.log(`Valid rate range based on reliable providers: ${minValidRate.toFixed(2)} - ${maxValidRate.toFixed(2)}`);
    } else {
      console.log(`Using default valid rate range: ${minValidRate} - ${maxValidRate}`);
    }
    
    // Try multiple URLs for SendWave
    const urls = [
      sendwaveProvider.website_url || 'https://www.sendwave.com/en/currency-converter/1-gbp_gb-ngn_ng',
      'https://www.sendwave.com/en/send-money-to-nigeria',
      'https://www.sendwave.com/en/send-money-from-uk-to-nigeria',
      'https://www.sendwave.com/en/gbp-to-ngn',
      'https://www.sendwave.com/en/'
    ];
    
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
        
        // Get all text from the page
        const pageText = $('body').text();
        
        // Find all 4-digit or larger numbers in the page text
        const numberMatches = pageText.match(/\b(\d{4,}(?:\.\d+)?)\b/g) || [];
        console.log(`Found ${numberMatches.length} potential rate numbers`);
        
        if (numberMatches.length > 0) {
          console.log(`Sample numbers: ${numberMatches.slice(0, 10).join(', ')}`);
          
          // Filter out common false positives
          console.log("Filtering out common false positives...");
          // First, eliminate known values that are definitely not rates but rather amounts in conversion tables
          const knownFalsePositives = [1, 10, 20, 100, 200, 1000, 2000, 10000, 20000];
          
          // Filter numbers to find valid rates
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
        
        // Look for rate patterns like "1 GBP = X NGN"
        const ratePatterns = [
          /1\s*GBP\s*=\s*([\d,]+\.?\d*)\s*NGN/i,
          /GBP\s*to\s*NGN.*?(\d{4}[\d,.]*)/i,
          /exchange\s*rate.*?(\d{4}[\d,.]*)/i
        ];
        
        for (const pattern of ratePatterns) {
          const match = pageText.match(pattern);
          if (match && match[1]) {
            const rate = parseFloat(match[1].replace(/,/g, ''));
            
            // Validate the rate is in the expected range
            if (!isNaN(rate) && rate >= minValidRate && rate <= maxValidRate) {
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
            }
          }
        }
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
      }
    }
    
    console.log('Failed to find a valid SendWave rate');
    return false;
  } catch (error) {
    console.error('Error in SendWave accurate rate scraper:', error);
    return false;
  }
}