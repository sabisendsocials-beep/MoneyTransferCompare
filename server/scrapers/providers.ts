import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertExchangeRate } from '@shared/schema';

export async function scrapeExchangeRates() {
  try {
    const providers = await storage.getActiveProviders();
    const results = [];

    for (const provider of providers) {
      if (!provider.scrapingUrl || !provider.scrapingSelector) {
        console.warn(`Provider ${provider.name} has no scraping configuration`);
        continue;
      }

      try {
        const response = await fetch(provider.scrapingUrl);
        if (!response.ok) {
          console.error(`Error fetching data for ${provider.name}: ${response.statusText}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const rateText = $(provider.scrapingSelector).text();
        const rate = extractExchangeRate(rateText, provider.name);

        if (rate) {
          const rateData: InsertExchangeRate = {
            providerId: provider.id,
            fromCurrency: 'GBP',
            toCurrency: 'NGN',
            rate
          };

          const savedRate = await storage.createExchangeRate(rateData);
          results.push(savedRate);
          console.log(`Scraped exchange rate for ${provider.name}: 1 GBP = ${rate} NGN`);
        } else {
          console.error(`Failed to extract rate for ${provider.name}`);
        }
      } catch (error) {
        console.error(`Error scraping ${provider.name}:`, error);
      }
    }

    return results;
  } catch (error) {
    console.error('Error in scrapeExchangeRates:', error);
    return [];
  }
}

// Helper function to extract the numeric exchange rate from text
function extractExchangeRate(text: string, providerName: string): number | null {
  try {
    let rateText = text.trim();
    
    // Different providers format their rates differently
    switch (providerName) {
      case 'Wise':
        // Example format: "1 GBP = 1,523 NGN"
        rateText = rateText.split('=')[1].trim();
        break;
      case 'Western Union':
        // Their specific format
        break;
      case 'MoneyGram':
        // Their specific format
        break;
      case 'Remitly':
        // Their specific format
        break;
      default:
        // Try to find a number pattern
        const match = rateText.match(/(\d+[.,]?\d*)/);
        if (match) {
          rateText = match[0];
        }
    }
    
    // Clean up the rate text and convert to number
    return parseFloat(rateText.replace(/[^\d.]/g, ''));
  } catch (error) {
    console.error(`Error extracting rate from text "${text}" for ${providerName}:`, error);
    return null;
  }
}

// This function would be called periodically to update rates
export async function updateExchangeRates() {
  console.log('Starting exchange rate update...');
  const results = await scrapeExchangeRates();
  console.log(`Updated ${results.length} exchange rates`);
  return results;
}
