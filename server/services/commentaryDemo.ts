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
    const prompt = `Generate witty, culturally-aware commentary about the ${data.currencyPair} exchange rate market with regional flavor and playful observations about provider behavior.

Market Data:
- Current rate: ${data.currentRate.toFixed(2)}
- Movement: ${data.movement} by ${Math.abs(data.changePercent).toFixed(2)}%
- Best provider: ${data.bestProvider} at ${data.bestRate.toFixed(2)}
- Rate spread: ${data.rateSpread.toFixed(1)}%

Style: Playful, observational, with cultural references and provider personality observations. Use casual language like someone watching the market drama unfold. Maximum 40 words.

Examples of the tone we want:
"LemFi's acting like it owns the GBP-NGN corridor today. Someone's feeling rich."
"WorldRemit's just chilling today. Low fees, average rates. Not trying to impress anyone."
"Like a shy genius — TransferGo isn't saying much but quietly offering the best rate today."
"We spy a hidden gem today. Not a usual contender. Wanna guess who?"
"Think you know who topped the charts today? You might be surprised…"
"Very unlikely provider in the top today"
"Wow LemFi is feeling bullish on the rate today with a massive spread"

Generate ONE commentary with similar observational, cultural tone:`;

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
 * Generate culturally-aware fallback commentary when AI is unavailable
 */
function generateEntertainingFallback(data: MarketData): string {
  const culturalFallbacks = [
    // Provider personality observations
    [
      `${data.bestProvider}'s acting like it owns the ${data.currencyPair} corridor today. Someone's feeling confident.`,
      `${data.bestProvider}'s just chilling today. Decent rates, no drama. Not trying to impress anyone.`,
      `Like a shy genius — ${data.bestProvider} isn't saying much but quietly offering the best rate today.`,
      `${data.bestProvider}'s feeling bullish on ${data.currencyPair} today with that spread.`,
      `${data.bestProvider} decided to move up the ranks today. Plot twist incoming.`
    ],
    
    // Rate movement with cultural flavor
    ...(data.movement === 'up' && Math.abs(data.changePercent) > 0.5 ? [
      `${data.currencyPair.split('/')[0]} woke up and chose greatness today. Up ${Math.abs(data.changePercent).toFixed(1)}% like a champion.`,
      `Someone told ${data.currencyPair.split('/')[0]} it was payday - jumped ${Math.abs(data.changePercent).toFixed(1)}% overnight.`,
      `${data.currencyPair.split('/')[0]} said "not today" to gravity. ${data.bestProvider} caught the wave.`,
      `Breaking: ${data.currencyPair.split('/')[0]} is having its moment. ${Math.abs(data.changePercent).toFixed(1)}% gain and counting.`
    ] : []),
    
    // Rate decline with regional humor
    ...(data.movement === 'down' && Math.abs(data.changePercent) > 0.5 ? [
      `${data.currencyPair.split('/')[0]} took a humble pill today. Down ${Math.abs(data.changePercent).toFixed(1)}% - receivers are smiling.`,
      `${data.currencyPair.split('/')[0]} decided to be generous. Down ${Math.abs(data.changePercent).toFixed(1)}% for the people.`,
      `Plot twist: ${data.currencyPair.split('/')[0]} pulled a surprise discount move today.`,
      `${data.currencyPair.split('/')[0]}'s having a quiet day. Perfect timing for incoming transfers.`
    ] : []),
    
    // Competition observations
    ...(data.rateSpread < 3 ? [
      `It's getting crowded at the top today. Many providers offering their best ${data.currencyPair} rates.`,
      `The spread looks almost too good today. Worth a double check on that ${data.rateSpread.toFixed(1)}%.`,
      `Everyone's bringing their A-game today. ${data.rateSpread.toFixed(1)}% spread between best and worst.`,
      `Provider competition is real today. Just ${data.rateSpread.toFixed(1)}% separating the pack.`
    ] : []),
    
    // Mystery and intrigue
    [
      `We spy a hidden gem today. Not the usual contender for ${data.currencyPair}.`,
      `Think you know who topped the charts today? You might be surprised.`,
      `Very unlikely provider in the top spot today. Guess who?`,
      `Someone unexpected is making moves in the ${data.currencyPair} space today.`,
      `Plot twist alert: The usual suspects aren't leading today.`
    ]
  ].flat();
  
  return culturalFallbacks[Math.floor(Math.random() * culturalFallbacks.length)] ||
         `${data.bestProvider} is keeping things interesting with solid ${data.currencyPair} rates today.`;
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