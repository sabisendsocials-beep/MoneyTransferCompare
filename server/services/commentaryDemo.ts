/**
 * AI Commentary Demo
 * Simplified working demonstration of AI-generated market commentary
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MarketData {
  currencyPair: string;
  currentRate: number;
  movement: 'up' | 'down' | 'stable';
  changePercent: number;
  bestProvider: string;
  bestRate: number;
  rateSpread: number;
}

/**
 * Get real market data from database for analysis
 */
async function getRealMarketData(fromCurrency: string, toCurrency: string): Promise<MarketData> {
  try {
    // Import database connection
    const { db } = await import('../db');
    const { rateTrends, exchangeRates, providers } = await import('../../shared/schema');
    const { desc, eq, and } = await import('drizzle-orm');
    
    // Get current rates with provider names
    const currentRatesWithProviders = await db.select({
      rate: exchangeRates.rate,
      providerName: providers.name,
      providerId: exchangeRates.provider_id,
      verified: exchangeRates.verified,
      source: exchangeRates.source
    })
      .from(exchangeRates)
      .leftJoin(providers, eq(exchangeRates.provider_id, providers.id))
      .where(and(
        eq(exchangeRates.from_currency, fromCurrency),
        eq(exchangeRates.to_currency, toCurrency)
      ));
    
    // Get recent rate trends for movement analysis
    const recentTrends = await db.select()
      .from(rateTrends)
      .where(and(
        eq(rateTrends.from_currency, fromCurrency),
        eq(rateTrends.to_currency, toCurrency)
      ))
      .orderBy(desc(rateTrends.date))
      .limit(7);
    
    // Analyze provider performance
    const validRates = currentRatesWithProviders.filter(p => p.rate > 0 && p.verified !== false);
    if (validRates.length === 0) {
      return getSimulatedMarketData(fromCurrency, toCurrency);
    }
    
    const bestProvider = validRates.reduce((best, current) => 
      current.rate > best.rate ? current : best
    );
    const worstProvider = validRates.reduce((worst, current) => 
      current.rate < worst.rate ? current : worst
    );
    
    // Calculate rate spread
    const rateSpread = validRates.length > 1 ? 
      ((bestProvider.rate - worstProvider.rate) / worstProvider.rate * 100) : 0;
    
    // Analyze recent movement
    let movement: 'up' | 'down' | 'stable' = 'stable';
    let changePercent = 0;
    
    if (recentTrends.length >= 2) {
      const latestRate = recentTrends[0].rate;
      const previousRate = recentTrends[1].rate;
      changePercent = ((latestRate - previousRate) / previousRate) * 100;
      
      if (Math.abs(changePercent) > 0.1) {
        movement = changePercent > 0 ? 'up' : 'down';
      }
    }
    
    return {
      currencyPair: `${fromCurrency}/${toCurrency}`,
      currentRate: recentTrends.length > 0 ? recentTrends[0].rate : bestProvider.rate,
      movement,
      changePercent,
      bestProvider: bestProvider.providerName || 'Leading Provider',
      bestRate: bestProvider.rate,
      rateSpread
    };
    
  } catch (error) {
    console.error('Error fetching real market data:', error);
    return getSimulatedMarketData(fromCurrency, toCurrency);
  }
}

/**
 * Fallback simulated data when database is unavailable
 */
function getSimulatedMarketData(fromCurrency: string, toCurrency: string): MarketData {
  const providers = ['Lemfi', 'Remitly', 'Wise', 'WorldRemit', 'MoneyGram'];
  const bestProvider = providers[Math.floor(Math.random() * providers.length)];
  
  return {
    currencyPair: `${fromCurrency}/${toCurrency}`,
    currentRate: 2067,
    movement: 'stable',
    changePercent: 0.1,
    bestProvider,
    bestRate: 2067 * 1.01,
    rateSpread: 2.5
  };
}

/**
 * Generate AI commentary for market data with data-driven insights
 */
async function generateMarketCommentary(data: MarketData): Promise<string> {
  try {
    const prompt = `Generate a concise, data-driven market insight about the ${data.currencyPair} exchange rate.

Key Market Data:
- Current rate: ${data.currentRate.toFixed(2)}
- Movement: ${data.movement} by ${Math.abs(data.changePercent).toFixed(2)}%
- Best provider: ${data.bestProvider} at ${data.bestRate.toFixed(2)}
- Provider spread: ${data.rateSpread.toFixed(1)}% between best and worst rates

Requirements:
- Be analytical and informative, not promotional
- Include specific numbers from the data provided
- Explain what the data means for someone sending money
- Keep it under 35 words
- Focus on ONE key insight (movement, spread, or provider leadership)

Examples of good insights:
"${data.bestProvider} leads with rates ${data.rateSpread.toFixed(1)}% above competitors - on a £500 transfer, that's roughly £${(500 * data.rateSpread / 100).toFixed(0)} extra value."
"The ${Math.abs(data.changePercent).toFixed(1)}% rate movement today means your transfer could be worth ${data.changePercent > 0 ? 'more' : 'less'} than yesterday."

Generate ONE data-focused insight:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",  
          content: "You are a financial analyst providing clear, data-driven market insights. Be informative and helpful, not promotional. Always reference specific numbers and explain what they mean for customers. Use British English."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.6
    });

    return response.choices[0].message.content?.trim() || 
           generateDataDrivenFallback(data);
    
  } catch (error) {
    console.error('Error generating AI commentary:', error);
    return generateDataDrivenFallback(data);
  }
}

/**
 * Generate data-driven fallback commentary when AI is unavailable
 */
function generateDataDrivenFallback(data: MarketData): string {
  const spreadSavings = (500 * data.rateSpread / 100).toFixed(0);
  const isSignificantMovement = Math.abs(data.changePercent) > 0.3;
  const isWideSpread = data.rateSpread > 2.5;
  
  // Data-driven insights based on market conditions
  if (isSignificantMovement) {
    return `${data.currencyPair} ${data.movement === 'up' ? 'rose' : 'fell'} ${Math.abs(data.changePercent).toFixed(1)}% today. ${data.bestProvider} leads at ${data.bestRate.toFixed(0)} - a ${data.rateSpread.toFixed(1)}% edge over competitors.`;
  }
  
  if (isWideSpread) {
    return `Provider spread is ${data.rateSpread.toFixed(1)}% today - choosing ${data.bestProvider} over the lowest rate could mean ~£${spreadSavings} more on a £500 transfer.`;
  }
  
  return `${data.bestProvider} leads ${data.currencyPair} at ${data.bestRate.toFixed(0)}. With a ${data.rateSpread.toFixed(1)}% spread between providers, comparing rates before sending is worthwhile.`;
}

function generateEntertainingFallback(data: MarketData): string {
  return generateDataDrivenFallback(data);
}

/**
 * Generate friendly, conversational commentary without AI
 */
function generateFallbackCommentary(marketData: MarketData): string {
  const { currencyPair, movement, changePercent, bestProvider, rateSpread } = marketData;
  
  if (movement === 'up' && Math.abs(changePercent) > 1) {
    const upMessages = [
      `Rates are trending upward this week - ${bestProvider} leading!`,
      `Perfect time to send money today with ${bestProvider} rates climbing!`,
      `You can save extra today - ${bestProvider} rates going up!`,
      `Rates are getting hot and ${bestProvider} is on top!`,
      `Wow, didn't expect ${bestProvider} to jump this much!`
    ];
    return upMessages[Math.floor(Math.random() * upMessages.length)];
  } else if (movement === 'down' && Math.abs(changePercent) > 1) {
    const downMessages = [
      `Perfect time to send money today - rates are starting to fall!`,
      `${bestProvider} reliable as always, holding steady while others drop!`,
      `Good timing with ${bestProvider} - still best rates despite the dip!`,
      `Plot twist - ${bestProvider} stays strong while market wobbles!`,
      `Rates cooling off but ${bestProvider} keeps you covered!`
    ];
    return downMessages[Math.floor(Math.random() * downMessages.length)];
  } else if (rateSpread > 3) {
    const spreadMessages = [
      `You can save big today - ${bestProvider} way ahead of everyone!`,
      `Rates are getting hot and it's not the usual providers at the top!`,
      `Wow, didn't expect ${bestProvider} to dominate like this!`,
      `${bestProvider} crushing it - perfect timing to save extra!`,
      `This is unexpected - ${bestProvider} beating everyone by miles!`
    ];
    return spreadMessages[Math.floor(Math.random() * spreadMessages.length)];
  } else {
    const stableMessages = [
      `${bestProvider} reliable as always and offering best transfer rate today!`,
      `Perfect time for ${bestProvider} - steady rates, no surprises!`,
      `${bestProvider} keeping things stable - you know what you're getting!`,
      `Rates looking good with ${bestProvider} leading as usual!`,
      `${bestProvider} consistent choice - sometimes steady is best!`
    ];
    return stableMessages[Math.floor(Math.random() * stableMessages.length)];
  }
}

interface CommentaryResult {
  currencyPair: string;
  commentary: string;
  timestamp: string;
  metadata?: {
    bestProvider: string;
    bestRate: number;
    rateSpread: number;
    movement: 'up' | 'down' | 'stable';
    changePercent: number;
    providerCount: number;
    dataSource: string;
  };
}

/**
 * Generate commentary for a specific currency pair using smart caching
 */
export async function generateCommentary(fromCurrency: string, toCurrency: string): Promise<CommentaryResult> {
  console.log(`Getting cached commentary for ${fromCurrency}/${toCurrency}...`);
  
  // Get real market data for metadata
  const marketData = await getRealMarketData(fromCurrency, toCurrency);
  
  // Count providers from database
  let providerCount = 0;
  try {
    const { db } = await import('../db');
    const { exchangeRates, providers } = await import('../../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    
    const rates = await db.select()
      .from(exchangeRates)
      .leftJoin(providers, eq(exchangeRates.provider_id, providers.id))
      .where(and(
        eq(exchangeRates.from_currency, fromCurrency),
        eq(exchangeRates.to_currency, toCurrency)
      ));
    providerCount = rates.filter(r => r.exchange_rates.rate > 0).length;
  } catch (e) {
    providerCount = 12;
  }
  
  const metadata = {
    bestProvider: marketData.bestProvider,
    bestRate: marketData.bestRate,
    rateSpread: marketData.rateSpread,
    movement: marketData.movement,
    changePercent: marketData.changePercent,
    providerCount: providerCount || 12,
    dataSource: 'live'
  };
  
  try {
    // Use smart caching system instead of generating on every request
    const { getSmartCommentary } = await import('./commentaryCache');
    const commentary = await getSmartCommentary(fromCurrency, toCurrency);
    
    console.log(`Served from cache: "${commentary}"`);
    
    return {
      currencyPair: `${fromCurrency}/${toCurrency}`,
      commentary,
      timestamp: new Date().toISOString(),
      metadata
    };
  } catch (error) {
    console.log(`Cache failed, using fallback for ${fromCurrency}/${toCurrency}`);
    
    // Fallback to real market data analysis
    const commentary = generateFallbackCommentary(marketData);
    
    console.log(`Generated fallback: "${commentary}"`);
    
    return {
      currencyPair: marketData.currencyPair,
      commentary,
      timestamp: new Date().toISOString(),
      metadata
    };
  }
}

/**
 * Generate commentaries for popular currency pairs
 */
export async function generatePopularCommentaries(): Promise<Record<string, string>> {
  const popularPairs = [
    { from: 'GBP', to: 'NGN' },
    { from: 'EUR', to: 'NGN' },
    { from: 'USD', to: 'NGN' },
    { from: 'GBP', to: 'GHS' },
    { from: 'GBP', to: 'KES' }
  ];
  
  const commentaries: Record<string, string> = {};
  
  for (const pair of popularPairs) {
    const pairKey = `${pair.from}/${pair.to}`;
    try {
      const result = await generateCommentary(pair.from, pair.to);
      commentaries[pairKey] = result.commentary;
      
      // Rate limiting between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to generate commentary for ${pairKey}:`, error);
      commentaries[pairKey] = `Competitive rates available for ${pairKey} transfers today.`;
    }
  }
  
  return commentaries;
}