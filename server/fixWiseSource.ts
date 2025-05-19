/**
 * Fix Wise Data Source
 * 
 * This script ensures that all Wise exchange rates have 'API' as their source
 * regardless of how they were collected, to maintain consistency with
 * Wise's API-only collection policy.
 */

import { db } from './db';
import { exchangeRates } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Fixes all Wise exchange rate sources to be API
 * @returns Count of records updated
 */
export async function fixWiseSource(): Promise<number> {
  try {
    console.log('Fixing Wise exchange rate sources...');
    
    // Use the known Wise provider ID (10001)
    const wiseProviderId = 10001;
    console.log(`Using Wise provider with ID: ${wiseProviderId}`);
    
    // Update all Wise exchange rates to use API as source
    const result = await db
      .update(exchangeRates)
      .set({ source: 'API' })
      .where(
        and(
          eq(exchangeRates.provider_id, wiseProviderId),
          eq(exchangeRates.source, 'SCRAPER')
        )
      );
    
    const updatedCount = result.rowCount || 0;
    console.log(`Updated ${updatedCount} Wise exchange rates to use API source`);
    
    return updatedCount;
  } catch (error) {
    console.error('Error fixing Wise data sources:', error);
    return 0;
  }
}

// Run the fix automatically when this module is imported
fixWiseSource();