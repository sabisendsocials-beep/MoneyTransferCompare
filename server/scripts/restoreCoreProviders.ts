/**
 * Emergency Core Provider Restoration
 * 
 * This script restores core providers that may have been accidentally removed.
 * It adds ONLY core providers that don't exist, without modifying existing providers.
 */

import { db } from '../db';
import { providers, type InsertProvider } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';

// Core providers that should always be present
const CORE_PROVIDERS: InsertProvider[] = [
  {
    name: 'Wise',
    preferred_collection: 'API',
    has_api: true,
    api_url: 'https://api.wise.com/v1/rates',
    api_key_required: true,
    api_response_path: 'rate',
    active: true,
    website_url: 'https://wise.com',
    logo: 'https://wise.com/public-resources/assets/logos/wise-logo-square.svg'
  },
  {
    name: 'Western Union',
    preferred_collection: 'SCRAPER',
    has_api: false,
    active: true,
    website_url: 'https://westernunion.com',
    logo: 'https://1000logos.net/wp-content/uploads/2021/05/Western-Union-logo.png'
  },
  {
    name: 'MoneyGram',
    preferred_collection: 'SCRAPER',
    has_api: false,
    active: true,
    website_url: 'https://moneygram.com',
    logo: 'https://1000logos.net/wp-content/uploads/2021/05/MoneyGram-logo.png'
  }
];

// Restore only missing core providers - will not modify existing
export async function restoreMissingCoreProviders(): Promise<void> {
  console.log('EMERGENCY RESTORATION: Checking for missing core providers...');
  
  try {
    // Get all providers from database
    const existingProviders = await storage.getProviders();
    const existingNames = new Set(existingProviders.map(p => p.name));
    
    console.log(`Found ${existingProviders.length} providers in database`);
    console.log(`Checking if core providers exist: ${CORE_PROVIDERS.map(p => p.name).join(', ')}`);
    
    // Check each core provider
    let restoredCount = 0;
    for (const coreProvider of CORE_PROVIDERS) {
      if (!existingNames.has(coreProvider.name)) {
        console.log(`RESTORING MISSING CORE PROVIDER: ${coreProvider.name}`);
        
        // Add the missing core provider
        try {
          await db.insert(providers).values(coreProvider);
          console.log(`✅ Successfully restored core provider: ${coreProvider.name}`);
          restoredCount++;
        } catch (error) {
          console.error(`Error restoring core provider ${coreProvider.name}:`, error);
        }
      } else {
        console.log(`Core provider already exists: ${coreProvider.name}`);
        
        // If Wise exists but has wrong settings, fix them
        if (coreProvider.name === 'Wise') {
          const wiseProvider = existingProviders.find(p => p.name === 'Wise');
          // DISABLED: Wise enforcement removed to allow admin panel control
          console.log(`✓ Wise provider configuration unchanged - admin has control`);
        }
      }
    }
    
    if (restoredCount > 0) {
      console.log(`✅ EMERGENCY RESTORATION COMPLETE: Restored ${restoredCount} missing core providers`);
    } else {
      console.log(`✓ No restoration needed - all core providers already exist`);
    }
  } catch (error) {
    console.error('Error in emergency provider restoration:', error);
  }
}

// If executed directly as a script
if (process.argv[1].endsWith('restoreCoreProviders.ts')) {
  restoreMissingCoreProviders().then(() => {
    console.log('Core provider restoration complete');
    process.exit(0);
  }).catch(error => {
    console.error('Error during core provider restoration:', error);
    process.exit(1);
  });
}