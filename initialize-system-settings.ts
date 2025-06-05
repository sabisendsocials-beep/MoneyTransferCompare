/**
 * Initialize system settings table and set rate freshness to 168 hours
 */
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function initializeSystemSettings() {
  try {
    console.log('Creating system_settings table...');
    
    // Create the system_settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR PRIMARY KEY,
        setting_value VARCHAR NOT NULL,
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
      ON CONFLICT (setting_key) 
      DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description,
        last_updated = CURRENT_TIMESTAMP
    `);
    
    console.log('Rate freshness setting configured to 168 hours');
    
    // Verify the setting
    const result = await db.execute(sql`
      SELECT setting_key, setting_value, description 
      FROM system_settings 
      WHERE setting_key = 'max_rate_age_hours'
    `);
    
    console.log('Current setting:', result.rows[0]);
    console.log('System settings initialization completed successfully');
    
  } catch (error) {
    console.error('Error initializing system settings:', error);
    throw error;
  }
}

initializeSystemSettings()
  .then(() => {
    console.log('✓ System settings initialization complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ System settings initialization failed:', error);
    process.exit(1);
  });