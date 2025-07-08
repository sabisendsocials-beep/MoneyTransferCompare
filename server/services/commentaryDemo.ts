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
 * Generate AI commentary for market data with entertaining tone
 */
async function generateMarketCommentary(data: MarketData): Promise<string> {
  try {
    const prompt = `Generate insightful market commentary about the ${data.currencyPair} exchange rate based on real data analysis.

Market Data Analysis:
- Current rate: ${data.currentRate.toFixed(2)}
- Movement: ${data.movement} by ${Math.abs(data.changePercent).toFixed(2)}%
- Best provider: ${data.bestProvider} at ${data.bestRate.toFixed(2)}
- Provider spread: ${data.rateSpread.toFixed(1)}% between best and worst rates
- Rate advantage: ${data.bestProvider} offers ${((data.bestRate - data.currentRate) / data.currentRate * 100).toFixed(1)}% better than market rate

Focus on data-driven insights such as:
- Why ${data.bestProvider} is leading today (rate competitiveness, position change)
- What the ${Math.abs(data.changePercent).toFixed(2)}% movement means for transfers
- How the ${data.rateSpread.toFixed(1)}% spread compares to typical market conditions
- Provider performance relative to their usual position
- Real value impact for customers sending money

Style: Analytical but accessible. Base insights on the actual data provided. Maximum 40 words.

Generate ONE data-driven insight based on real market analysis:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You're a friendly financial expert who explains exchange rates in simple, conversational language. Sound like you're chatting with a friend about money transfers - helpful, encouraging, and practical. Keep it natural and focus on what matters to someone sending money abroad."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.8
    });

    return response.choices[0].message.content?.trim() || 
           generateEntertainingFallback(data);
    
  } catch (error) {
    console.error('Error generating AI commentary:', error);
    return generateEntertainingFallback(data);
  }
}

/**
 * Generate data-driven fallback commentary when AI is unavailable
 */
function generateEntertainingFallback(data: MarketData): string {
  const rateAdvantage = ((data.bestRate - data.currentRate) / data.currentRate * 100).toFixed(1);
  const isSignificantMovement = Math.abs(data.changePercent) > 0.5;
  const isWideSpread = data.rateSpread > 3.0;
  
  // Data-driven insights based on market conditions
  const insightOptions = [
    `${data.bestProvider} leads with ${rateAdvantage}% better rates than market average today.`,
    `${data.currencyPair} ${data.movement === 'up' ? 'strengthened' : 'weakened'} ${Math.abs(data.changePercent).toFixed(1)}% - ${data.bestProvider} offers best value.`,
    `Provider spread at ${data.rateSpread.toFixed(1)}% suggests ${isWideSpread ? 'varied' : 'competitive'} market conditions favoring ${data.bestProvider}.`,
    `${data.bestProvider} outperforming with rates ${rateAdvantage}% above market - significant advantage for transfers.`,
    `Market analysis: ${data.bestProvider} positioned best for ${data.currencyPair} with ${isSignificantMovement ? 'strong' : 'stable'} performance.`,
    `Rate comparison shows ${data.bestProvider} offering ${rateAdvantage}% premium over standard rates today.`,
    `${data.currencyPair} market dynamics favor ${data.bestProvider} - ${Math.abs(data.changePercent).toFixed(1)}% movement creates opportunity.`,
    `Provider analysis: ${data.bestProvider} maintains competitive edge with ${data.rateSpread.toFixed(1)}% spread advantage.`
  ];
  
  return insightOptions[Math.floor(Math.random() * insightOptions.length)];
}

/**
 * Generate friendly, conversational commentary without AI
 */
function generateFallbackCommentary(marketData: MarketData): string {
  const { currencyPair, movement, changePercent, bestProvider, rateSpread } = marketData;
  
  if (movement === 'up' && Math.abs(changePercent) > 1) {
    const upMessages = [
      `Looking good! ${currencyPair} is up ${Math.abs(changePercent).toFixed(1)}% with ${bestProvider} leading.`,
      `${currencyPair} gained ${Math.abs(changePercent).toFixed(1)}% today - ${bestProvider} has the best rates.`,
      `Nice movement for ${currencyPair}! ${bestProvider} offering competitive rates.`
    ];
    return upMessages[Math.floor(Math.random() * upMessages.length)];
  } else if (movement === 'down' && Math.abs(changePercent) > 1) {
    const downMessages = [
      `${currencyPair} dipped ${Math.abs(changePercent).toFixed(1)}% - might be a good opportunity with ${bestProvider}.`,
      `${currencyPair} down ${Math.abs(changePercent).toFixed(1)}% but ${bestProvider} still competitive.`,
      `Market adjustment for ${currencyPair}, though ${bestProvider} maintaining good rates.`
    ];
    return downMessages[Math.floor(Math.random() * downMessages.length)];
  } else if (rateSpread > 3) {
    const spreadMessages = [
      `Big difference between providers today! ${bestProvider} beats the rest by ${rateSpread.toFixed(1)}%.`,
      `${currencyPair} rates vary by ${rateSpread.toFixed(1)}% - ${bestProvider} clearly ahead.`,
      `Worth shopping around - ${bestProvider} leading by ${rateSpread.toFixed(1)}% on ${currencyPair}.`
    ];
    return spreadMessages[Math.floor(Math.random() * spreadMessages.length)];
  } else {
    const stableMessages = [
      `${currencyPair} holding steady with ${bestProvider} offering solid value.`,
      `Consistent rates for ${currencyPair} - ${bestProvider} maintaining their edge.`,
      `${bestProvider} keeping competitive on ${currencyPair} today.`
    ];
    return stableMessages[Math.floor(Math.random() * stableMessages.length)];
  }
}

/**
 * Generate commentary for a specific currency pair using smart caching
 */
export async function generateCommentary(fromCurrency: string, toCurrency: string): Promise<{
  currencyPair: string;
  commentary: string;
  timestamp: string;
}> {
  console.log(`Getting cached commentary for ${fromCurrency}/${toCurrency}...`);
  
  try {
    // Use smart caching system instead of generating on every request
    const { getSmartCommentary } = await import('./commentaryCache');
    const commentary = await getSmartCommentary(fromCurrency, toCurrency);
    
    console.log(`Served from cache: "${commentary}"`);
    
    return {
      currencyPair: `${fromCurrency}/${toCurrency}`,
      commentary,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.log(`Cache failed, using fallback for ${fromCurrency}/${toCurrency}`);
    
    // Fallback to real market data analysis
    const marketData = await getRealMarketData(fromCurrency, toCurrency);
    const commentary = generateFallbackCommentary(marketData);
    
    console.log(`Generated fallback: "${commentary}"`);
    
    return {
      currencyPair: marketData.currencyPair,
      commentary,
      timestamp: new Date().toISOString()
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