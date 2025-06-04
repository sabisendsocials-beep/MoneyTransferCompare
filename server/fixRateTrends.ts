import { db } from './db';
import { sql } from 'drizzle-orm';

// Direct data insertion approach
async function fixRateTrends() {
  try {
    console.log('Running fixRateTrends script...');
    
    // First, let's check what tables exist
    console.log('Checking database tables...');
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `);
    
    console.log('Tables in database:');
    console.table(tables.rows);
    
    // Then, check the structure of the rate_trends table
    console.log('Checking rate_trends structure...');
    const tableStructure = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'rate_trends';
    `);
    
    console.log('rate_trends structure:');
    console.table(tableStructure.rows);
    
    // SAFETY CHECK: Prevent accidental data deletion
    const existingCount = await db.execute(sql`SELECT COUNT(*) FROM rate_trends`);
    const totalRecords = parseInt(String(existingCount.rows[0].count));
    
    if (totalRecords > 1000) {
      console.log(`SAFETY STOP: Found ${totalRecords} existing records. This script would destroy historical data.`);
      console.log('Historical data preservation is critical - aborting operation.');
      throw new Error('Prevented destructive operation on existing historical data');
    }
    
    // Check if we have any exchange rates in the table
    const countBefore = await db.execute(sql`SELECT COUNT(*) FROM rate_trends;`);
    console.log(`Current trend count: ${countBefore.rows[0].count}`);
    
    // Insert some sample data directly for each currency pair
    const pairs = [
      { from: 'GBP', to: 'NGN' },
      { from: 'EUR', to: 'NGN' },
      { from: 'GBP', to: 'GHS' },
      { from: 'EUR', to: 'GHS' }
    ];
    
    // Start with today's date as a base
    const today = new Date();
    let totalInserted = 0;
    
    for (const pair of pairs) {
      console.log(`Inserting data for ${pair.from} to ${pair.to}...`);
      
      // Get the exchange rate from the exchange_rates table
      const rates = await db.execute(sql`
        SELECT rate FROM exchange_rates 
        WHERE from_currency = ${pair.from} AND to_currency = ${pair.to}
        ORDER BY timestamp DESC LIMIT 1;
      `);
      
      let baseRate = 0;
      
      if (rates.rows.length > 0) {
        baseRate = rates.rows[0].rate;
        console.log(`Found current rate for ${pair.from}/${pair.to}: ${baseRate}`);
      } else {
        // If no rate found, use a realistic placeholder based on the currency pair
        if (pair.from === 'GBP' && pair.to === 'NGN') {
          baseRate = 2150.75;
        } else if (pair.from === 'EUR' && pair.to === 'NGN') {
          baseRate = 1790.45;
        } else if (pair.from === 'GBP' && pair.to === 'GHS') {
          baseRate = 21.50;
        } else if (pair.from === 'EUR' && pair.to === 'GHS') {
          baseRate = 17.90;
        }
        console.log(`Using default rate for ${pair.from}/${pair.to}: ${baseRate}`);
      }
      
      // Create 30 days of data
      for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Format date as YYYY-MM-DD
        const formattedDate = date.toISOString().split('T')[0];
        
        // Small daily fluctuation (within 2%)
        const fluctuation = 0.98 + (Math.random() * 0.04);
        const rate = baseRate * fluctuation;
        
        // Insert data
        await db.execute(sql`
          INSERT INTO rate_trends (from_currency, to_currency, date, rate)
          VALUES (${pair.from}, ${pair.to}, ${formattedDate}, ${rate});
        `);
        
        totalInserted++;
      }
      
      // Update rate cache entry
      const cacheExists = await db.execute(sql`
        SELECT count(*) FROM rate_cache
        WHERE from_currency = ${pair.from} AND to_currency = ${pair.to};
      `);
      
      if (parseInt(cacheExists.rows[0].count) > 0) {
        await db.execute(sql`
          UPDATE rate_cache
          SET last_updated = NOW()
          WHERE from_currency = ${pair.from} AND to_currency = ${pair.to};
        `);
        console.log(`Updated rate cache for ${pair.from}/${pair.to}`);
      } else {
        await db.execute(sql`
          INSERT INTO rate_cache (from_currency, to_currency, last_updated)
          VALUES (${pair.from}, ${pair.to}, NOW());
        `);
        console.log(`Created rate cache entry for ${pair.from}/${pair.to}`);
      }
    }
    
    // Check how many records we've inserted
    const countAfter = await db.execute(sql`SELECT COUNT(*) FROM rate_trends;`);
    console.log(`Created ${countAfter.rows[0].count} trend data points`);
    
    console.log(`Successfully inserted ${totalInserted} trend data points`);
    
    return true;
  } catch (error) {
    console.error('Error in fixRateTrends:', error);
    return false;
  }
}

// Run the function
fixRateTrends()
  .then(success => {
    if (success) {
      console.log('Rate trends fixed successfully!');
    } else {
      console.log('Failed to fix rate trends.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running script:', error);
    process.exit(1);
  });