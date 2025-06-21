/**
 * Test single commentary generation with current provider data
 */

import { db } from './server/db.js';
import { exchangeRates, providers, commentaryCache } from './shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';

async function testSingleCommentary() {
  try {
    console.log('Testing single commentary generation...');
    
    const currencyPair = 'GBP/NGN';
    const today = new Date().toISOString().split('T')[0];
    
    // Get current provider rates
    const currentRates = await db.select({
      rate: exchangeRates.rate,
      providerName: providers.name,
      verified: exchangeRates.verified,
      providerId: exchangeRates.provider_id,
      timestamp: exchangeRates.timestamp,
    })
      .from(exchangeRates)
      .leftJoin(providers, eq(exchangeRates.provider_id, providers.id))
      .where(and(
        eq(exchangeRates.from_currency, 'GBP'),
        eq(exchangeRates.to_currency, 'NGN'),
        sql`${exchangeRates.rate} > 100`
      ))
      .orderBy(sql`${exchangeRates.timestamp} DESC`);

    console.log(`Found ${currentRates.length} total rates for ${currencyPair}`);

    // Deduplicate by provider
    const latestRatesByProvider = new Map();
    currentRates.forEach(rate => {
      if (rate.rate > 0 && rate.providerName && rate.providerId) {
        const existing = latestRatesByProvider.get(rate.providerId);
        if (!existing || new Date(rate.timestamp || 0) > new Date(existing.timestamp || 0)) {
          latestRatesByProvider.set(rate.providerId, rate);
        }
      }
    });

    const validRates = Array.from(latestRatesByProvider.values());
    console.log(`Found ${validRates.length} unique provider rates:`);
    
    let bestRate = 0;
    let bestProvider = 'Unknown';
    let rateSpread = 0;

    if (validRates.length > 0) {
      bestRate = Math.max(...validRates.map(r => r.rate));
      bestProvider = validRates.find(r => r.rate === bestRate)?.providerName || 'Unknown';
      const minRate = Math.min(...validRates.map(r => r.rate));
      rateSpread = ((bestRate - minRate) / minRate) * 100;

      console.log(`Best provider: ${bestProvider} with rate ${bestRate}`);
      console.log(`Rate spread: ${rateSpread.toFixed(1)}%`);

      // Generate commentary
      const validSpread = rateSpread > 0 && rateSpread < 100 ? rateSpread : 0;
      let commentary;
      
      if (validSpread > 2) {
        commentary = `${currencyPair} shows ${validSpread.toFixed(1)}% provider spread - ${bestProvider} leads at ${bestRate.toFixed(0)}.`;
      } else if (validSpread > 0) {
        commentary = `${currencyPair} competitive market - ${bestProvider} offers best rate at ${bestRate.toFixed(0)}.`;
      } else {
        commentary = `${currencyPair} stable conditions - ${bestProvider} maintains strong position.`;
      }

      console.log(`Generated commentary: "${commentary}"`);

      // Store in cache
      await db.delete(commentaryCache)
        .where(and(
          eq(commentaryCache.currency_pair, currencyPair),
          eq(commentaryCache.generation_date, today)
        ));

      await db.insert(commentaryCache).values({
        currency_pair: currencyPair,
        commentary_text: commentary,
        generation_date: today,
        variant_number: 1,
        market_data: JSON.stringify({
          currencyPair,
          bestProvider,
          bestRate,
          rateSpread: validSpread
        })
      });

      console.log('Successfully stored commentary in cache');
    } else {
      console.log('No valid provider rates found');
    }

  } catch (error) {
    console.error('Error testing commentary generation:', error);
  }
}

testSingleCommentary();