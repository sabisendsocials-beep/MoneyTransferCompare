/**
 * Test commentary generation with current provider data
 */

import { db } from './server/db.js';
import { exchangeRates, providers } from './shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';

async function testCommentaryGeneration() {
  try {
    console.log('Testing commentary generation with current data...');
    
    // Get current GBP/NGN rates from all providers
    const currentRates = await db.select({
      rate: exchangeRates.rate,
      providerName: providers.name,
      verified: exchangeRates.verified,
    })
      .from(exchangeRates)
      .leftJoin(providers, eq(exchangeRates.provider_id, providers.id))
      .where(and(
        eq(exchangeRates.from_currency, 'GBP'),
        eq(exchangeRates.to_currency, 'NGN'),
        sql`${exchangeRates.rate} > 0`
      ));

    console.log('Current provider rates for GBP/NGN:');
    currentRates.forEach(rate => {
      console.log(`  ${rate.providerName}: ${rate.rate} (verified: ${rate.verified})`);
    });

    // Find best provider
    const validRates = currentRates.filter(r => r.rate > 0 && r.providerName);
    if (validRates.length > 0) {
      const bestRate = Math.max(...validRates.map(r => r.rate));
      const bestProvider = validRates.find(r => r.rate === bestRate)?.providerName;
      const minRate = Math.min(...validRates.map(r => r.rate));
      const spread = ((bestRate - minRate) / minRate) * 100;
      
      console.log(`\nBest provider: ${bestProvider} with rate ${bestRate}`);
      console.log(`Rate spread: ${spread.toFixed(1)}%`);
      
      // Generate simple data-driven commentary with current data
      const commentary = `GBP/NGN shows ${spread.toFixed(1)}% spread - ${bestProvider} leads market rates.`;
      console.log(`\nGenerated commentary: "${commentary}"`);
    } else {
      console.log('No valid provider rates found');
    }

  } catch (error) {
    console.error('Error testing commentary generation:', error);
  }
}

testCommentaryGeneration();