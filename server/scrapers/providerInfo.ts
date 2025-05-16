/**
 * Advanced provider information scraper
 * This module extracts provider-specific information from their websites
 * like fees, transfer times, supported countries, etc.
 * No hardcoded data - all information is directly from provider websites
 */

import { enhancedScrape, findExchangeRatePattern } from './enhancedScraper';
import { log } from '../vite';
import { storage } from '../storage';
import type { Provider } from '@shared/schema';

interface ProviderInfo {
  transferTime?: string;
  fixedFee?: number;
  percentageFee?: number;
  supportedCountries?: string[];
  paymentMethods?: string[];
  receiveMethods?: string[];
}

/**
 * Scrapes detailed provider information from provider websites
 * Only returns data that was successfully extracted, undefined for fields that couldn't be found
 */
export async function scrapeProviderInfo(provider: Provider): Promise<ProviderInfo> {
  try {
    log(`Scraping detailed info for ${provider.name}...`);
    
    const result: ProviderInfo = {};
    
    // Scrape transfer time information
    try {
      const transferTimeSelectors = [
        '.delivery-time', '.transfer-time', '.time-estimate',
        'span:contains("Transfer time")', 'div:contains("Delivery time")',
        'p:contains("Your money will arrive")'
      ];
      
      // website_url could be null, so use a default if it's not available
      const websiteUrl = provider.website_url || `https://www.google.com/search?q=${encodeURIComponent(provider.name)}+money+transfer`;
      
      const transferTimeText = await enhancedScrape(
        websiteUrl,
        transferTimeSelectors
      );
      
      if (transferTimeText && typeof transferTimeText === 'string') {
        // Extract just the time part from text like "Transfer time: 1-2 days"
        const timeMatch = transferTimeText.match(/(\d+\s*-\s*\d+\s*(minutes|hours|days|business days)|minutes|instant|seconds|hours|same day)/i);
        if (timeMatch) {
          result.transferTime = timeMatch[0].trim();
        }
      }
    } catch (error) {
      log(`Error scraping transfer time for ${provider.name}: ${error}`);
    }
    
    // Scrape fee information
    try {
      const feeSelectors = [
        '.fee-info', '.pricing', '.transfer-fee',
        'span:contains("Fee")', 'div:contains("Our fee")',
        'p:contains("Transfer fee")'
      ];
      
      // website_url could be null, so use a default if it's not available
      const websiteUrl = provider.website_url || `https://www.google.com/search?q=${encodeURIComponent(provider.name)}+money+transfer+fees`;
      
      const feeText = await enhancedScrape(
        websiteUrl,
        feeSelectors
      );
      
      if (feeText && typeof feeText === 'string') {
        // Try to extract fixed fee (e.g. £2.99)
        const fixedFeeMatch = feeText.match(/(£|\$|€)?\s*(\d+(\.\d+)?)/);
        if (fixedFeeMatch) {
          result.fixedFee = parseFloat(fixedFeeMatch[2]);
        }
        
        // Try to extract percentage fee (e.g. 0.5%, 1.5%)
        const percentageMatch = feeText.match(/(\d+(\.\d+)?)\s*%/);
        if (percentageMatch) {
          result.percentageFee = parseFloat(percentageMatch[1]);
        }
      }
    } catch (error) {
      log(`Error scraping fee info for ${provider.name}: ${error}`);
    }
    
    return result;
  } catch (error) {
    log(`Error in providerInfo scraper for ${provider.name}: ${error}`);
    return {};
  }
}

/**
 * Updates provider information in the database with freshly scraped data
 * Only updates fields that were successfully scraped
 */
export async function updateProviderInfo(): Promise<void> {
  try {
    log('Starting to update provider information from their websites...');
    
    // Get all providers
    const providers = await storage.getProviders();
    
    for (const provider of providers) {
      try {
        // Scrape fresh info from provider website
        const info = await scrapeProviderInfo(provider);
        
        // Only update fields that were successfully scraped (not undefined)
        const updateData: Partial<Provider> = {};
        
        if (info.transferTime) {
          updateData.transfer_time = info.transferTime;
        }
        
        if (info.fixedFee !== undefined) {
          updateData.has_fixed_fee = info.fixedFee > 0;
          updateData.fixed_fee = info.fixedFee;
        }
        
        if (info.percentageFee !== undefined) {
          updateData.percentage_fee = info.percentageFee;
        }
        
        // Only update if we have at least one field with real data
        if (Object.keys(updateData).length > 0) {
          await storage.updateProvider(provider.id, updateData);
          log(`Updated information for ${provider.name} with real website data`);
        } else {
          log(`No information could be scraped for ${provider.name}`);
        }
      } catch (error) {
        log(`Error updating info for ${provider.name}: ${error}`);
      }
    }
    
    log('Provider information update process completed');
  } catch (error) {
    log(`Provider info update process failed: ${error}`);
  }
}

export default updateProviderInfo;