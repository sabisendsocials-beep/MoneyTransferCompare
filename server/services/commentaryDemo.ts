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
    const prompt = `Generate hilarious, creative commentary about the ${data.currencyPair} exchange rate market. Be witty, use pop culture references, metaphors, and humor while being informative.

Market Data:
- Current rate: ${data.currentRate.toFixed(2)}
- Movement: ${data.movement} by ${Math.abs(data.changePercent).toFixed(2)}%
- Best provider: ${data.bestProvider} at ${data.bestRate.toFixed(2)}
- Rate spread: ${data.rateSpread.toFixed(1)}%

Style: Creative, funny, entertaining. Use humor, pop culture, gaming references, social media language, or unexpected comparisons. Make people laugh while learning about rates. Maximum 40 words.

Be creative and original! Examples of entertaining styles (don't copy directly):
- Gaming: "Sterling activated beast mode today!"
- Pop culture: "The pound said 'I am inevitable' and snapped rates higher"
- Social media: "Rate alert: This provider is giving main character energy"
- Unexpected: "Providers are more competitive than reality TV stars today"
- Mystery: "Plot twist nobody saw coming in today's rates"

Generate ONE wildly creative and entertaining commentary:`;

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
 * Generate creative and entertaining fallback commentary when AI is unavailable
 */
function generateEntertainingFallback(data: MarketData): string {
  const entertainingFallbacks = [
    // Gaming & Tech references
    [
      `${data.currencyPair.split('/')[0]} activated beast mode today! ${data.bestProvider} caught the power-up.`,
      `${data.bestProvider} just unlocked the legendary rate achievement for ${data.currencyPair}!`,
      `Rate update downloading... ${data.bestProvider} leads with premium bandwidth today.`,
      `${data.currencyPair.split('/')[0]} said "respawn with better stats" and jumped ${Math.abs(data.changePercent).toFixed(1)}%!`,
      `${data.bestProvider} is speedrunning the ${data.currencyPair} leaderboard today.`
    ],
    
    // Pop culture & Entertainment
    [
      `${data.currencyPair.split('/')[0]} pulled a Marvel plot twist - ${data.bestProvider} got the infinity stone rates!`,
      `Breaking: ${data.bestProvider} just dropped the hottest mixtape... of exchange rates.`,
      `${data.currencyPair.split('/')[0]} said "I am inevitable" and snapped rates ${data.movement === 'up' ? 'higher' : 'lower'}.`,
      `Netflix should make a documentary about today's ${data.currencyPair} drama starring ${data.bestProvider}.`,
      `${data.bestProvider} is serving main character energy in the ${data.currencyPair} universe today.`
    ],
    
    // Social Media & Gen Z references
    [
      `${data.currencyPair.split('/')[0]} said "periodt" and left no crumbs with that ${Math.abs(data.changePercent).toFixed(1)}% move.`,
      `${data.bestProvider} understood the assignment and delivered peak ${data.currencyPair} rates.`,
      `No cap, ${data.bestProvider} is absolutely slaying the ${data.currencyPair} game today!`,
      `${data.currencyPair.split('/')[0]} woke up and chose violence against boring rates.`,
      `Tell me ${data.bestProvider} is competitive without telling me... wait, they just did.`
    ],
    
    // Food & Lifestyle analogies
    [
      `${data.bestProvider} is cooking with gas today - ${data.currencyPair} rates looking chef's kiss!`,
      `${data.currencyPair.split('/')[0]} rates are more addictive than your favorite coffee shop today.`,
      `${data.bestProvider} just served a five-star ${data.currencyPair} experience with extra sauce.`,
      `Today's ${data.currencyPair} market is giving expensive taste energy, courtesy of ${data.bestProvider}.`,
      `${data.bestProvider} said "let them eat cake" and served premium ${data.currencyPair} rates.`
    ],
    
    // Competition & Sports metaphors
    [
      `${data.bestProvider} just scored a hat-trick in the ${data.currencyPair} championships!`,
      `It's more competitive than Black Friday out here - ${data.rateSpread.toFixed(1)}% separating the players.`,
      `${data.bestProvider} came through with the buzzer-beater rates for ${data.currencyPair} today.`,
      `Someone check if ${data.bestProvider} is using cheat codes - these ${data.currencyPair} rates are too good!`,
      `${data.currencyPair.split('/')[0]} just broke the internet with that performance.`
    ]
  ].flat();
  
  return entertainingFallbacks[Math.floor(Math.random() * entertainingFallbacks.length)] ||
         `${data.bestProvider} is absolutely crushing the ${data.currencyPair} game today!`;
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