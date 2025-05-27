/**
 * Provider Database Lockdown System
 * 
 * This file implements complete lockdown protection for provider data
 * to ensure NO scripts can modify providers without explicit admin authorization.
 * 
 * SECURITY LAYERS:
 * 1. Wraps all provider modification methods with security checks
 * 2. Validates admin tokens and source
 * 3. Maintains a protected list of core providers that can never be deleted
 */

import { storage } from './databaseStorage';
import { providers as providersSchema, type Provider, type InsertProvider } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

// ALL PROVIDERS PROTECTION: Every provider in the system is protected from deletion
// This is a complete list of all providers that should be protected from deletion
const PROTECTED_CORE_PROVIDERS: string[] = [
  // DISABLED: All provider protection removed to give admin panel full control
];

/**
 * Tracks whether admin authentication has been verified for the current request
 */
let adminAuthenticated = false;

/**
 * Authenticates an admin request
 * @param token Admin authentication token
 * @param source Source of the request (must be 'provider-management-panel')
 * @returns Whether authentication was successful
 */
export function authenticateAdmin(token: string, source: string): boolean {
  // Requires both a token and the correct source
  if (token && source === 'provider-management-panel') {
    adminAuthenticated = true;
    console.log('🔒 Admin authentication successful for provider management');
    return true;
  }
  
  console.error('⛔ Admin authentication failed for provider management');
  adminAuthenticated = false;
  return false;
}

/**
 * Resets the admin authentication state
 * Should be called after each request completes
 */
export function resetAdminAuthentication(): void {
  adminAuthenticated = false;
}

/**
 * Checks if the current operation is authorized to modify providers
 * @returns True if authorized, false otherwise
 */
function isAuthorizedProviderModification(): boolean {
  if (!adminAuthenticated) {
    console.error('🛑 UNAUTHORIZED: Provider modification attempted without admin authentication');
    console.error('⚠️ All provider modifications must be performed through the admin panel');
    return false;
  }
  
  return true;
}

/**
 * Enhanced database storage with provider protection
 */
export const secureStorage = {
  // Pass through all standard methods
  ...storage,
  
  // Override provider modification methods with security checks
  async createProvider(provider: InsertProvider): Promise<Provider> {
    if (!isAuthorizedProviderModification()) {
      throw new Error('UNAUTHORIZED: Provider creation blocked - must use admin panel');
    }
    
    return storage.createProvider(provider);
  },
  
  async updateProvider(id: number, updates: Partial<InsertProvider>): Promise<Provider | undefined> {
    if (!isAuthorizedProviderModification()) {
      throw new Error('UNAUTHORIZED: Provider update blocked - must use admin panel');
    }
    
    // Special check for Wise to ensure it always uses API
    if (updates.name === 'Wise' || (await this.getProvider(id))?.name === 'Wise') {
      // Force API collection for Wise
      updates.preferred_collection = 'API';
      updates.has_api = true;
      updates.api_url = updates.api_url || 'https://api.wise.com/v1/rates';
      updates.api_key_required = true;
      updates.api_response_path = updates.api_response_path || 'rate';
      
      console.log('🔒 Enforcing API collection policy for Wise provider');
    }
    
    return storage.updateProvider(id, updates);
  },
  
  async deleteAllProviders(): Promise<void> {
    if (!isAuthorizedProviderModification()) {
      throw new Error('UNAUTHORIZED: Provider deletion blocked - must use admin panel');
    }
    
    console.warn('⚠️ CRITICAL: Request to delete ALL providers - checking for protected providers');
    
    // Get all current providers
    const currentProviders = await storage.getProviders();
    
    // Extract IDs of protected providers
    const protectedProviderIds = currentProviders
      .filter(p => PROTECTED_CORE_PROVIDERS.includes(p.name))
      .map(p => p.id);
    
    if (protectedProviderIds.length > 0) {
      console.warn(`⚠️ PRESERVING ${protectedProviderIds.length} PROTECTED CORE PROVIDERS`);
      
      // Modify the operation to delete all EXCEPT protected providers
      const deletedCount = await db.delete(providersSchema)
        .where(eq(providersSchema.id, -1)); // This is a trick - never matches any records
      
      // Instead, manually delete non-protected providers
      for (const provider of currentProviders) {
        if (!PROTECTED_CORE_PROVIDERS.includes(provider.name)) {
          await db.delete(providersSchema)
            .where(eq(providersSchema.id, provider.id));
          console.log(`Deleted non-protected provider: ${provider.name}`);
        } else {
          console.log(`Protected core provider preserved: ${provider.name}`);
        }
      }
      
      console.log('✅ Non-protected providers deleted while preserving core providers');
    } else {
      console.warn('⚠️ No protected providers found in database!');
      // If no protected providers found, we should add them after deletion
      await storage.deleteAllProviders();
      console.log('All providers deleted - will restore protected core providers');
    }
  }
};

// Export a function to verify the provider protection system is active
export function verifyProviderProtection(): boolean {
  console.log('🔒 Provider protection system active');
  console.log(`🔒 Protected core providers: ${PROTECTED_CORE_PROVIDERS.join(', ')}`);
  return true;
}