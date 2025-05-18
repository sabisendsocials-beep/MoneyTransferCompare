// Direct database function to verify exchange rates
import { db } from './db.js';
import { exchangeRates } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Verifies or unverifies an exchange rate by ID
 * @param {number} rateId - The ID of the rate to verify
 * @param {boolean} verified - The verification status to set
 * @returns {Promise<object|null>} The updated rate or null if not found
 */
export async function verifyRate(rateId, verified) {
  try {
    // Update the verification status in the database
    const [updatedRate] = await db
      .update(exchangeRates)
      .set({ 
        verified,
        timestamp: new Date() // Update the last checked timestamp
      })
      .where(eq(exchangeRates.id, rateId))
      .returning();
    
    return updatedRate || null;
  } catch (error) {
    console.error(`Error verifying rate ${rateId}:`, error);
    return null;
  }
}

/**
 * Gets all verified rates from the database
 * @returns {Promise<Array>} Array of verified rates
 */
export async function getVerifiedRates() {
  try {
    return await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.verified, true))
      .orderBy(exchangeRates.timestamp);
  } catch (error) {
    console.error('Error fetching verified rates:', error);
    return [];
  }
}