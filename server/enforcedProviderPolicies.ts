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
 * DISABLED: Wise provider enforcement
 * This function has been disabled to allow full admin control over provider settings
 * Admin panel now has complete authority over all provider configurations including Wise
 */
export async function enforceWiseAPISource(): Promise<number> {
  // Function disabled to respect admin panel authority
  console.log('Wise API enforcement disabled - admin panel has full control');
  return 0;
}

// Automatic enforcement disabled - admin panel controls all provider settings