/**
 * Provider Protection Setup
 * 
 * This file sets up the provider protection system for the application.
 * It wraps the existing database storage with protection layers to ensure:
 * 1. Only admin panel can modify providers
 * 2. Core providers are never deleted
 * 3. Wise always uses API collection
 */

import { DatabaseStorage } from './databaseStorage';
import { createProtectedStorage } from './providerProtection';
import { db } from './db';
import { providers } from '@shared/schema';
import { eq } from 'drizzle-orm';

// The original storage instance
export let storage: DatabaseStorage;

/**
 * Initialize the storage with provider protection
 */
export async function initializeProtectedStorage(): Promise<void> {
  // Create the storage instance
  storage = new DatabaseStorage();
  
  // Wrap it with protection
  storage = createProtectedStorage(storage);
  
  // Ensure Wise is correctly configured
  await enforceWiseConfiguration();
  
  console.log('✅ Provider protection system initialized');
}

/**
 * Ensures Wise is correctly configured to use API collection
 */
async function enforceWiseConfiguration(): Promise<void> {
  // Find Wise provider
  const [wiseProvider] = await db
    .select()
    .from(providers)
    .where(eq(providers.name, 'Wise'));
  
  if (wiseProvider) {
    // Check if Wise is correctly configured
    if (wiseProvider.preferred_collection !== 'API' || !wiseProvider.has_api) {
      console.log('🔧 Fixing Wise provider configuration to use API collection');
      
      // Update Wise to use API collection
      await db
        .update(providers)
        .set({ 
          preferred_collection: 'API',
          has_api: true,
          api_url: wiseProvider.api_url || 'https://api.wise.com/v1/rates',
          api_key_required: true,
          api_response_path: wiseProvider.api_response_path || 'rate'
        })
        .where(eq(providers.id, wiseProvider.id));
      
      console.log('✅ Wise provider configuration corrected to use API collection');
    } else {
      console.log('✓ Wise provider correctly configured to use API collection');
    }
  } else {
    console.log('⚠️ Wise provider not found in database');
  }
}

// Initialize with protection
initializeProtectedStorage();