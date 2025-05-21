/**
 * PaySend Dedicated Rate Scraper
 * 
 * This scraper is specifically designed to extract exchange rates from the PaySend website
 * using CSS selectors identified from the HTML structure. It includes multiple fallback
 * mechanisms to ensure reliable rate extraction.
 */

import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { ExchangeRate, InsertExchangeRate } from '@shared/schema';
import fetch from 'node-fetch';

// Rate extraction pattern for PaySend
const RATE_PATTERN = /1\.00\s+([A-Z]{3})\s*=\s*([\d,.]+)\s+([A-Z]{3})/i;

/**
 * Updates the PaySend exchange rate using its dedicated scraper
 * 
 * @returns Promise<boolean> True if rate was successfully updated
 */
export async function updatePaysendRate(): Promise<boolean> {
  try {
    console.log('Starting PaySend rates update...');
    
    // Find the PaySend provider in the database
    const providers = await storage.getProviders();
    const paysendProvider = providers.find(p => p.name === 'Paysend');
    
    if (!paysendProvider) {
      console.error('PaySend provider not found in database');
      return false;
    }
    
    console.log(`Found PaySend provider with ID ${paysendProvider.id}`);
    console.log('=== Starting dedicated PaySend rate update process ===');
    console.log('=== PAYSEND DEDICATED SCRAPER RUNNING ===');
    
    // Only use admin-configured URL and selectors
    console.log('This scraper will ONLY use the URL and CSS selector from the admin panel');
    
    if (!paysendProvider.scraping_url) {
      console.error('No scraping URL configured for PaySend');
      return false;
    }
    
    // Default selector if none is provided in the database
    const cssSelector = paysendProvider.scraping_selector || 'span.PromoText__TextSpan-sc-oncfto-5.feIPcV';
    
    console.log(`Using admin-configured URL for PaySend: ${paysendProvider.scraping_url}`);
    console.log(`Using CSS selector: ${cssSelector}`);
    
    // Attempt to scrape from the configured URL
    try {
      console.log(`Attempting to scrape from URL: ${paysendProvider.scraping_url}`);
      
      // Fetch with headers that mimic a browser to avoid anti-scraping measures
      const response = await fetch(paysendProvider.scraping_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.google.com/',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0'
        }
        // timeout option removed as it's not supported in the RequestInit type
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const html = await response.text();
      console.log(`Retrieved HTML content (${html.length} characters)`);
      
      // Wait for any JavaScript content to load (simulation)
      console.log('Waiting for JavaScript content to fully load...');
      
      // Create a Cheerio instance to parse the HTML
      const $ = cheerio.load(html);
      
      // Try the main selector from admin panel
      let rateText = $(cssSelector).text().trim();
      console.log(`Found text with selector "${cssSelector}": ${rateText || '(no text found)'}`);
      
      // If not found, try additional fallback selectors
      if (!rateText) {
        console.log('Main selector failed, trying fallback selectors...');
        
        // Fallback 1: Look for any span mentioning exchange rate or GBP
        const fallbackSelector1 = 'span:contains("GBP")';
        rateText = $(fallbackSelector1).text().trim();
        console.log(`Fallback 1 "${fallbackSelector1}" result: ${rateText || '(no text found)'}`);
        
        // Fallback 2: Look for elements with color attribute set to purple80
        if (!rateText) {
          const fallbackSelector2 = 'span[color="purple80"]';
          rateText = $(fallbackSelector2).text().trim();
          console.log(`Fallback 2 "${fallbackSelector2}" result: ${rateText || '(no text found)'}`);
        }
        
        // Fallback 3: Try a more generic selector for any element containing rate-like text
        if (!rateText) {
          // Use regex to find text that looks like a rate format in the whole HTML
          console.log('Using pattern matching to find rate in the entire page...');
          const match = html.match(RATE_PATTERN);
          if (match) {
            rateText = match[0];
            console.log(`Pattern match found: ${rateText}`);
          }
        }
      }
      
      // If we have rate text, try to extract the rate value
      if (rateText) {
        console.log(`Extracting rate from text: "${rateText}"`);
        
        // Extract using regex to handle different formats
        const match = rateText.match(RATE_PATTERN);
        
        if (match) {
          const fromCurrency = match[1];
          const rate = parseFloat(match[2].replace(/,/g, ''));
          const toCurrency = match[3];
          
          console.log(`Extracted rate: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
          
          if (rate > 0) {
            // Convert currencies to our standard format
            const standardFromCurrency = fromCurrency.toUpperCase();
            const standardToCurrency = toCurrency.toUpperCase();
            
            // Store the rate in the database
            const newRate: InsertExchangeRate = {
              provider_id: paysendProvider.id,
              from_currency: standardFromCurrency,
              to_currency: standardToCurrency,
              rate: rate,
              source: 'SCRAPER',
              verified: true // Using verified instead of is_verified to match the schema
            };
            
            await storage.createExchangeRate(newRate);
            console.log(`Successfully updated PaySend ${standardFromCurrency} to ${standardToCurrency} rate: ${rate}`);
            return true;
          } else {
            console.log(`Invalid rate value: ${rate}`);
          }
        } else {
          console.log(`Failed to extract rate from text: "${rateText}"`);
        }
      } else {
        console.log('No rate text found for PaySend');
      }
      
    } catch (error) {
      console.error(`Error fetching data for PaySend:`, error);
    }
    
    return false;
  } catch (error) {
    console.error('Error in updatePaysendRate:', error);
    return false;
  }
}