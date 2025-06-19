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
 * Generate realistic market data for demonstration
 */
function getMarketData(fromCurrency: string, toCurrency: string): MarketData {
  // Base rates for major pairs
  const baseRates: Record<string, number> = {
    'GBP/NGN': 2067,
    'EUR/NGN': 1768,
    'USD/NGN': 1576,
    'GBP/GHS': 13.73,
    'EUR/GHS': 11.74,
    'USD/GHS': 10.22,
    'GBP/KES': 173.6,
    'EUR/KES': 148.3,
    'USD/KES': 129.2,
    'GBP/INR': 116.4,
    'EUR/INR': 99.56,
    'USD/INR': 86.74,
    'GBP/PKR': 381,
    'EUR/PKR': 325,
    'USD/PKR': 283.6
  };

  const pairKey = `${fromCurrency}/${toCurrency}`;
  const baseRate = baseRates[pairKey] || 2000;
  
  // Add small random variation for realistic movement
  const variation = (Math.random() - 0.5) * 2; // -1% to +1%
  const currentRate = baseRate * (1 + variation / 100);
  const changePercent = variation;
  
  let movement: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) > 0.3) {
    movement = changePercent > 0 ? 'up' : 'down';
  }
  
  // Provider competition data
  const providers = ['Lemfi', 'Remitly', 'Wise', 'WorldRemit', 'MoneyGram'];
  const bestProvider = providers[Math.floor(Math.random() * providers.length)];
  const bestRate = currentRate * 1.02; // Best provider offers 2% better rate
  const rateSpread = 2.5 + Math.random() * 2; // 2.5-4.5% spread
  
  return {
    currencyPair: pairKey,
    currentRate,
    movement,
    changePercent,
    bestProvider,
    bestRate,
    rateSpread
  };
}

/**
 * Generate AI commentary for market data with entertaining tone
 */
async function generateMarketCommentary(data: MarketData): Promise<string> {
  try {
    const prompt = `Generate a witty, entertaining commentary about the ${data.currencyPair} exchange rate market that will make people smile while being informative.

Market Data:
- Current rate: ${data.currentRate.toFixed(2)}
- Movement: ${data.movement} by ${Math.abs(data.changePercent).toFixed(2)}%
- Best provider: ${data.bestProvider} at ${data.bestRate.toFixed(2)}
- Rate spread: ${data.rateSpread.toFixed(1)}%

Style: Fun, witty, entertaining but still informative. Use humor, metaphors, pop culture references, or playful language. Maximum 35 words. Make it memorable and shareable.

Examples of entertaining financial commentary:
"The pound is flexing harder than a gym bro today - ${data.bestProvider} caught the wave!"
"Plot twist: ${data.currencyPair} rates are tighter than airport security - providers battling for the crown!"
"Sterling just pulled a superhero move, gaining ${Math.abs(data.changePercent).toFixed(1)}% overnight. Your wallet will thank you!"
"Rates are more stable than a yoga instructor today, but ${data.bestProvider} still brings the zen."
"Provider drama alert! The rate spread is ${data.rateSpread.toFixed(1)}% - someone's feeling generous!"

Generate ONE entertaining commentary that people will actually want to read:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a witty financial commentator who makes exchange rates fun and entertaining. Use humor, metaphors, and engaging language while providing useful insights. Think of yourself as the comedy writer for financial news."
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
 * Generate entertaining fallback commentary when AI is unavailable
 */
function generateEntertainingFallback(data: MarketData): string {
  const entertainingFallbacks = [
    // Rate movement scenarios
    ...(data.movement === 'up' && Math.abs(data.changePercent) > 0.5 ? [
      `${data.currencyPair.split('/')[0]} just had a glow-up! Up ${Math.abs(data.changePercent).toFixed(1)}% and looking fabulous 💅`,
      `Breaking: ${data.currencyPair.split('/')[0]} woke up and chose violence - gained ${Math.abs(data.changePercent).toFixed(1)}% overnight!`,
      `${data.currencyPair.split('/')[0]} is having its main character moment today! ${data.bestProvider} caught the vibe 🚀`,
      `Plot twist: ${data.currencyPair.split('/')[0]} said "not today, gravity" and jumped ${Math.abs(data.changePercent).toFixed(1)}%!`
    ] : []),
    
    // Rate decline scenarios  
    ...(data.movement === 'down' && Math.abs(data.changePercent) > 0.5 ? [
      `${data.currencyPair.split('/')[0]} took a little nap today (down ${Math.abs(data.changePercent).toFixed(1)}%) - perfect for incoming transfers!`,
      `${data.currencyPair.split('/')[0]} is having a humble day, down ${Math.abs(data.changePercent).toFixed(1)}%. Someone's getting lucky! 🍀`,
      `Currency plot twist: ${data.currencyPair.split('/')[0]} decided to be generous today. Receivers are celebrating!`,
      `${data.currencyPair.split('/')[0]} pulled a "surprise discount" move - down ${Math.abs(data.changePercent).toFixed(1)}% for the people!`
    ] : []),
    
    // Tight competition scenarios
    ...(data.rateSpread < 3 ? [
      `Providers are fighting harder than siblings over the last slice of pizza - just ${data.rateSpread.toFixed(1)}% separating them!`,
      `It's a rate battle royale! Providers within ${data.rateSpread.toFixed(1)}% of each other. Someone call a referee! 🥊`,
      `The competition is tighter than skinny jeans today - ${data.rateSpread.toFixed(1)}% spread has providers sweating!`,
      `Provider drama level: Maximum! Everyone's rates are practically identical at ${data.rateSpread.toFixed(1)}% apart 🎭`
    ] : []),
    
    // Provider leadership scenarios
    [
      `${data.bestProvider} is serving main character energy today with the best ${data.currencyPair} rates! 👑`,
      `${data.bestProvider} said "hold my coffee" and dropped the best rates today. Respect! ☕`,
      `${data.bestProvider} just pulled a boss move with top ${data.currencyPair} rates. Someone's showing off! 💪`,
      `Plot armor activated: ${data.bestProvider} leads the ${data.currencyPair} leaderboard today! 🏆`,
      `${data.bestProvider} woke up and chose excellence - best ${data.currencyPair} rates in the game! 🔥`
    ]
  ].flat();
  
  return entertainingFallbacks[Math.floor(Math.random() * entertainingFallbacks.length)] ||
         `${data.bestProvider} is keeping things interesting with solid ${data.currencyPair} rates today! 🎉`;
}

/**
 * Generate commentary for a specific currency pair
 */
export async function generateCommentary(fromCurrency: string, toCurrency: string): Promise<{
  currencyPair: string;
  commentary: string;
  timestamp: string;
}> {
  console.log(`Generating commentary for ${fromCurrency}/${toCurrency}...`);
  
  const marketData = getMarketData(fromCurrency, toCurrency);
  const commentary = await generateMarketCommentary(marketData);
  
  console.log(`Generated: "${commentary}"`);
  
  return {
    currencyPair: marketData.currencyPair,
    commentary,
    timestamp: new Date().toISOString()
  };
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