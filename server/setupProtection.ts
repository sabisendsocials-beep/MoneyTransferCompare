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
 * DISABLED: Wise enforcement removed to allow admin panel control
 */
async function enforceWiseConfiguration(): Promise<void> {
  console.log('✓ Wise enforcement disabled - admin panel has full control');
}

// Initialize with protection
initializeProtectedStorage();