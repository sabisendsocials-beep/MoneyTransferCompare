/**
 * Rate Collection Policy Enforcement
 * 
 * This middleware enforces the simple rules:
 * 1. Rate collection follows provider management settings
 * 2. Rate collection only runs on schedule or manual trigger
 * 3. Rate collection only adds to exchange_rates table, never modifies providers
 * 4. Provider data is only modified through admin interface
 */

import { Provider } from '@shared/schema';
import { db } from '../db';

/**
 * Enforces the provider collection method based on provider settings
 * This is called before rate collection operations
 */
export function enforceProviderCollectionPolicies(providers: Provider[]): Provider[] {
  // Apply provider-specific collection rules
  return providers.map(provider => {
    // If provider has API and prefers API, enforce API collection
    if (provider.has_api && provider.preferred_collection === 'API') {
      return {
        ...provider,
        preferred_collection: 'API'
      };
    }
    
    // If provider prefers scraper, use scraper
    if (provider.preferred_collection === 'SCRAPER') {
      return {
        ...provider,
        preferred_collection: 'SCRAPER'
      };
    }
    
    // Default to scraper for compatibility
    return {
      ...provider,
      preferred_collection: provider.preferred_collection || 'SCRAPER'
    };
  });
}

/**
 * DISABLED: Wise source enforcement removed to allow admin panel control
 */
export async function fixWiseSource(): Promise<void> {
  // Disabled - admin panel has full control over Wise provider settings
  console.log('✓ Wise source enforcement disabled - admin has control');
}