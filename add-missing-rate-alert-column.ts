/**
 * Add missing current_rate_at_creation column to rate_alerts table
 */

import { db } from './server/db';

async function addMissingColumn() {
  try {
    console.log('Adding current_rate_at_creation column to rate_alerts table...');
    
    // Add the missing column
    await db.execute(`
      ALTER TABLE rate_alerts 
      ADD COLUMN IF NOT EXISTS current_rate_at_creation DECIMAL(15,6) NOT NULL DEFAULT 0
    `);

    // Update the status column name to match schema
    await db.execute(`
      ALTER TABLE rate_alerts 
      RENAME COLUMN status TO alert_status
    `);

    console.log('✓ Added current_rate_at_creation column');
    console.log('✓ Renamed status column to alert_status');
    console.log('✓ Rate alerts table schema updated successfully');
    
  } catch (error) {
    console.error('Error updating rate_alerts table:', error);
    throw error;
  }
}

// Run the update
addMissingColumn()
  .then(() => {
    console.log('Rate alerts table update completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });