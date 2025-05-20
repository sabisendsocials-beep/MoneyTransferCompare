/**
 * Targeted SendWave scraper for GBP to NGN rate
 * This scraper only looks for the exchange rate near specific currency indicators
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';

/**
 * Extract rate by targeting only elements with specific currency indicators
 */
export async function extractSendwaveRate(): Promise<boolean> {
  try {
    console.log('=== Starting targeted SendWave rate extraction ===');
    
    // Get the SendWave provider from database
    const providers = await storage.getProviders();
    const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwaveProvider) {
      console.error('SendWave provider not found in database');
      return false;
    }
    
    // Use the URL from admin configuration
    const adminUrl = sendwaveProvider.scraping_url;
    
    if (!adminUrl) {
      console.error('No SendWave scraping URL configured');
      return false;
    }
    
    console.log(`Using admin-configured URL: ${adminUrl}`);
    
    // Multiple attempts with increasing delays
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delayMs = attempt * 4000; // 4s, 8s, 12s
      
      console.log(`\nAttempt ${attempt}/${maxAttempts} with ${delayMs}ms delay...`);
      
      try {
        // Fetch the page with browser-like headers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(adminUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
          console.log(`Error fetching ${adminUrl}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const html = await response.text();
        console.log(`Retrieved HTML content (${html.length} characters)`);
        
        // Wait to allow JavaScript execution
        console.log(`Waiting ${delayMs}ms before processing...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Define a function to check if a candidate rate is valid
        const isValidRate = (rate: number): boolean => {
          // Valid GBP to NGN rates should be in this range
          // Current rates are around 2100-2200 (May 2025)
          return !isNaN(rate) && rate > 2000 && rate < 2300 && rate !== 2024;
        };
        
        // Parse with cheerio
        const $ = cheerio.load(html);
        
        console.log('Looking for exchange rate values near currency indicators...');
        
        // Array to track potential rates
        const potentialRates: number[] = [];
        
        // APPROACH 1: Look for currency-specific elements
        $('*:contains("GBP"):contains("NGN")').each((i, el) => {
          const text = $(el).text();
          console.log(`Found GBP+NGN element ${i+1}: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
          
          // Look for patterns like "1 GBP = X NGN"
          const ratePattern = /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i;
          const match = text.match(ratePattern);
          
          if (match && match[1]) {
            const rate = parseFloat(match[1].replace(/,/g, ''));
            if (isValidRate(rate)) {
              console.log(`Found valid rate in GBP/NGN element: ${rate}`);
              potentialRates.push(rate);
            }
          }
          
          // Look for any numbers in the valid range
          const numberPattern1 = /\b([0-9,]+\.?\d*)\b/g;
          let match1;
          while ((match1 = numberPattern1.exec(text)) !== null) {
            const rate = parseFloat(match1[1].replace(/,/g, ''));
            if (isValidRate(rate)) {
              console.log(`Found potential rate in GBP/NGN element: ${rate}`);
              potentialRates.push(rate);
            }
          }
        });
        
        // APPROACH 2: Look specifically for exchange rate test ID elements
        $('[data-testid*="exchange"], [data-testid*="rate"]').each((i, el) => {
          const text = $(el).text();
          console.log(`Found rate-related element ${i+1}: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
          
          // Look for any numbers in the valid range
          const numberPattern2 = /\b([0-9,]+\.?\d*)\b/g;
          let match2;
          while ((match2 = numberPattern2.exec(text)) !== null) {
            const rate = parseFloat(match2[1].replace(/,/g, ''));
            if (isValidRate(rate)) {
              console.log(`Found potential rate in rate element: ${rate}`);
              potentialRates.push(rate);
            }
          }
        });
        
        // APPROACH 3: Check input fields that might contain the exchange rate
        $('input[type="text"], input[type="number"], input[inputmode="numeric"]').each((i, el) => {
          const value = $(el).attr('value');
          if (value) {
            console.log(`Found input ${i+1} with value: "${value}"`);
            
            const rate = parseFloat(value.replace(/,/g, ''));
            if (isValidRate(rate)) {
              console.log(`Found potential rate in input value: ${rate}`);
              potentialRates.push(rate);
            }
          }
        });
        
        // APPROACH 4: Find numeric values in elements containing currency codes
        $('*:contains("NGN")').each((i, el) => {
          const text = $(el).text();
          
          // Skip very long texts or known false positives
          if (text.length > 200 || text.includes('©')) return;
          
          const numberPattern3 = /\b([0-9,]+\.?\d*)\b/g;
          let match3;
          while ((match3 = numberPattern3.exec(text)) !== null) {
            const rate = parseFloat(match[1].replace(/,/g, ''));
            if (isValidRate(rate)) {
              console.log(`Found potential rate near NGN: ${rate}`);
              potentialRates.push(rate);
            }
          }
        });
        
        // If we found potential rates, use the most common one
        if (potentialRates.length > 0) {
          console.log(`Found ${potentialRates.length} potential rates: ${potentialRates.join(', ')}`);
          
          // Find the mode (most common value)
          const countMap = new Map<number, number>();
          let maxCount = 0;
          let mode = potentialRates[0];
          
          for (const rate of potentialRates) {
            const count = (countMap.get(rate) || 0) + 1;
            countMap.set(rate, count);
            
            if (count > maxCount) {
              maxCount = count;
              mode = rate;
            }
          }
          
          console.log(`Most common rate (occurs ${maxCount} times): ${mode}`);
          
          // If no clear mode, use the median
          if (maxCount === 1) {
            potentialRates.sort((a, b) => a - b);
            const median = potentialRates[Math.floor(potentialRates.length / 2)];
            console.log(`Using median value: ${median}`);
            mode = median;
          }
          
          // Save the selected rate
          await storage.createExchangeRate({
            provider_id: sendwaveProvider.id,
            from_currency: 'GBP',
            to_currency: 'NGN',
            rate: mode,
            source: 'SCRAPER'
          });
          
          console.log(`Successfully saved SendWave rate: ${mode}`);
          return true;
        }
        
        console.log(`No valid rates found on attempt ${attempt}`);
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error);
      }
    }
    
    console.log('Failed to extract a valid SendWave rate after all attempts');
    return false;
  } catch (error) {
    console.error('Error in targeted SendWave scraper:', error);
    return false;
  }
}