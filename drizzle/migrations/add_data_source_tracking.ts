/**
 * Database migration to add data source tracking fields
 * This script updates our schemas to support the new data collection strategy
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { sql } from 'drizzle-orm';

// Define the migration
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('Starting migration - adding data source tracking fields...');

  try {
    // Step 1: Add new fields to the exchange_rates table
    await db.execute(sql`
      ALTER TABLE exchange_rates 
      ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'SCRAPER',
      ADD COLUMN IF NOT EXISTS source_url TEXT,
      ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE
    `);
    console.log('Added data source tracking fields to exchange_rates table');

    // Step 2: Add new fields to the providers table for API integration
    await db.execute(sql`
      ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS has_api BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS api_url TEXT,
      ADD COLUMN IF NOT EXISTS api_key_required BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS api_response_path TEXT,
      ADD COLUMN IF NOT EXISTS preferred_collection TEXT DEFAULT 'SCRAPER',
      ADD COLUMN IF NOT EXISTS last_successful_collection TIMESTAMP
    `);
    console.log('Added API integration fields to providers table');

    // Step 3: Create index on exchange_rates for faster source-based queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_exchange_rates_source ON exchange_rates (source)
    `);
    console.log('Created index on exchange_rates.source');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
main()
  .then(() => {
    console.log('Database updated successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error updating database:', error);
    process.exit(1);
  });