/**
 * Test rate freshness system by creating rates with different ages
 */
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function testRateFreshness() {
  try {
    console.log('Creating test rates with different ages...');
    
    // Insert a rate that's 5 days old (120 hours) - should be included with 168-hour threshold
    await db.execute(sql`
      INSERT INTO exchange_rates (provider_id, from_currency, to_currency, rate, timestamp, verified)
      VALUES (10001, 'GBP', 'NGN', 2100.00, NOW() - INTERVAL '5 days', true)
    `);
    
    // Insert a rate that's 10 days old (240 hours) - should be excluded with 168-hour threshold
    await db.execute(sql`
      INSERT INTO exchange_rates (provider_id, from_currency, to_currency, rate, timestamp, verified)
      VALUES (10002, 'GBP', 'NGN', 2050.00, NOW() - INTERVAL '10 days', true)
    `);
    
    console.log('Test rates created successfully');
    
    // Check what rates exist now
    const result = await db.execute(sql`
      SELECT provider_id, from_currency, to_currency, rate, timestamp, 
             EXTRACT(EPOCH FROM (NOW() - timestamp))/3600 as hours_old
      FROM exchange_rates 
      WHERE from_currency = 'GBP' AND to_currency = 'NGN' AND rate IN (2100.00, 2050.00)
      ORDER BY timestamp DESC
    `);
    
    console.log('Test rates in database:');
    result.rows.forEach((row: any) => {
      console.log(`- Provider ${row.provider_id}: ${row.rate} (${row.hours_old.toFixed(1)} hours old)`);
    });
    
    console.log('\nNow testing API with 168-hour threshold...');
    
  } catch (error) {
    console.error('Error creating test rates:', error);
    throw error;
  }
}

testRateFreshness()
  .then(() => {
    console.log('✓ Test rates created - check /api/best-rates to see filtering in action');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Test failed:', error);
    process.exit(1);
  });