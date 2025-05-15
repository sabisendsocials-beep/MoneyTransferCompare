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
    
    return true;
  } catch (error) {
    console.error("Failed to connect to database:", error);
    return false;
  }
}