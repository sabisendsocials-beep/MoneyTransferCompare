/**
 * Database migration: Add password field to users table for email/password authentication
 */
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addPasswordColumn() {
  try {
    console.log('Adding password column to users table...');
    
    // Add password column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password TEXT;
    `);
    
    // Make email required (not null)
    await db.execute(sql`
      ALTER TABLE users 
      ALTER COLUMN email SET NOT NULL;
    `);
    
    console.log('Successfully added password column to users table');
    console.log('Migration completed successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addPasswordColumn();