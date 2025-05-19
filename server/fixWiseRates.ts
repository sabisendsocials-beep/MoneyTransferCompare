/**
 * Comprehensive Wise rate fix script
 * This direct approach ensures the Wise provider has API-only collection
 * and that rates are properly stored in the database
 */
import { storage } from './storage';
import { db } from './db';
import { providers, exchangeRates } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';

// Interface for Wise API rate response
interface WiseRate {
  source: string;
  target: string;
  rate: number;
  time: string;
}

// Execute the fix
export async function fixWiseRates(): Promise<boolean> {
  console.log('=== Starting comprehensive Wise rate fix ===');
  
  try {
    // Step 1: Find the Wise provider or create it if it doesn't exist
    const allProviders = await storage.getProviders();
    let wiseProvider = allProviders.find(p => p.name === 'Wise');
    
    if (!wiseProvider) {
      console.log('Wise provider not found, creating new one...');
      wiseProvider = await storage.createProvider({
        name: 'Wise',
        website_url: 'https://wise.com',
        logo: 'https://wise.com/public-resources/assets/logos/wise/brand_logo.svg',
        active: true,
        fixed_fee: 3.69,
        transfer_time: '1-2 days',
        rating: 4.5,
        preferred_collection: 'API',
        has_api: true,
        scraping_url: null,
        scraping_selector: null
      });
      console.log(`Created new Wise provider with ID: ${wiseProvider.id}`);
    } else {
      // Make sure it's configured correctly
      console.log(`Found existing Wise provider with ID: ${wiseProvider.id}`);
      
      if (wiseProvider.preferred_collection !== 'API' || !wiseProvider.has_api) {
        console.log('Updating Wise provider to use API collection...');
        wiseProvider = await storage.updateProvider(wiseProvider.id, {
          preferred_collection: 'API',
          has_api: true,
          active: true
        });
        console.log('✓ Wise provider updated to use API collection');
      }
    }
    
    // Step 2: Delete all existing Wise rates
    const deleteCount = await db.delete(exchangeRates)
      .where(eq(exchangeRates.provider_id, wiseProvider.id));
    
    console.log(`Deleted all existing Wise rates (${deleteCount} records)`);
    
    // Step 3: Fetch fresh rates from Wise API
    if (!process.env.WISE_API_KEY) {
      console.error('WISE_API_KEY environment variable not set');
      return false;
    }
    
    console.log('Fetching fresh rates from Wise API...');
    
    // Currency pairs we're interested in
    const currencyPairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'NGN' },
      { from: 'EUR', to: 'GHS' },
    ];
    
    let successCount = 0;
    
    // Fetch and insert rates
    for (const pair of currencyPairs) {
      try {
        const { from, to } = pair;
        
        console.log(`Requesting Wise API rate for ${from} to ${to}...`);
        
        // Make API request
        const response = await axios.get(
          `https://api.wise.com/v1/rates`, {
            params: {
              source: from,
              target: to
            },
            headers: {
              'Authorization': `Bearer ${process.env.WISE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout to prevent hanging
          }
        );
        
        console.log(`Wise API response status: ${response.status}`);
        
        // Check if we got valid rates
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Get the most recent rate
          const latestRate = response.data[0] as WiseRate;
          
          // Insert rate into database with explicit API source
          const newRate = await storage.createExchangeRate({
            provider_id: wiseProvider.id,
            from_currency: from,
            to_currency: to,
            rate: latestRate.rate,
            source: 'API',
            source_url: 'Wise API',
            verified: true
          });
          
          console.log(`✓ Successfully added Wise rate for ${from} to ${to}: ${latestRate.rate} (ID: ${newRate.id})`);
          successCount++;
        } else {
          console.error(`No rate data returned from Wise API for ${from} to ${to}`);
        }
      } catch (error: any) {
        console.error(`Error fetching Wise rate for ${pair.from} to ${pair.to}:`, error.message);
      }
    }
    
    console.log(`=== Fix completed: added ${successCount} of ${currencyPairs.length} Wise rates ===`);
    return successCount > 0;
  } catch (error) {
    console.error('Error fixing Wise rates:', error);
    return false;
  }
}

// Run directly when this file is executed
if (import.meta.url === import.meta.resolve('./fixWiseRates.ts')) {
  (async () => {
    try {
      await fixWiseRates();
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}