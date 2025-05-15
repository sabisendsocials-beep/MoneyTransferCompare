import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, pool } from '../server/db';

// This script runs migrations on the database
async function main() {
  console.log('Running migrations...');
  
  try {
    // Run migrations
    await migrate(db, { migrationsFolder: 'drizzle/migrations' });
    console.log('Migrations completed successfully');
    
    // Close the connection
    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();