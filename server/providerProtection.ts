/**
 * Provider Protection System
 * 
 * This system protects the provider database from unauthorized modifications
 * by wrapping provider-related operations with security checks.
 */

import { Provider, InsertProvider } from '@shared/schema';
import { DatabaseStorage } from './databaseStorage';
import { db } from './db';
import { providers } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Track admin authentication state
let isAdminAuthenticated = false;

/**
 * Authenticate admin request - call this from API routes
 * @param adminToken Admin authentication token
 * @param adminSource Source identifier (must be 'provider-management-panel')
 * @returns Whether authentication succeeded
 */
export function authenticateAdmin(
  adminToken: string | undefined,
  adminSource: string | undefined
): boolean {
  // Simple authentication check - in production, use a proper token verification
  isAdminAuthenticated = !!(adminToken && adminSource === 'provider-management-panel');
  
  if (isAdminAuthenticated) {
    console.log('✅ Provider admin authentication successful');
  } else {
    console.log('⚠️ Provider admin authentication failed');
  }
  
  return isAdminAuthenticated;
}

/**
 * Reset admin authentication state - call after request completes
 */
export function resetAdminAuthentication(): void {
  isAdminAuthenticated = false;
}

/**
 * Core providers that should never be deleted
 */
const PROTECTED_CORE_PROVIDERS = [
  'Wise',
  'Western Union',
  'MoneyGram',
  'WorldRemit',
  'Lemfi'
];

/**
 * Wrap a database storage instance with provider protection
 * @param storage The database storage to wrap
 * @returns Protected instance with the same interface
 */
export function createProtectedStorage(storage: DatabaseStorage): DatabaseStorage {
  // Create a proxy that intercepts operations on the provider table
  const protectedStorage = {
    ...storage,
    
    // Override provider creation
    createProvider: async (provider: InsertProvider): Promise<Provider> => {
      if (!isAdminAuthenticated) {
        console.error('🛑 BLOCKED: Unauthorized provider creation attempt');
        throw new Error('Provider protection active: Creation blocked');
      }
      
      // Special handling for Wise
      if (provider.name === 'Wise') {
        provider.preferred_collection = 'API';
        provider.has_api = true;
        console.log('🔒 Enforcing API collection policy for Wise provider');
      }
      
      return storage.createProvider(provider);
    },
    
    // Override provider update
    updateProvider: async (id: number, updates: Partial<InsertProvider>): Promise<Provider | undefined> => {
      if (!isAdminAuthenticated) {
        console.error('🛑 BLOCKED: Unauthorized provider update attempt');
        throw new Error('Provider protection active: Update blocked');
      }
      
      // Get the provider to check if it's Wise
      const provider = await storage.getProvider(id);
      
      // Special handling for Wise
      if (provider?.name === 'Wise' || updates.name === 'Wise') {
        updates.preferred_collection = 'API';
        updates.has_api = true;
        console.log('🔒 Enforcing API collection policy for Wise provider');
      }
      
      return storage.updateProvider(id, updates);
    },
    
    // Override provider deletion
    deleteAllProviders: async (): Promise<void> => {
      if (!isAdminAuthenticated) {
        console.error('🛑 BLOCKED: Unauthorized mass deletion attempt');
        throw new Error('Provider protection active: Mass deletion blocked');
      }
      
      console.warn('⚠️ Admin is deleting providers - protecting core providers...');
      
      // Instead of allowing a mass deletion, we'll selectively delete non-core providers
      const allProviders = await storage.getProviders();
      
      for (const provider of allProviders) {
        if (!PROTECTED_CORE_PROVIDERS.includes(provider.name)) {
          await db.delete(providers).where(eq(providers.id, provider.id));
          console.log(`Deleted provider: ${provider.name}`);
        } else {
          console.log(`Protected core provider preserved: ${provider.name}`);
        }
      }
      
      console.log('✅ Provider deletion operation completed (core providers preserved)');
    },
    
    // Override updateProvidersOnly to protect core providers
    updateProvidersOnly: async (): Promise<void> => {
      if (!isAdminAuthenticated) {
        console.error('🛑 BLOCKED: Unauthorized provider update attempt');
        throw new Error('Provider protection active: Mass update blocked');
      }
      
      console.warn('⚠️ Admin is updating providers - protecting core providers...');
      
      // Get all providers first to identify core providers
      const allProviders = await storage.getProviders();
      const coreProviders = allProviders.filter(p => 
        PROTECTED_CORE_PROVIDERS.includes(p.name)
      );
      
      // Delete all providers but remember core providers
      await storage.deleteAllProviders();
      
      // Re-add core providers that were deleted
      for (const provider of coreProviders) {
        // Re-create the provider without the ID
        const { id, ...providerData } = provider;
        const insertData = providerData as InsertProvider;
        
        // Special handling for Wise
        if (provider.name === 'Wise') {
          insertData.preferred_collection = 'API';
          insertData.has_api = true;
        }
        
        await storage.createProvider(insertData);
        console.log(`Restored core provider: ${provider.name}`);
      }
      
      console.log('✅ Provider update completed (core providers preserved)');
    }
  };
  
  return protectedStorage as DatabaseStorage;
}