/**
 * Provider Database Lockdown System
 * COMPLETELY DISABLED: All lockdown mechanisms removed to give admin panel full control
 */

import { storage } from './storage';
import { providers as providersSchema, type Provider, type InsertProvider } from '@shared/schema';

// DISABLED: No protected providers - admin has full control
const PROTECTED_CORE_PROVIDERS: string[] = [];

/**
 * DISABLED: Admin authentication always succeeds
 */
export function authenticateAdmin(token: string, source: string): boolean {
  return true; // Always allow admin access
}

/**
 * DISABLED: No authentication state to reset
 */
export function resetAdminAuthentication(): void {
  // No longer needed
}

/**
 * DISABLED: All provider operations allowed without restrictions
 */
export const secureStorage = {
  // Pass through all operations directly to storage without any protection
  async createProvider(provider: InsertProvider): Promise<Provider> {
    return storage.createProvider(provider);
  },

  async updateProvider(id: number, updates: Partial<InsertProvider>): Promise<Provider | undefined> {
    return storage.updateProvider(id, updates);
  },

  async deleteAllProviders(): Promise<void> {
    return storage.deleteAllProviders();
  },

  // Pass through all other storage methods directly
  getProviders: storage.getProviders.bind(storage),
  getProvider: storage.getProvider.bind(storage),
  deleteProvider: storage.deleteProvider.bind(storage),
};

/**
 * DISABLED: No provider protection verification needed
 */
export function verifyProviderProtection(): boolean {
  return true; // All protection disabled
}