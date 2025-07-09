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
  // Historical trend insights
  monthlyTrend?: 'up' | 'down' | 'stable';
  monthlyChangePercent?: number;
  historicalPositioning?: 'high' | 'low' | 'normal';
  trendContext?: string;
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
 * Get current market data for AI analysis with historical trend context
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

  // Get 30-day historical data for trend context
  const thirtyDayTrends = await db.select()
    .from(rateTrends)
    .where(and(
      eq(rateTrends.from_currency, fromCurrency),
      eq(rateTrends.to_currency, toCurrency)
    ))
    .orderBy(desc(rateTrends.date))
    .limit(30);

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

  // Calculate historical trend insights
  let monthlyTrend: 'up' | 'down' | 'stable' = 'stable';
  let monthlyChangePercent = 0;
  let historicalPositioning: 'high' | 'low' | 'normal' = 'normal';
  let trendContext = '';

  if (thirtyDayTrends.length >= 2) {
    const oldestRate = thirtyDayTrends[thirtyDayTrends.length - 1]?.rate || currentRate;
    monthlyChangePercent = ((currentRate - oldestRate) / oldestRate) * 100;
    
    if (Math.abs(monthlyChangePercent) > 2) {
      monthlyTrend = monthlyChangePercent > 0 ? 'up' : 'down';
    }

    // Determine if current rate is historically high/low
    if (thirtyDayTrends.length >= 20) {
      const rates = thirtyDayTrends.map(t => t.rate).filter(r => r > 0);
      const maxRate = Math.max(...rates);
      const minRate = Math.min(...rates);
      const rateRange = maxRate - minRate;
      
      if (currentRate >= maxRate - (rateRange * 0.15)) {
        historicalPositioning = 'high';
        trendContext = Math.abs(monthlyChangePercent) > 3 
          ? `${currencyPair} near 30-day highs` 
          : `${currencyPair} trading near recent peaks`;
      } else if (currentRate <= minRate + (rateRange * 0.15)) {
        historicalPositioning = 'low';
        trendContext = Math.abs(monthlyChangePercent) > 3 
          ? `${currencyPair} near 30-day lows - could be opportunity` 
          : `${currencyPair} trading at recent discount levels`;
      } else {
        trendContext = monthlyTrend === 'up' 
          ? `${currencyPair} trending upward over 30 days` 
          : monthlyTrend === 'down' 
          ? `${currencyPair} trending downward over 30 days`
          : `${currencyPair} stable over recent weeks`;
      }
    }
  }

  return {
    currencyPair,
    currentRate,
    movement,
    changePercent,
    bestProvider,
    bestRate,
    rateSpread,
    timestamp: new Date().toISOString(),
    monthlyTrend,
    monthlyChangePercent,
    historicalPositioning,
    trendContext
  };
}

/**
 * Generate AI commentary using current market data
 */
async function generateAICommentary(marketData: MarketSnapshot, variantNumber: number): Promise<string> {
  // Include historical context in the prompt occasionally
  const includeHistoricalContext = Math.random() < 0.4; // 40% chance to include historical insights
  
  let historicalInsight = '';
  if (includeHistoricalContext && marketData.trendContext) {
    if (marketData.historicalPositioning === 'high') {
      historicalInsight = `Historical context: ${marketData.trendContext} - rates are strong right now!`;
    } else if (marketData.historicalPositioning === 'low') {
      historicalInsight = `Historical context: ${marketData.trendContext} - this could be good timing!`;
    } else if (Math.abs(marketData.monthlyChangePercent || 0) > 3) {
      historicalInsight = `30-day trend: ${marketData.currencyPair} ${marketData.monthlyTrend === 'up' ? 'gained' : 'dropped'} ${Math.abs(marketData.monthlyChangePercent || 0).toFixed(1)}% this month.`;
    }
  }

  const prompt = `You're giving casual money transfer advice to a friend. Use natural, varied language that sounds genuinely human.

${marketData.currencyPair} situation:
- Current rate: ${marketData.currentRate.toFixed(2)}
- ${marketData.bestProvider} has the best deal at ${marketData.bestRate.toFixed(2)}
- It's ${marketData.rateSpread.toFixed(1)}% better than other options
${historicalInsight ? `- ${historicalInsight}` : ''}

Write in one of these natural styles:

SAVINGS-FOCUSED: "You can save [amount] sending money today", "Perfect time to send money", "Rates are getting good"

MARKET OBSERVATIONS: "Rates are trending upward", "It's not the usual providers at the top", "Things are heating up"

TIMING ADVICE: "Perfect time to send money today", "Rates are starting to fall", "Get in before rates change"

SURPRISE ELEMENTS: "Wow, didn't expect that one", "Plot twist", "This is unexpected"

RELIABLE PROVIDERS: "${marketData.bestProvider} reliable as always", "You know what you're getting", "Steady as usual"

Keep it under 20 words. Sound natural and conversational, not overly excited.

Tone: ${
  variantNumber === 1 ? 'Focus on savings opportunity and amounts' :
  variantNumber === 2 ? 'Market observation and trend awareness' :
  variantNumber === 3 ? 'Timing advice and urgency' :
  variantNumber === 4 ? 'Surprise and unexpected elements' :
  'Provider reliability and trust'
}`;

  try {
    console.log(`Making OpenAI request for variant ${variantNumber}...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You're a helpful financial expert who explains exchange rates in simple, conversational language. Sound like you're talking to a friend, not giving a formal report. Be warm, encouraging, and focus on practical insights."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 80,
      temperature: 0.8,
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
      return `${fromCurrency}/${toCurrency} rates looking good today - check back for live updates!`;
    }
  }
}

/**
 * Generate friendly, conversational commentary without AI
 */
function generateFallbackCommentary(marketData: MarketSnapshot): string {
  const { currencyPair, movement, changePercent, bestProvider, rateSpread, bestRate } = marketData;
  
  // Ensure realistic spread calculation
  const validSpread = rateSpread > 0 && rateSpread < 100 ? rateSpread : 0;
  
  // Create relatable, personality-driven commentary options with occasional historical context
  const includeHistoricalContext = Math.random() < 0.3; // 30% chance for historical insights
  
  if (movement === 'up' && Math.abs(changePercent) > 1) {
    const upOptions = [
      `Rates are trending upward this week - ${bestProvider} leading the charge!`,
      `Perfect time to send money today - ${bestProvider} rates climbing!`,
      `You can save extra today with ${bestProvider} rates going up!`,
      `Rates are getting hot and ${bestProvider} is on top!`,
      `Wow, didn't expect ${bestProvider} to jump this much today!`
    ];
    
    // Add historical context variants occasionally
    if (includeHistoricalContext && marketData.historicalPositioning === 'high') {
      upOptions.push(`${bestProvider} hitting recent peaks - rates looking strong!`);
    } else if (includeHistoricalContext && Math.abs(marketData.monthlyChangePercent || 0) > 5) {
      upOptions.push(`Rates been climbing all month and ${bestProvider} still leading!`);
    }
    
    return upOptions[Math.floor(Math.random() * upOptions.length)];
  } else if (movement === 'down' && Math.abs(changePercent) > 1) {
    const downOptions = [
      `Perfect time to send money today - rates are starting to fall!`,
      `${bestProvider} reliable as always, holding steady while others drop!`,
      `Good timing - ${bestProvider} still offering best rates despite the dip!`,
      `Rates cooling off but ${bestProvider} keeps you covered!`,
      `Plot twist - ${bestProvider} stays strong while market wobbles!`
    ];
    
    // Add historical context variants occasionally  
    if (includeHistoricalContext && marketData.historicalPositioning === 'low') {
      downOptions.push(`Perfect timing - rates at recent lows with ${bestProvider}!`);
    } else if (includeHistoricalContext && marketData.monthlyTrend === 'down') {
      downOptions.push(`Rates been dropping but ${bestProvider} holding strong!`);
    }
    
    return downOptions[Math.floor(Math.random() * downOptions.length)];
  } else if (validSpread > 3) {
    const spreadOptions = [
      `You can save big today - ${bestProvider} way ahead of everyone!`,
      `Rates are getting hot and it's not the usual providers at the top!`,
      `Wow, didn't expect ${bestProvider} to dominate like this today!`,
      `${bestProvider} crushing it - perfect timing to save extra money!`,
      `This is unexpected - ${bestProvider} beating everyone by miles!`
    ];
    
    // Add historical context variants occasionally
    if (includeHistoricalContext && marketData.historicalPositioning === 'high') {
      spreadOptions.push(`${bestProvider} at recent highs - rates looking strong!`);
    }
    
    return spreadOptions[Math.floor(Math.random() * spreadOptions.length)];
  } else if (validSpread > 1) {
    const competitiveOptions = [
      `${bestProvider} reliable as always - slight edge but worth it!`,
      `Perfect time for ${bestProvider} - rates looking steady today!`,
      `${bestProvider} quietly leading today - good choice as usual!`,
      `Rates getting competitive but ${bestProvider} still on top!`,
      `${bestProvider} edging ahead - every little bit helps!`
    ];
    return competitiveOptions[Math.floor(Math.random() * competitiveOptions.length)];
  } else {
    const stableOptions = [
      `${bestProvider} reliable as always and offering best transfer rate today!`,
      `Perfect time for ${bestProvider} - steady rates, no surprises!`,
      `${bestProvider} keeping things stable - you know what you're getting!`,
      `Rates looking good with ${bestProvider} leading as usual!`,
      `${bestProvider} consistent choice - sometimes steady is best!`
    ];
    
    // Add historical context variants occasionally
    if (includeHistoricalContext && Math.abs(marketData.monthlyChangePercent || 0) < 2) {
      stableOptions.push(`${bestProvider} been rock steady lately - reliable as always!`);
    } else if (includeHistoricalContext && marketData.monthlyTrend === 'up') {
      stableOptions.push(`${bestProvider} slowly climbing all month - nice and steady!`);
    }
    
    return stableOptions[Math.floor(Math.random() * stableOptions.length)];
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
      console.log(`Generated 5 commentary variants for ${pair}: "${variants[0].commentary_text}"`);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to generate commentary for ${pair}:`, error);
    }
  }
  
  console.log('Daily commentary generation batch completed');
}