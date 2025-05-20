/**
 * Dedicated SendWave exchange rate scraper
 * 
 * This scraper is designed to reliably extract exchange rates from SendWave's website
 * using the admin-configured URL and CSS selectors. It handles the specific structure
 * of the SendWave exchange rate display.
 */

import puppeteer from 'puppeteer';
import type { ExchangeRate } from '@shared/schema';
import { db } from '../db';
import { providers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { DatabaseStorage } from '../databaseStorage';

/**
 * Updates the SendWave exchange rate based on the admin-configured URL and selectors
 * @returns Whether the update was successful
 */
export async function updateSendwaveRate(): Promise<boolean> {
  console.log('=== Starting dedicated SendWave rate update process ===');
  
  try {
    // Get the provider info from database
    const providers = await storage.getProviders();
    const sendwave = providers.find(p => p.name === 'Sendwave');
    
    if (!sendwave) {
      console.log('Sendwave provider not found in database');
      return false;
    }
    
    if (!sendwave.scraper_url || !sendwave.scraper_selector) {
      console.log('Sendwave scraper URL or selector not configured in admin panel');
      return false;
    }
    
    console.log(`Using configured URL: ${sendwave.scraper_url}`);
    console.log(`Using CSS selector: ${sendwave.scraper_selector}`);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    
    try {
      const page = await browser.newPage();
      
      // Set viewport for consistency
      await page.setViewport({ width: 1280, height: 800 });
      
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the page
      await page.goto(sendwave.scraper_url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for content to load
      await page.waitForTimeout(5000);
      
      // Try to extract the rate using the admin-configured selector
      let rateText = await page.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return null;
        
        for (const el of elements) {
          const text = el.textContent || '';
          if (text.includes('NGN') || text.includes('Exchange Rate') || text.includes('GBP')) {
            return text.trim();
          }
        }
        
        return elements[0].textContent?.trim() || null;
      }, sendwave.scraper_selector);
      
      if (!rateText) {
        console.log('No rate text found using the configured selector');
        
        // Try a more specific selector focused on data-testid attributes
        rateText = await page.evaluate(() => {
          // Try title first
          const titleElement = document.querySelector('[data-testid="title-exchange-rate"]');
          if (titleElement) {
            return titleElement.textContent?.trim() || null;
          }
          
          // Try the rate text
          const rateElement = document.querySelector('[data-testid="exchangerate-text"]');
          if (rateElement) {
            return rateElement.textContent?.trim() || null;
          }
          
          return null;
        });
      }
      
      if (!rateText) {
        console.log('No rate text found using data-testid attributes');
        return false;
      }
      
      console.log(`Extracted raw text: ${rateText}`);
      
      // Parse the rate from the text
      const rateMatch = rateText.match(/(\d+[\.,]?\d*)\s*NGN/i) || 
                        rateText.match(/(\d+[\.,]?\d*)/);
      
      if (!rateMatch) {
        console.log('Could not parse rate from text');
        return false;
      }
      
      const rateValue = parseFloat(rateMatch[1].replace(',', '.'));
      console.log(`Parsed rate: ${rateValue}`);
      
      if (isNaN(rateValue) || rateValue <= 0) {
        console.log('Invalid rate value');
        return false;
      }
      
      // Create the exchange rate entry
      const exchangeRate: ExchangeRate = {
        id: 0, // Will be set by the database
        provider_id: sendwave.id,
        from_currency: 'GBP',
        to_currency: 'NGN',
        rate: rateValue,
        created_at: new Date(),
        source: 'SCRAPER'
      };
      
      // Store in the database
      await storage.createExchangeRate(exchangeRate);
      console.log(`Successfully updated SendWave GBP to NGN rate: ${rateValue}`);
      
      return true;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error in SendWave scraper:', error);
    return false;
  }
}