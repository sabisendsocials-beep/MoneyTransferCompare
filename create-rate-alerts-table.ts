/**
 * Rate Alerts Table Migration
 * Creates the rate_alerts table for email notification system
 */

import { db } from './server/db';
import { rateAlerts } from './shared/schema';

async function createRateAlertsTable() {
  try {
    console.log('Creating rate_alerts table...');
    
    // Create the table using Drizzle
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rate_alerts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        from_currency VARCHAR(3) NOT NULL,
        to_currency VARCHAR(3) NOT NULL,
        alert_basis VARCHAR(20) NOT NULL CHECK (alert_basis IN ('official', 'best_provider')),
        trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('absolute', 'percentage')),
        target_value DECIMAL(15,6) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        triggered_at TIMESTAMP WITH TIME ZONE,
        triggered_rate DECIMAL(15,6),
        UNIQUE(email, from_currency, to_currency, alert_basis, status) 
        DEFERRABLE INITIALLY DEFERRED
      )
    `);

    // Create indexes for better performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_rate_alerts_status ON rate_alerts(status);
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_rate_alerts_currency_pair ON rate_alerts(from_currency, to_currency);
    `);

    console.log('✓ Rate alerts table created successfully');
    console.log('✓ Added indexes for performance optimization');
    console.log('✓ Added unique constraint to prevent duplicate pending alerts');
    
  } catch (error) {
    console.error('Error creating rate_alerts table:', error);
    throw error;
  }
}

// Run the migration
createRateAlertsTable()
  .then(() => {
    console.log('Rate alerts table migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });