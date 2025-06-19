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
    // Special handling for GBP/NGN with pidgin English
    const isGbpNgn = data.currencyPair === 'GBP/NGN';
    
    const prompt = isGbpNgn ? 
      `Generate engaging commentary about the GBP/NGN exchange rate market. Use natural conversation with some pidgin English touches to make it relatable and meaningful.

Market Data:
- Current rate: ${data.currentRate.toFixed(2)}
- Movement: ${data.movement} by ${Math.abs(data.changePercent).toFixed(2)}%
- Best provider: ${data.bestProvider} at ${data.bestRate.toFixed(2)}
- Rate spread: ${data.rateSpread.toFixed(1)}%

Style: Conversational and insightful. Use some pidgin English naturally (like "wey", "dey", "no be small", "abi"). Make it meaningful and engaging without boring jargon. Focus on what this means for people sending money home. Maximum 40 words.

Examples of natural tone:
- "Pound wey dey strong today, ${data.bestProvider} no come play"
- "This rate movement no be small thing for people wey dey send money"
- "See as providers dey compete - na good news for us"

Generate ONE natural, meaningful commentary with pidgin touches:` :
      
      `Generate engaging, conversational commentary about the ${data.currencyPair} exchange rate market. Use natural everyday language that's meaningful and insightful.

Market Data:
- Current rate: ${data.currentRate.toFixed(2)}
- Movement: ${data.movement} by ${Math.abs(data.changePercent).toFixed(2)}%
- Best provider: ${data.bestProvider} at ${data.bestRate.toFixed(2)}
- Rate spread: ${data.rateSpread.toFixed(1)}%

Style: Natural conversation, engaging and meaningful. Focus on what this means for real people. Avoid jargon and forced slang. Make it insightful and relatable. Maximum 40 words.

Examples of conversational tone:
- "Today's rates are looking good for anyone sending money"
- "Providers are really competing hard - that's great news"
- "This movement could mean better value for transfers"

Generate ONE natural, meaningful commentary:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: isGbpNgn ? 
            "You are a knowledgeable financial commentator who connects with Nigerian audiences. Use natural conversation with some pidgin English touches when appropriate. Focus on meaningful insights about exchange rates that help people make better money transfer decisions." :
            "You are a conversational financial commentator who makes exchange rates accessible and engaging. Use natural everyday language to provide meaningful insights without jargon or forced slang."
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
 * Generate natural, conversational fallback commentary when AI is unavailable
 */
function generateEntertainingFallback(data: MarketData): string {
  const isGbpNgn = data.currencyPair === 'GBP/NGN';
  
  if (isGbpNgn) {
    // Pidgin English for GBP/NGN
    const pidginOptions = [
      `Pound wey dey strong today, ${data.bestProvider} no come play with rates!`,
      `See as ${data.bestProvider} dey compete - na good news for people wey dey send money.`,
      `This ${Math.abs(data.changePercent).toFixed(1)}% movement no be small thing for transfers.`,
      `${data.bestProvider} show say them serious about giving better rates today.`,
      `People wey dey send money home go happy with this ${data.bestProvider} rate.`
    ];
    return pidginOptions[Math.floor(Math.random() * pidginOptions.length)];
  }
  
  // Natural conversation for other pairs
  const conversationalOptions = [
    `${data.bestProvider} is really stepping up their game today with competitive rates.`,
    `Good news for transfers - ${data.bestProvider} is offering solid value on ${data.currencyPair}.`,
    `This ${Math.abs(data.changePercent).toFixed(1)}% movement could mean better deals for money transfers.`,
    `Rate competition is heating up, and ${data.bestProvider} is leading the charge.`,
    `Today's ${data.currencyPair} rates are looking promising for anyone planning transfers.`,
    `The competition between providers is really benefiting customers right now.`
  ];
  return conversationalOptions[Math.floor(Math.random() * conversationalOptions.length)];
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