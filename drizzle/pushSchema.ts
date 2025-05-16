import { db, pool } from '../server/db';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

// This script automatically creates tables from the schema
async function main() {
  console.log('Pushing schema to database...');
  
  try {
    // Push schema to database
    // Create tables for users
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "email" TEXT,
        "passwordHash" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create table for providers
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "providers" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "logo" TEXT,
        "rating" REAL,
        "websiteUrl" TEXT,
        "scrapingUrl" TEXT,
        "scrapingSelector" TEXT,
        "transferTime" TEXT,
        "hasFixedFee" BOOLEAN DEFAULT false,
        "fixedFee" REAL,
        "percentageFee" REAL,
        "active" BOOLEAN DEFAULT true
      );
    `);
    
    // Create table for exchange rates
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "exchange_rates" (
        "id" SERIAL PRIMARY KEY,
        "providerId" INTEGER NOT NULL,
        "fromCurrency" TEXT NOT NULL,
        "toCurrency" TEXT NOT NULL,
        "rate" REAL NOT NULL,
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("providerId") REFERENCES "providers"("id")
      );
    `);
    
    // Create table for news
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "news" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "content" TEXT,
        "url" TEXT,
        "imageUrl" TEXT,
        "source" TEXT,
        "category" TEXT,
        "country" TEXT,
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create table for rate trends
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "rate_trends" (
        "id" SERIAL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "from_currency" TEXT NOT NULL,
        "to_currency" TEXT NOT NULL,
        "rate" REAL NOT NULL,
        "source" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create table for rate_cache to avoid frequent API calls
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "rate_cache" (
        "id" SERIAL PRIMARY KEY,
        "from_currency" TEXT NOT NULL,
        "to_currency" TEXT NOT NULL,
        "last_updated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "last_fetch_time" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Schema pushed successfully');
    
    // Close the connection
    await pool.end();
  } catch (error) {
    console.error('Schema push failed:', error);
    process.exit(1);
  }
}

main();