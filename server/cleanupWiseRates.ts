/**
 * Dedicated script to clean up Wise rates
 * This completely purges all Wise rates and repopulates them via API-only
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { db } from './db';
import { exchangeRates, providers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { DatabaseStorage } from './databaseStorage';
import updateWiseRates from './api/wiseApi';

export async function cleanupWiseRates() {
  console.log('Starting comprehensive Wise rate cleanup...');
  
  try {
    // 1. Find the Wise provider
    const [wiseProvider] = await db.select()
      .from(providers)
      .where(eq(providers.name, 'Wise'));
    
    if (!wiseProvider) {
      console.error('Wise provider not found in database!');
      return false;
    }
    
    console.log(`Found Wise provider with ID: ${wiseProvider.id}`);
    
    // 2. Delete ALL existing Wise rates regardless of source
    const deleteResult = await db.delete(exchangeRates)
      .where(eq(exchangeRates.provider_id, wiseProvider.id));
    
    console.log(`Successfully deleted ALL existing Wise rates`);
    
    // 3. Re-populate with fresh API rates
    const success = await updateWiseRates();
    
    if (success) {
      console.log('Successfully repopulated Wise rates from API');
      return true;
    } else {
      console.error('Failed to repopulate Wise rates from API');
      return false;
    }
  } catch (error) {
    console.error('Error during Wise rate cleanup:', error);
    return false;
  }
}

// When running this file directly
if (import.meta.url === import.meta.resolve('./cleanupWiseRates.ts')) {
  (async () => {
    try {
      const success = await cleanupWiseRates();
      console.log(`Wise rate cleanup ${success ? 'completed successfully' : 'failed'}`);
      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error('Fatal error during Wise rate cleanup:', error);
      process.exit(1);
    }
  })();
}

export default cleanupWiseRates;