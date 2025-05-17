/**
 * Script to update the exchange_rates table structure
 * Adds source tracking fields without disrupting existing data
 */

import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { exchangeRates } from '@shared/schema';
import { log } from './server/vite';

async function updateExchangeRatesTable() {
  try {
    log('Checking for existing source columns in exchange_rates table...');

    // Check if the source column already exists
    const checkColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'exchange_rates' 
      AND column_name = 'source'
    `);

    if (checkColumns.rowCount === 0) {
      log('Adding source tracking columns to exchange_rates table...');
      
      // Add source columns
      await db.execute(sql`
        ALTER TABLE exchange_rates 
        ADD COLUMN source TEXT DEFAULT 'SCRAPER',
        ADD COLUMN source_url TEXT,
        ADD COLUMN verified BOOLEAN DEFAULT FALSE
      `);
      
      log('Creating index on source column...');
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_exchange_rates_source ON exchange_rates (source)
      `);
      
      log('✓ Successfully added source tracking columns');
    } else {
      log('Source columns already exist, skipping...');
    }

    // Update all existing records to have the source set
    log('Updating existing records with source information...');
    await db.update(exchangeRates)
      .set({
        source: 'SCRAPER',
        verified: false
      })
      .where(sql`source IS NULL`);
    
    log('✓ Exchange rates table structure updated successfully');
  } catch (error) {
    log(`Error updating exchange rates table: ${error}`);
    throw error;
  }
}

// Run the update
updateExchangeRatesTable()
  .then(() => {
    log('Database structure updated successfully');
    process.exit(0);
  })
  .catch(error => {
    log(`Error updating database structure: ${error}`);
    process.exit(1);
  });