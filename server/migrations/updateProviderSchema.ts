/**
 * Migration script to update the provider schema
 * Adds new columns for rate source tracking
 */

import { log } from '../vite';
import { db } from '../db';
import { providers } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function updateProviderSchema() {
  try {
    log('Starting provider schema migration...');
    
    // Check if has_api column exists
    try {
      log('Checking if has_api column exists...');
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'providers' 
        AND column_name = 'has_api'
      `);
      
      const hasColumn = result.rows.length > 0;
      
      if (!hasColumn) {
        log('Adding has_api column to providers table...');
        await db.execute(sql`
          ALTER TABLE providers 
          ADD COLUMN IF NOT EXISTS has_api BOOLEAN DEFAULT FALSE
        `);
        log('has_api column added successfully');
      } else {
        log('has_api column already exists');
      }
    } catch (error) {
      log(`Error checking/adding has_api column: ${error}`);
      throw error;
    }
    
    // Check if api_url column exists
    try {
      log('Checking if api_url column exists...');
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'providers' 
        AND column_name = 'api_url'
      `);
      
      const hasColumn = result.rows.length > 0;
      
      if (!hasColumn) {
        log('Adding api_url column to providers table...');
        await db.execute(sql`
          ALTER TABLE providers 
          ADD COLUMN IF NOT EXISTS api_url TEXT
        `);
        log('api_url column added successfully');
      } else {
        log('api_url column already exists');
      }
    } catch (error) {
      log(`Error checking/adding api_url column: ${error}`);
      throw error;
    }
    
    // Check if api_key_required column exists
    try {
      log('Checking if api_key_required column exists...');
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'providers' 
        AND column_name = 'api_key_required'
      `);
      
      const hasColumn = result.rows.length > 0;
      
      if (!hasColumn) {
        log('Adding api_key_required column to providers table...');
        await db.execute(sql`
          ALTER TABLE providers 
          ADD COLUMN IF NOT EXISTS api_key_required BOOLEAN DEFAULT FALSE
        `);
        log('api_key_required column added successfully');
      } else {
        log('api_key_required column already exists');
      }
    } catch (error) {
      log(`Error checking/adding api_key_required column: ${error}`);
      throw error;
    }
    
    // Check if api_response_path column exists
    try {
      log('Checking if api_response_path column exists...');
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'providers' 
        AND column_name = 'api_response_path'
      `);
      
      const hasColumn = result.rows.length > 0;
      
      if (!hasColumn) {
        log('Adding api_response_path column to providers table...');
        await db.execute(sql`
          ALTER TABLE providers 
          ADD COLUMN IF NOT EXISTS api_response_path TEXT
        `);
        log('api_response_path column added successfully');
      } else {
        log('api_response_path column already exists');
      }
    } catch (error) {
      log(`Error checking/adding api_response_path column: ${error}`);
      throw error;
    }
    
    // Check if preferred_collection column exists
    try {
      log('Checking if preferred_collection column exists...');
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'providers' 
        AND column_name = 'preferred_collection'
      `);
      
      const hasColumn = result.rows.length > 0;
      
      if (!hasColumn) {
        log('Adding preferred_collection column to providers table...');
        await db.execute(sql`
          ALTER TABLE providers 
          ADD COLUMN IF NOT EXISTS preferred_collection TEXT DEFAULT 'SCRAPER'
        `);
        log('preferred_collection column added successfully');
      } else {
        log('preferred_collection column already exists');
      }
    } catch (error) {
      log(`Error checking/adding preferred_collection column: ${error}`);
      throw error;
    }
    
    // Check if last_successful_collection column exists
    try {
      log('Checking if last_successful_collection column exists...');
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'providers' 
        AND column_name = 'last_successful_collection'
      `);
      
      const hasColumn = result.rows.length > 0;
      
      if (!hasColumn) {
        log('Adding last_successful_collection column to providers table...');
        await db.execute(sql`
          ALTER TABLE providers 
          ADD COLUMN IF NOT EXISTS last_successful_collection TIMESTAMP
        `);
        log('last_successful_collection column added successfully');
      } else {
        log('last_successful_collection column already exists');
      }
    } catch (error) {
      log(`Error checking/adding last_successful_collection column: ${error}`);
      throw error;
    }
    
    log('Provider schema migration completed successfully');
    return true;
  } catch (error) {
    log(`Error in provider schema migration: ${error}`);
    return false;
  }
}

export { updateProviderSchema };

// Execute if this file is run directly
if (require.main === module) {
  updateProviderSchema()
    .then(() => {
      log('Provider schema update completed');
      process.exit(0);
    })
    .catch(error => {
      log(`Error updating provider schema: ${error}`);
      process.exit(1);
    });
}