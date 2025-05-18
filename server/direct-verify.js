// Direct SQL verification function
import { pool } from './db.js';

/**
 * Directly verifies an exchange rate by provider ID and currency pair
 */
export async function directVerify(providerId, fromCurrency, toCurrency, verified) {
  console.log(`Direct verify request: provider=${providerId}, from=${fromCurrency}, to=${toCurrency}, verified=${verified}`);
  
  try {
    // Use the pool directly with parameterized query
    const result = await pool.query(
      `UPDATE exchange_rates 
       SET verified = $1
       WHERE provider_id = $2 
         AND from_currency = $3
         AND to_currency = $4`,
      [verified, providerId, fromCurrency, toCurrency]
    );
    
    console.log(`Verification result: ${result.rowCount} rows affected`);
    return { 
      success: true, 
      rowCount: result.rowCount 
    };
  } catch (error) {
    console.error('Error in direct verification:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}