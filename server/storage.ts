/**
 * Enhanced Storage Interface with Provider Protection
 * Wraps database operations with strict security checks
 */

import { Provider, InsertProvider, providers } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { isAuthorizedForProviderOperations } from './middlewares/providerProtection';

// The original storage interface (IStorage from the original file)
export interface IStorage {
  getUser(id: number): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Provider operations
  getProviders(): Promise<Provider[]>;
  getActiveProviders(): Promise<Provider[]>;
  getProvider(id: number): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  updateProvider(id: number, updates: Partial<InsertProvider>): Promise<Provider | undefined>;
  deleteAllProviders(): Promise<void>;
  
  // Other operations
  // ... (add other operations as needed)
}

/**
 * Create a secure storage that wraps all provider operations with protection
 */
class SecureStorage implements IStorage {
  // Passthrough methods for user operations
  async getUser(id: number): Promise<any | undefined> {
    // This would call the original storage implementation
    return undefined; // Replace with real implementation
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    // This would call the original storage implementation
    return undefined; // Replace with real implementation
  }

  async createUser(user: any): Promise<any> {
    // This would call the original storage implementation
    return {}; // Replace with real implementation
  }

  // PROTECTED provider operations
  async getProviders(): Promise<Provider[]> {
    // Read operations are allowed
    return db.select().from(providers);
  }

  async getActiveProviders(): Promise<Provider[]> {
    // Read operations are allowed
    return db
      .select()
      .from(providers)
      .where(eq(providers.active, true));
  }

  async getProvider(id: number): Promise<Provider | undefined> {
    // Read operations are allowed
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider;
  }

  async createProvider(provider: InsertProvider): Promise<Provider> {
    // PROTECTED: Only allowed via admin panel
    if (!isAuthorizedForProviderOperations()) {
      console.error('🛑 BLOCKED: Unauthorized provider creation');
      throw new Error('Provider protection active: creation blocked');
    }

    // Special handling for Wise to ensure API collection
    if (provider.name === 'Wise') {
      provider.preferred_collection = 'API';
      provider.has_api = true;
      provider.api_url = provider.api_url || 'https://api.wise.com/v1/rates';
      provider.api_key_required = true;
      provider.api_response_path = provider.api_response_path || 'rate';
      console.log('🔒 Enforcing API collection policy for Wise provider creation');
    }

    const [createdProvider] = await db
      .insert(providers)
      .values(provider)
      .returning();
      
    console.log(`✅ Provider "${provider.name}" created via admin panel`);
    return createdProvider;
  }

  async updateProvider(id: number, updates: Partial<InsertProvider>): Promise<Provider | undefined> {
    // PROTECTED: Only allowed via admin panel
    if (!isAuthorizedForProviderOperations()) {
      console.error('🛑 BLOCKED: Unauthorized provider update');
      throw new Error('Provider protection active: update blocked');
    }

    // Get the provider to check if it's Wise
    const [existingProvider] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, id));

    if (!existingProvider) {
      return undefined;
    }

    // Special handling for Wise to ensure API collection
    if (existingProvider.name === 'Wise' || updates.name === 'Wise') {
      updates.preferred_collection = 'API';
      updates.has_api = true;
      updates.api_url = updates.api_url || 'https://api.wise.com/v1/rates';
      updates.api_key_required = true;
      updates.api_response_path = updates.api_response_path || 'rate';
      console.log('🔒 Enforcing API collection policy for Wise provider update');
    }

    const [updatedProvider] = await db
      .update(providers)
      .set(updates)
      .where(eq(providers.id, id))
      .returning();

    console.log(`✅ Provider "${existingProvider.name}" updated via admin panel`);
    return updatedProvider;
  }

  async deleteAllProviders(): Promise<void> {
    // PROTECTED: Only allowed via admin panel
    if (!isAuthorizedForProviderOperations()) {
      console.error('🛑 BLOCKED: Unauthorized deletion of all providers');
      throw new Error('Provider protection active: mass deletion blocked');
    }

    // Core providers that should never be deleted
    const PROTECTED_CORE_PROVIDERS = [
      'Wise',
      'Western Union',
      'MoneyGram',
      'WorldRemit',
      'Lemfi'
    ];

    console.warn('⚠️ ADMIN REQUEST: Deleting all non-core providers');

    // Get all current providers
    const allProviders = await this.getProviders();
    
    // Identify which providers are protected
    const protectedProviderIds = allProviders
      .filter(p => PROTECTED_CORE_PROVIDERS.includes(p.name))
      .map(p => p.id);

    console.log(`🔒 Preserving ${protectedProviderIds.length} core providers: ${PROTECTED_CORE_PROVIDERS.join(', ')}`);

    // Delete all non-protected providers individually
    for (const provider of allProviders) {
      if (!PROTECTED_CORE_PROVIDERS.includes(provider.name)) {
        await db.delete(providers).where(eq(providers.id, provider.id));
        console.log(`Deleted provider: ${provider.name}`);
      } else {
        console.log(`Protected core provider preserved: ${provider.name}`);
      }
    }

    console.log('✅ Provider deletion operation completed (core providers preserved)');
  }
}

// Export the secure storage instance
export const storage = new SecureStorage();