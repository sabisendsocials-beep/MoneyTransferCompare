/**
 * Provider Configuration Validator
 * 
 * This script validates all provider configurations in the database
 * and ensures they match their intended collection policies.
 * It provides an extra layer of protection against incorrect
 * provider configurations.
 */

import { db } from '../db';
import { providers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';

/**
 * Validates all provider configurations in the database
 * and applies permanent corrections to ensure stability
 */
export async function validateProviderConfigurations(): Promise<void> {
  console.log('Validating provider configurations...');
  
  try {
    // Get all providers from the database
    const allProviders = await storage.getProviders();
    console.log(`Found ${allProviders.length} providers to validate`);
    
    // Keep track of corrections made
    let correctionsCount = 0;
    
    // Special validation for Wise to ensure it is ALWAYS set to API
    const wiseProvider = allProviders.find(p => p.name === 'Wise');
    if (wiseProvider) {
      console.log(`Validating Wise provider (ID: ${wiseProvider.id})...`);
      
      // Check if any Wise configuration settings are incorrect
      const wiseNeedsUpdate = 
        wiseProvider.preferred_collection !== 'API' || 
        !wiseProvider.has_api ||
        !wiseProvider.api_url ||
        !wiseProvider.api_response_path ||
        !wiseProvider.api_key_required;
        
      if (wiseNeedsUpdate) {
        console.log('🔒 PERMANENT CORRECTION: Updating Wise provider to API collection mode');
        
        // Apply the fixed Wise configuration
        await storage.updateProvider(wiseProvider.id, {
          preferred_collection: 'API',
          has_api: true,
          api_url: 'https://api.wise.com/v1/rates',
          api_key_required: true,
          api_response_path: 'rate'
        });
        
        console.log('✅ Successfully corrected Wise provider configuration');
        correctionsCount++;
      } else {
        console.log('✓ Wise provider configuration is correct');
      }
    } else {
      console.warn('⚠️ Wise provider not found in database');
    }
    
    // Validate other key providers that should have specific configurations
    const providerCorrections = [
      {
        name: 'Western Union',
        config: {
          preferred_collection: 'SCRAPER',
          has_api: false
        }
      },
      {
        name: 'MoneyGram',
        config: {
          preferred_collection: 'SCRAPER',
          has_api: false
        }
      }
    ];
    
    // Apply any other provider-specific corrections
    for (const correction of providerCorrections) {
      const provider = allProviders.find(p => p.name === correction.name);
      
      if (provider) {
        console.log(`Validating ${provider.name} provider (ID: ${provider.id})...`);
        
        // Check if configuration needs update
        let needsUpdate = false;
        
        for (const [key, value] of Object.entries(correction.config)) {
          if (provider[key as keyof typeof provider] !== value) {
            needsUpdate = true;
            break;
          }
        }
        
        if (needsUpdate) {
          console.log(`Correcting ${provider.name} configuration`);
          await storage.updateProvider(provider.id, correction.config);
          console.log(`✅ Successfully corrected ${provider.name} provider configuration`);
          correctionsCount++;
        } else {
          console.log(`✓ ${provider.name} provider configuration is correct`);
        }
      }
    }
    
    // Print final summary
    console.log(`Provider validation complete. Made ${correctionsCount} corrections.`);
    
    if (correctionsCount > 0) {
      console.log('⚠️ Provider configurations have been corrected. Please check the admin panel.');
    } else {
      console.log('✅ All provider configurations are valid.');
    }
  } catch (error) {
    console.error('Error validating provider configurations:', error);
  }
}

// Run the validation if this script is executed directly
if (process.argv[1].endsWith('validateProviderConfigurations.ts')) {
  validateProviderConfigurations().then(() => {
    console.log('Provider configuration validation complete');
    process.exit(0);
  }).catch(error => {
    console.error('Error during provider configuration validation:', error);
    process.exit(1);
  });
}