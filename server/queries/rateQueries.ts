/**
 * Database queries related to exchange rates
 */

import { db } from '../db';
import { exchangeRates, type ExchangeRate } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Gets an exchange rate by its ID
 */
export async function getExchangeRateById(id: number): Promise<ExchangeRate | undefined> {
  try {
    const [rate] = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.id, id));
    
    return rate;
  } catch (error) {
    console.error(`Error getting exchange rate by ID: ${error}`);
    return undefined;
  }
}