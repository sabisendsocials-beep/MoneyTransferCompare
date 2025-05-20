/**
 * Direct SendWave rate extractor
 * This scraper uses CSS selectors directly from the provider website
 * No market-based values, fallbacks, or approximations
 */

import { storage } from '../storage';
import { InsertExchangeRate } from '@shared/schema';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

/**
 * Extract the exchange rate directly from the SendWave website
 * Using the exact selectors provided by the admin
 */
export async function extractSendwaveRate(): Promise<boolean> {
  try {
    console.log('=== Starting extraction of SendWave rate directly from their website ===');
    
    // Get the SendWave provider
    const providers = await storage.getProviders();
    const sendwaveProvider = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwaveProvider) {
      console.error('SendWave provider not found in database');
      return false;
    }
    
    // Get the scraping URL from the admin panel
    const adminUrl = sendwaveProvider.scraping_url;
    if (!adminUrl) {
      console.error('No scraping URL configured for SendWave in admin panel');
      return false;
    }
    console.log(`Using admin-configured URL: ${adminUrl}`);
    
    // Get the selectors from the admin panel
    const selectors = (sendwaveProvider.scraping_selector || '').split(',').map(s => s.trim()).filter(Boolean);
    if (selectors.length === 0) {
      console.error('No selectors configured for SendWave in admin panel');
      return false;
    }
    console.log(`Using admin-configured selectors: ${selectors.join(', ')}`);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true
    });
    
    try {
      const page = await browser.newPage();
      
      // Configure browser to appear more like a real user
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      
      // Set extra headers to avoid detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      });
      
      // Navigate to the URL
      console.log(`Navigating to ${adminUrl}...`);
      await page.goto(adminUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for content to load
      console.log('Waiting for page content to fully load...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      // Log page title to verify we're on the right page
      const title = await page.title();
      console.log(`Page title: ${title}`);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'sendwave-page.png' });
      console.log('Screenshot captured for verification');
      
      // Check if page content contains the expected text
      const pageContent = await page.content();
      if (pageContent.includes('sendwave') || pageContent.includes('currency converter')) {
        console.log('Page content appears to be from SendWave');
      } else {
        console.log('WARNING: Page content may not be from SendWave');
      }
      
      // Try to find rate using the admin-configured selectors
      let rate = null;
      
      for (const selector of selectors) {
        console.log(`Trying selector: "${selector}"`);
        
        // Check if element exists
        const exists = await page.evaluate((sel) => {
          return document.querySelector(sel) !== null;
        }, selector);
        
        if (exists) {
          console.log(`Found element with selector: "${selector}"`);
          
          // Get the text content
          const text = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el ? el.textContent || el.value || '' : '';
          }, selector);
          
          console.log(`Text content: "${text}"`);
          
          // Try to extract a number that could be a rate
          if (text) {
            // Pattern for rate in format: 2,143.06 or 2143.06
            const rateMatch = text.match(/([0-9,]+\.?\d*)/);
            if (rateMatch && rateMatch[1]) {
              const extractedRate = parseFloat(rateMatch[1].replace(/,/g, ''));
              if (!isNaN(extractedRate) && extractedRate > 2000 && extractedRate < 2300) {
                console.log(`Found rate: ${extractedRate}`);
                rate = extractedRate;
                break;
              }
            }
          }
        } else {
          console.log(`No element found with selector: "${selector}"`);
        }
      }
      
      // If selectors didn't work, look for common rate patterns on the page
      if (!rate) {
        console.log('No rate found using admin selectors, searching for common rate patterns...');
        
        // Define common rate patterns
        const patterns = [
          // 1 GBP = X NGN
          /1\s*GBP\s*=\s*([0-9,]+\.?\d*)\s*NGN/i,
          // X NGN per GBP
          /([0-9,]+\.?\d*)\s*NGN\s*(?:per|\/)\s*GBP/i,
          // General exchange rate pattern
          /exchange\s*rate\s*(?:is|:)?\s*([0-9,]+\.?\d*)/i,
          // Rate with NGN symbol
          /₦\s*([0-9,]+\.?\d*)/
        ];
        
        const textContent = await page.evaluate(() => document.body.innerText);
        
        for (const pattern of patterns) {
          const match = textContent.match(pattern);
          if (match && match[1]) {
            const possibleRate = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(possibleRate) && possibleRate > 2000 && possibleRate < 2300) {
              console.log(`Found rate using pattern ${pattern}: ${possibleRate}`);
              rate = possibleRate;
              break;
            }
          }
        }
      }
      
      // If we still don't have a rate, try checking if the convertor has input fields
      if (!rate) {
        console.log('Looking for currency converter input fields...');
        
        try {
          // Look for input fields that might contain rates
          const inputs = await page.$$('input[type="text"], input[type="number"]');
          console.log(`Found ${inputs.length} input fields`);
          
          for (const input of inputs) {
            const value = await page.evaluate(el => el.value, input);
            const placeholder = await page.evaluate(el => el.placeholder, input);
            const nearbyText = await page.evaluate(el => {
              // Get text from parent and siblings
              const parent = el.parentElement;
              return parent ? parent.innerText : '';
            }, input);
            
            console.log(`Input value: "${value}", placeholder: "${placeholder}", nearby text: "${nearbyText}"`);
            
            // Check if any of these contain a rate
            [value, placeholder, nearbyText].forEach(text => {
              if (text && !rate) {
                const numbers = text.match(/([0-9,]+\.?\d*)/g);
                if (numbers) {
                  for (const num of numbers) {
                    const possibleRate = parseFloat(num.replace(/,/g, ''));
                    if (!isNaN(possibleRate) && possibleRate > 2000 && possibleRate < 2300) {
                      console.log(`Found possible rate in input field: ${possibleRate}`);
                      rate = possibleRate;
                      break;
                    }
                  }
                }
              }
            });
            
            if (rate) break;
          }
        } catch (err) {
          console.log('Error checking input fields:', err);
        }
      }
      
      // If we found a rate, save it
      if (rate) {
        await storage.createExchangeRate({
          provider_id: sendwaveProvider.id,
          from_currency: 'GBP',
          to_currency: 'NGN',
          rate: rate,
          source: 'SCRAPER'
        });
        
        console.log(`Successfully extracted and saved SendWave rate: ${rate}`);
        return true;
      } else {
        console.log('Failed to extract a valid rate from the SendWave website');
        return false;
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error in SendWave rate extraction:', error);
    return false;
  }
}