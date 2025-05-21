/**
 * Migration script to create the contact_submissions table
 */

import { db } from './server/db';
import { contactSubmissions } from './shared/schema';
import { sql } from 'drizzle-orm';

async function createContactSubmissionsTable() {
  console.log('Creating contact_submissions table...');
  
  try {
    // Create the table using the schema defined in shared/schema.ts
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        topic TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Successfully created contact_submissions table!');
  } catch (error) {
    console.error('Error creating contact_submissions table:', error);
    throw error;
  }
}

// Execute the migration
createContactSubmissionsTable()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });