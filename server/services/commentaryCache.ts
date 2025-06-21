/**
 * Smart Commentary Caching System
 * Generates 3-5 AI commentaries per day per currency pair to optimize OpenAI quota usage
 * Serves cached commentaries with random rotation for variety
 */

import { db } from '../db';
import { commentaryCache, rateTrends, exchangeRates, providers } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MarketSnapshot {
  currencyPair: string;
  currentRate: number;
  movement: 'up' | 'down' | 'stable';
  changePercent: number;
  bestProvider: string;
  bestRate: number;
  rateSpread: number;
  timestamp: string;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if we have enough commentary variants for today
 */
async function getTodayCommentaryCount(currencyPair: string): Promise<number> {
  const today = getTodayDate();
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(commentaryCache)
    .where(and(
      eq(commentaryCache.currency_pair, currencyPair),
      eq(commentaryCache.generation_date, today)
    ));
    
  return result[0]?.count || 0;
}

/**
 * Get cached commentary for today (random variant)
 */
async function getTodayCachedCommentary(currencyPair: string): Promise<string | null> {
  const today = getTodayDate();
  
  const commentaries = await db
    .select()
    .from(commentaryCache)
    .where(and(
      eq(commentaryCache.currency_pair, currencyPair),
      eq(commentaryCache.generation_date, today)
    ));
    
  if (commentaries.length === 0) {
    return null;
  }
  
  // Return random variant for variety
  const randomIndex = Math.floor(Math.random() * commentaries.length);
  return commentaries[randomIndex].commentary_text;
}

/**
 * Get current market data for AI analysis
 */
async function getCurrentMarketSnapshot(fromCurrency: string, toCurrency: string): Promise<MarketSnapshot> {
  const currencyPair = `${fromCurrency}/${toCurrency}`;
  
  // Get current rates with provider names - get only latest rate per provider
  const currentRatesWithProviders = await db.select({
    rate: exchangeRates.rate,
    providerName: providers.name,
    verified: exchangeRates.verified,
    providerId: exchangeRates.provider_id,
    updatedAt: exchangeRates.timestamp,
  })
    .from(exchangeRates)
    .leftJoin(providers, eq(exchangeRates.provider_id, providers.id))
    .where(and(
      eq(exchangeRates.from_currency, fromCurrency),
      eq(exchangeRates.to_currency, toCurrency),
      sql`${exchangeRates.rate} > 100` // Filter out invalid rates
    ))
    .orderBy(sql`${exchangeRates.timestamp} DESC`);

  // Get recent rate trends for movement analysis
  const recentTrends = await db.select()
    .from(rateTrends)
    .where(and(
      eq(rateTrends.from_currency, fromCurrency),
      eq(rateTrends.to_currency, toCurrency)
    ))
    .orderBy(desc(rateTrends.date))
    .limit(7);

  // Calculate movement and best provider
  const currentRate = recentTrends[0]?.rate || 0;
  const previousRate = recentTrends[1]?.rate || currentRate;
  const changePercent = ((currentRate - previousRate) / previousRate) * 100;
  
  let movement: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) > 0.1) {
    movement = changePercent > 0 ? 'up' : 'down';
  }

  // Deduplicate by taking latest rate per provider
  const latestRatesByProvider = new Map();
  currentRatesWithProviders.forEach(rate => {
    if (rate.rate > 0 && rate.providerName && rate.providerId) {
      const existing = latestRatesByProvider.get(rate.providerId);
      if (!existing || new Date(rate.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
        latestRatesByProvider.set(rate.providerId, rate);
      }
    }
  });
  
  const validRates = Array.from(latestRatesByProvider.values());
  console.log(`Found ${validRates.length} unique provider rates for ${currencyPair}:`);
  validRates.forEach(rate => {
    console.log(`  ${rate.providerName}: ${rate.rate} (verified: ${rate.verified})`);
  });
  
  let bestRate = 0;
  let bestProvider = 'Unknown';
  let minRate = 0;
  let rateSpread = 0;
  
  if (validRates.length > 0) {
    bestRate = Math.max(...validRates.map(r => r.rate));
    bestProvider = validRates.find(r => r.rate === bestRate)?.providerName || 'Unknown';
    
    // Calculate rate spread
    minRate = Math.min(...validRates.map(r => r.rate));
    rateSpread = ((bestRate - minRate) / minRate) * 100;
    
    console.log(`Best provider: ${bestProvider} with rate ${bestRate}, spread: ${rateSpread.toFixed(1)}%`);
  } else {
    console.log(`No valid provider rates found for ${currencyPair}, using trend rate`);
    bestRate = currentRate;
    bestProvider = 'market rate';
  }

  return {
    currencyPair,
    currentRate,
    movement,
    changePercent,
    bestProvider,
    bestRate,
    rateSpread,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate AI commentary using current market data
 */
async function generateAICommentary(marketData: MarketSnapshot, variantNumber: number): Promise<string> {
  const prompt = `Analyze this currency market data and provide a concise, data-driven insight in 1-2 sentences. Focus on actionable information for money transfer customers.

Currency: ${marketData.currencyPair}
Current Rate: ${marketData.currentRate.toFixed(2)}
24h Movement: ${marketData.movement} ${Math.abs(marketData.changePercent).toFixed(1)}%
Best Provider: ${marketData.bestProvider} (${marketData.bestRate.toFixed(2)})
Market Spread: ${marketData.rateSpread.toFixed(1)}%

Variant ${variantNumber}/5: Provide a unique perspective focusing on ${
  variantNumber === 1 ? 'provider competitiveness' :
  variantNumber === 2 ? 'rate movement trends' :
  variantNumber === 3 ? 'transfer timing opportunities' :
  variantNumber === 4 ? 'market spreads and value' :
  'overall market conditions'
}.

Return only the commentary text, no headers or explanations.`;

  try {
    console.log(`Making OpenAI request for variant ${variantNumber}...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.7,
    });

    const commentary = response.choices[0].message.content?.trim() || '';
    console.log(`OpenAI response for variant ${variantNumber}: "${commentary}"`);
    return commentary;
  } catch (error) {
    console.error('OpenAI API error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Generate and cache daily commentary variants
 */
async function generateDailyCommentary(currencyPair: string): Promise<void> {
  const [fromCurrency, toCurrency] = currencyPair.split('/');
  const today = getTodayDate();
  
  try {
    console.log(`Getting market snapshot for ${currencyPair}...`);
    // Get current market snapshot
    const marketData = await getCurrentMarketSnapshot(fromCurrency, toCurrency);
    console.log(`Market data for ${currencyPair}:`, JSON.stringify(marketData, null, 2));
    
    // Generate 5 variants for variety
    const variants = [];
    for (let i = 1; i <= 5; i++) {
      try {
        console.log(`Generating variant ${i} for ${currencyPair}...`);
        const commentary = await generateAICommentary(marketData, i);
        if (commentary) {
          variants.push({
            currency_pair: currencyPair,
            commentary_text: commentary,
            generation_date: today,
            variant_number: i,
            market_data: JSON.stringify(marketData)
          });
          console.log(`Successfully generated variant ${i}: "${commentary}"`);
        } else {
          console.log(`No commentary returned for variant ${i}`);
        }
        
        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to generate variant ${i} for ${currencyPair}:`, error);
        // Continue with other variants even if one fails
      }
    }
    
    // Store successful variants in cache or generate fallback
    if (variants.length > 0) {
      await db.insert(commentaryCache).values(variants);
      console.log(`✅ Generated and cached ${variants.length} commentary variants for ${currencyPair}`);
    } else {
      console.log(`No AI variants generated for ${currencyPair}, using data-driven commentary`);
      // Generate data-driven commentary with current provider data
      const fallbackCommentary = generateFallbackCommentary(marketData);
      await db.insert(commentaryCache).values({
        currency_pair: currencyPair,
        commentary_text: fallbackCommentary,
        generation_date: today,
        variant_number: 1,
        market_data: JSON.stringify(marketData)
      });
      console.log(`✅ Generated fresh data-driven commentary: "${fallbackCommentary}"`);
    }
    
  } catch (error) {
    console.error(`Failed to generate daily commentary for ${currencyPair}:`, error);
    throw error;
  }
}

/**
 * Get commentary with smart caching - main public function
 */
export async function getSmartCommentary(fromCurrency: string, toCurrency: string): Promise<string> {
  const currencyPair = `${fromCurrency}/${toCurrency}`;
  
  try {
    // First, try to get cached commentary for today
    const cachedCommentary = await getTodayCachedCommentary(currencyPair);
    if (cachedCommentary) {
      return cachedCommentary;
    }
    
    // Check if we need to generate new commentary
    const todayCount = await getTodayCommentaryCount(currencyPair);
    if (todayCount === 0) {
      // Generate daily commentary if none exists
      await generateDailyCommentary(currencyPair);
      
      // Try to get the newly generated commentary
      const newCommentary = await getTodayCachedCommentary(currencyPair);
      if (newCommentary) {
        return newCommentary;
      }
    }
    
    // Fallback to simple data-driven commentary if AI generation fails
    const marketData = await getCurrentMarketSnapshot(fromCurrency, toCurrency);
    return generateFallbackCommentary(marketData);
    
  } catch (error) {
    console.error('Error in smart commentary system:', error);
    
    // Generate fallback without AI
    try {
      const marketData = await getCurrentMarketSnapshot(fromCurrency, toCurrency);
      return generateFallbackCommentary(marketData);
    } catch (fallbackError) {
      console.error('Fallback commentary failed:', fallbackError);
      return `${fromCurrency}/${toCurrency} market analysis temporarily unavailable.`;
    }
  }
}

/**
 * Generate simple data-driven commentary without AI
 */
function generateFallbackCommentary(marketData: MarketSnapshot): string {
  const { currencyPair, movement, changePercent, bestProvider, rateSpread, bestRate } = marketData;
  
  // Ensure realistic spread calculation
  const validSpread = rateSpread > 0 && rateSpread < 100 ? rateSpread : 0;
  
  if (movement === 'up' && Math.abs(changePercent) > 1) {
    return `${currencyPair} strengthened ${Math.abs(changePercent).toFixed(1)}% today - ${bestProvider} offers competitive rates at ${bestRate.toFixed(0)}.`;
  } else if (movement === 'down' && Math.abs(changePercent) > 1) {
    return `${currencyPair} declined ${Math.abs(changePercent).toFixed(1)}% - good opportunity with ${bestProvider} at ${bestRate.toFixed(0)}.`;
  } else if (validSpread > 2) {
    return `${currencyPair} shows ${validSpread.toFixed(1)}% provider spread - ${bestProvider} leads at ${bestRate.toFixed(0)}.`;
  } else if (validSpread > 0) {
    return `${currencyPair} competitive market - ${bestProvider} offers best rate at ${bestRate.toFixed(0)}.`;
  } else {
    return `${currencyPair} stable conditions - ${bestProvider} maintains strong position.`;
  }
}

/**
 * Clean up old commentary cache (run daily)
 */
export async function cleanupOldCommentary(): Promise<void> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];
  
  try {
    const result = await db.delete(commentaryCache)
      .where(sql`generation_date < ${cutoffDate}`);
    
    console.log(`Cleaned up old commentary cache entries`);
  } catch (error) {
    console.error('Failed to cleanup old commentary:', error);
  }
}

/**
 * Batch generate commentary for all major currency pairs (run once daily)
 */
export async function generateDailyCommentaryBatch(): Promise<void> {
  const majorPairs = [
    'GBP/NGN', 'EUR/NGN', 'USD/NGN',
    'GBP/GHS', 'EUR/GHS', 'USD/GHS',
    'GBP/KES', 'EUR/KES', 'USD/KES',
    'GBP/INR', 'EUR/INR', 'USD/INR',
    'GBP/PKR', 'EUR/PKR', 'USD/PKR'
  ];
  
  console.log('Starting daily commentary generation batch...');
  
  for (const pair of majorPairs) {
    try {
      const count = await getTodayCommentaryCount(pair);
      console.log(`${pair} has ${count} commentaries for today`);
      // Force generation for all pairs to get fresh data
      console.log(`Generating fresh commentary for ${pair}...`);
      const [fromCurrency, toCurrency] = pair.split('/');
      const marketData = await getCurrentMarketSnapshot(fromCurrency, toCurrency);
      const commentary = generateFallbackCommentary(marketData);
      
      // Clear existing commentaries for this pair today
      await db.delete(commentaryCache)
        .where(and(
          eq(commentaryCache.currency_pair, pair),
          eq(commentaryCache.generation_date, getTodayDate())
        ));
      
      // Generate 5 variants with different perspectives
      const variants = [];
      for (let i = 1; i <= 5; i++) {
        let variantCommentary = commentary;
        
        // Create variations based on different data aspects
        if (i === 2 && marketData.rateSpread > 1) {
          variantCommentary = `${pair} market spread at ${marketData.rateSpread.toFixed(1)}% - ${marketData.bestProvider} leading competitive rates.`;
        } else if (i === 3 && marketData.bestRate > 0) {
          variantCommentary = `${marketData.bestProvider} sets pace for ${pair} transfers at ${marketData.bestRate.toFixed(0)} rate.`;
        } else if (i === 4) {
          variantCommentary = `${pair} competition heating up - ${marketData.bestProvider} maintains advantage.`;
        } else if (i === 5) {
          variantCommentary = `Current ${pair} trends favor ${marketData.bestProvider} for optimal transfer value.`;
        }
        
        variants.push({
          currency_pair: pair,
          commentary_text: variantCommentary,
          generation_date: getTodayDate(),
          variant_number: i,
          market_data: JSON.stringify(marketData)
        });
      }
      
      await db.insert(commentaryCache).values(variants);
      console.log(`Generated 5 commentary variants for ${pair}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to generate commentary for ${pair}:`, error);
    }
  }
  
  console.log('Daily commentary generation batch completed');
}