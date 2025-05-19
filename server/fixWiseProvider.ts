/**
 * Fix Wise Provider Configuration
 * 
 * This script permanently fixes the Wise provider to always use API collection method
 * and repairs any incorrect configurations.
 */

import { db } from './db';
import { providers } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Ensures the Wise provider is properly configured to use API
 * @returns Whether the operation was successful
 */
export async function fixWiseProvider(): Promise<boolean> {
  try {
    console.log('🔍 Checking Wise provider configuration...');
    
    // Check if Wise provider exists
    const [wiseProvider] = await db
      .select()
      .from(providers)
      .where(eq(providers.name, 'Wise'));
    
    if (!wiseProvider) {
      console.log('⚠️ Wise provider not found in database');
      return false;
    }
    
    // Check if configuration is correct
    if (
      wiseProvider.preferred_collection === 'API' && 
      wiseProvider.has_api === true
    ) {
      console.log('✓ Wise provider already correctly configured to use API');
      return true;
    }
    
    // Fix the configuration
    console.log('🔧 Fixing Wise provider configuration...');
    
    const [updated] = await db
      .update(providers)
      .set({
        preferred_collection: 'API',
        has_api: true,
        api_url: wiseProvider.api_url || 'https://api.wise.com/v1/rates',
        api_key_required: true,
        api_response_path: wiseProvider.api_response_path || 'rate'
      })
      .where(eq(providers.id, wiseProvider.id))
      .returning();
    
    if (updated) {
      console.log('✅ Successfully fixed Wise provider configuration to use API');
      return true;
    } else {
      console.error('❌ Failed to update Wise provider');
      return false;
    }
  } catch (error) {
    console.error('Error fixing Wise provider:', error);
    return false;
  }
}

/**
 * Run the fix automatically to ensure Wise always uses API
 */
fixWiseProvider();