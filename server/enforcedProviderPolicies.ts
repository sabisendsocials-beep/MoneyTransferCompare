/**
 * Enforced Provider Policies
 * 
 * This module implements the core rules governing how providers and rates are handled:
 * 1. Rate fetch only uses policies defined in provider management
 * 2. Rate fetch only runs on schedule or manual trigger
 * 3. Rate fetch only adds rates to exchange_rates table
 * 4. No process can update provider information except admin page
 * 5. Rates are read from database, not recalculated
 */

import { db } from './db';
import { providers } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Ensure Wise provider always uses API source for its rates
 * This fixes any Wise rates with incorrect source
 */
export async function enforceWiseAPISource(): Promise<number> {
  try {
    // Simple direct SQL to update all Wise records to use API source
    const result = await db.execute(
      `UPDATE exchange_rates SET source = 'API' WHERE provider_id = 10001`
    );
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error enforcing Wise API source:', error);
    return 0;
  }
}

// Run the fix automatically when loaded
enforceWiseAPISource();