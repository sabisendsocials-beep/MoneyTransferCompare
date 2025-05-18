// Direct SQL approach to rate verification
import { db } from './db.js';

export async function verifyRate(providerId, fromCurrency, toCurrency, verified) {
  console.log(`Verifying rate: provider=${providerId}, from=${fromCurrency}, to=${toCurrency}, verified=${verified}`);
  
  // Direct raw SQL update for maximum reliability
  try {
    const query = `
      UPDATE exchange_rates 
      SET verified = $1, timestamp = NOW() 
      WHERE provider_id = $2 
        AND from_currency = $3 
        AND to_currency = $4
    `;
    
    const result = await db.query(query, [verified, providerId, fromCurrency, toCurrency]);
    console.log(`Updated ${result.rowCount} rows`);
    
    return {
      success: true,
      rowsUpdated: result.rowCount
    };
  } catch (error) {
    console.error(`Error in verifyRate: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}