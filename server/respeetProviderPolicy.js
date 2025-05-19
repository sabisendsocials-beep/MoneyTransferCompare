/**
 * Simple function to ensure we respect provider collection policies
 * This can be called after any rate collection to clean up any violations
 */
import { storage } from './storage';
import { db } from './db';
import { exchangeRates } from '@shared/schema';
import { eq, and, ne } from 'drizzle-orm';

export async function enforceProviderCollectionPolicies() {
  console.log('Enforcing provider collection policies...');

  try {
    // 1. Get all providers with API collection policy
    const apiProviders = await storage.getProviders({
      preferred_collection: 'API',
      active: true
    });

    console.log(`Found ${apiProviders.length} providers with API collection policy`);

    // 2. For each API provider, remove any rates with wrong source
    for (const provider of apiProviders) {
      console.log(`Enforcing API-only policy for ${provider.name} (ID: ${provider.id})`);
      
      // Delete any non-API sourced rates for this provider
      const deleted = await db.delete(exchangeRates)
        .where(
          and(
            eq(exchangeRates.provider_id, provider.id),
            ne(exchangeRates.source, 'API')
          )
        );
      
      console.log(`Removed ${deleted.length} non-API rates for ${provider.name}`);
    }

    console.log('Provider collection policies enforced successfully');
    return true;
  } catch (error) {
    console.error('Error enforcing collection policies:', error);
    return false;
  }
}

export default enforceProviderCollectionPolicies;