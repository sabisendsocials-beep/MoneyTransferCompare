/**
 * Storage interface definitions
 */

export interface IStorage {
  // Interface methods are defined in DatabaseStorage
}

// Import and export the database storage implementation
import { DatabaseStorage } from './databaseStorage';
export const storage = new DatabaseStorage();