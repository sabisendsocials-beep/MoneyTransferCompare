/**
 * Fix system settings table to match schema with id field
 */
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function fixSystemSettingsTable() {
  try {
    console.log('Dropping existing system_settings table...');
    
    // Drop the existing table
    await db.execute(sql`DROP TABLE IF EXISTS system_settings`);
    
    console.log('Creating system_settings table with correct structure...');
    
    // Create the system_settings table with id field
    await db.execute(sql`
      CREATE TABLE system_settings (
        id SERIAL PRIMARY KEY,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('System settings table created successfully');
    
    // Insert the rate freshness setting
    console.log('Setting rate freshness to 168 hours (7 days)...');
    
    await db.execute(sql`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES (
        'max_rate_age_hours', 
        '168', 
        'Maximum age in hours for exchange rates to be considered fresh (168 = 7 days)'
      )
    `);
    
    console.log('Rate freshness setting configured to 168 hours');
    
    // Verify the setting
    const result = await db.execute(sql`
      SELECT id, setting_key, setting_value, description, last_updated 
      FROM system_settings 
      WHERE setting_key = 'max_rate_age_hours'
    `);
    
    console.log('Current setting:', result.rows[0]);
    console.log('System settings table fix completed successfully');
    
  } catch (error) {
    console.error('Error fixing system settings table:', error);
    throw error;
  }
}

fixSystemSettingsTable()
  .then(() => {
    console.log('✓ System settings table fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ System settings table fix failed:', error);
    process.exit(1);
  });