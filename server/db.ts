import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function initializeDatabase() {
  console.log("Initializing database connection...");
  
  try {
    // Test the connection
    await pool.query('SELECT NOW()');
    console.log("Database connection successful");
    
    // Create tables if they don't exist
    console.log("Creating tables if they don't exist...");
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "email" TEXT,
        "passwordHash" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create providers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "providers" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "logo" TEXT,
        "rating" REAL,
        "website_url" TEXT,
        "scraping_url" TEXT,
        "scraping_selector" TEXT,
        "transfer_time" TEXT,
        "has_fixed_fee" BOOLEAN DEFAULT false,
        "fixed_fee" REAL,
        "percentage_fee" REAL,
        "active" BOOLEAN DEFAULT true
      );
    `);
    
    // Create exchange_rates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "exchange_rates" (
        "id" SERIAL PRIMARY KEY,
        "provider_id" INTEGER NOT NULL,
        "from_currency" TEXT NOT NULL,
        "to_currency" TEXT NOT NULL,
        "rate" REAL NOT NULL,
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
      );
    `);
    
    // Create news table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "news" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "content" TEXT,
        "url" TEXT,
        "image_url" TEXT,
        "source" TEXT,
        "category" TEXT,
        "country" TEXT,
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Database tables initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }
}