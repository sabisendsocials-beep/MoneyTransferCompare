/**
 * Simple script to check if rate trend data is stored correctly
 */
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function checkTrends() {
  try {
    console.log('Checking rate trends table data...');
    
    // Check total count
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM rate_trends`);
    const totalCount = parseInt(String(countResult.rows[0].count));
    console.log(`Total records in rate_trends: ${totalCount}`);
    
    // Check counts by currency pair
    const pairCounts = await db.execute(sql`
      SELECT from_currency, to_currency, COUNT(*) as count
      FROM rate_trends
      GROUP BY from_currency, to_currency
    `);
    
    console.log('\nRecords by currency pair:');
    console.table(pairCounts.rows);
    
    // Get sample data for GBP to NGN (most recent 5 days)
    console.log('\nSample GBP to NGN data (most recent 5 days):');
    const sampleData = await db.execute(sql`
      SELECT id, from_currency, to_currency, date, rate
      FROM rate_trends
      WHERE from_currency = 'GBP' AND to_currency = 'NGN'
      ORDER BY date DESC
      LIMIT 5
    `);
    
    console.table(sampleData.rows);
    
    // Check rate_cache table
    console.log('\nChecking rate_cache table:');
    const cacheData = await db.execute(sql`SELECT * FROM rate_cache`);
    console.table(cacheData.rows);
    
    return true;
  } catch (error) {
    console.error('Error checking rate trends:', error);
    return false;
  }
}

// Run the check
checkTrends()
  .then(success => {
    if (success) {
      console.log('\nRate trends check completed successfully.');
    } else {
      console.log('\nRate trends check failed.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running check script:', error);
    process.exit(1);
  });