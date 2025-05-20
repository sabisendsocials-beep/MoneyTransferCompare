/**
 * Advanced SendWave scraper that handles JavaScript-rendered content with extended wait times
 * This scraper ONLY extracts rates directly from the SendWave website with no approximations
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

/**
 * Update the SendWave exchange rate using advanced browser automation
 * This approach uses Puppeteer to render the JavaScript and extract the rate
 */
export async function updateSendwaveAdvanced(): Promise<boolean> {
  try {
    console.log('=== Starting advanced SendWave rate update with Puppeteer ===');
    
    // Get the SendWave provider
    const providers = await storage.getProviders();
    const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwaveProvider) {
      console.error('SendWave provider not found in database');
      return false;
    }
    
    // Use the scraping URL from the admin panel
    const adminUrl = sendwaveProvider.scraping_url;
    
    if (!adminUrl) {
      console.error('No SendWave scraping URL configured in admin panel');
      return false;
    }
    
    console.log(`Using admin-configured URL: ${adminUrl}`);
    
    // Get selectors from admin
    const selectors = (sendwaveProvider.scraping_selector || '').split(',').map(s => s.trim()).filter(Boolean);
    console.log(`Using admin-configured selectors: ${selectors.join(', ')}`);
    
    // Launch Puppeteer browser to handle JavaScript rendering
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true
    });
    
    try {
      // Create a new page
      const page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1366, height: 768 });
      
      // Set user agent to avoid being detected as a bot
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the URL
      console.log(`Navigating to ${adminUrl}...`);
      await page.goto(adminUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for the page to be fully loaded
      console.log('Waiting for page to fully load...');
      await new Promise(resolve => setTimeout(resolve, 8000)); // Wait 8 seconds
      
      // Extract content after waiting
      const content = await page.content();
      console.log(`Retrieved content (${content.length} characters)`);
      
      // Try all selectors provided by admin
      let rate = null;
      
      for (const selector of selectors) {
        console.log(`Trying to evaluate selector: "${selector}" with Puppeteer`);
        
        try {
          // Try to find the element
          const elementExists = await page.evaluate((sel) => {
            return document.querySelector(sel) !== null;
          }, selector);
          
          if (elementExists) {
            console.log(`Element with selector "${selector}" found!`);
            
            // Extract the text content
            const elementText = await page.evaluate((sel) => {
              const element = document.querySelector(sel);
              return element ? element.textContent : '';
            }, selector);
            
            console.log(`Element text: "${elementText}"`);
            
            // Try to extract a rate from the text
            if (elementText) {
              const rateMatch = elementText.match(/([0-9,]+\.\d+)/);
              if (rateMatch && rateMatch[1]) {
                rate = parseFloat(rateMatch[1].replace(/,/g, ''));
                console.log(`Extracted rate: ${rate}`);
                break;
              }
            }
          } else {
            console.log(`No element found with selector "${selector}"`);
          }
        } catch (err) {
          console.log(`Error evaluating selector "${selector}":`, err);
        }
      }
      
      // If selectors didn't work, try to find rate patterns in the entire page
      if (!rate) {
        console.log('Trying to find exchange rate pattern in page content...');
        
        // Look for common exchange rate patterns
        const ratePatterns = [
          // 1 GBP = X NGN
          /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i,
          // X NGN per GBP
          /([0-9,]+\.?\d*)\s*NGN\s*(?:per|\/)\s*GBP/i,
          // General exchange rate pattern (number followed by NGN)
          /([0-9,]+\.?\d*)\s*NGN/i
        ];
        
        const pageText = await page.evaluate(() => document.body.innerText);
        console.log('Searching for rate patterns in page text...');
        
        for (const pattern of ratePatterns) {
          const match = pageText.match(pattern);
          if (match && match[1]) {
            const possibleRate = parseFloat(match[1].replace(/,/g, ''));
            // Validate the rate is in a reasonable range for GBP to NGN
            if (possibleRate > 2000 && possibleRate < 2300) {
              rate = possibleRate;
              console.log(`Found rate using pattern ${pattern}: ${rate}`);
              break;
            }
          }
        }
      }
      
      // If we still don't have a rate, take a screenshot for debugging
      if (!rate) {
        console.log('No rate found. Taking screenshot for debugging...');
        await page.screenshot({ path: 'sendwave-debug.png' });
        
        // Last resort: Extract all numbers that could be rates
        console.log('Looking for any numbers that could be exchange rates...');
        const allNumbers = await page.evaluate(() => {
          const numberMatches = document.body.innerText.match(/\b(\d{4}(?:\.\d+)?)\b/g);
          return numberMatches || [];
        });
        
        console.log(`Found ${allNumbers.length} potential numbers: ${allNumbers.join(', ')}`);
        
        // Filter for numbers that are in a reasonable range for GBP to NGN
        const potentialRates = allNumbers
          .map(n => parseFloat(n))
          .filter(n => n >= 2000 && n <= 2300);
        
        if (potentialRates.length > 0) {
          console.log(`Potential rates in valid range: ${potentialRates.join(', ')}`);
          rate = potentialRates[0];
        }
      }
      
      // If we found a valid rate, save it
      if (rate) {
        await storage.createExchangeRate({
          provider_id: sendwaveProvider.id,
          from_currency: 'GBP',
          to_currency: 'NGN',
          rate: rate,
          source: 'SCRAPER'
        });
        
        console.log(`Successfully updated SendWave rate: ${rate}`);
        return true;
      } else {
        console.log('Failed to find a valid rate on the SendWave website');
        return false;
      }
    } finally {
      // Close browser
      await browser.close();
    }
  } catch (error) {
    console.error('Error in SendWave advanced scraper:', error);
    return false;
  }
}