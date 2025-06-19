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
 * Generate AI commentary for market data
 */
async function generateMarketCommentary(data: MarketData): Promise<string> {
  try {
    const prompt = `Generate an engaging 1-2 sentence daily commentary about the ${data.currencyPair} exchange rate market.

Market Data:
- Current rate: ${data.currentRate.toFixed(2)}
- Movement: ${data.movement} by ${Math.abs(data.changePercent).toFixed(2)}%
- Best provider: ${data.bestProvider} at ${data.bestRate.toFixed(2)}
- Rate spread: ${data.rateSpread.toFixed(1)}%

Style: Conversational, helpful, maximum 30 words. Focus on what matters to money senders.

Examples:
"The pound holds steady against the naira while Lemfi leads with competitive rates."
"Sterling gained 0.8% overnight - excellent timing for UK-Nigeria transfers."
"Provider competition is fierce today with just 2% separating best and worst rates."

Generate ONE brief commentary:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a financial expert creating brief, engaging commentary about exchange rates. Be conversational and focus on practical insights for money transfers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 80,
      temperature: 0.7
    });

    return response.choices[0].message.content?.trim() || 
           `${data.bestProvider} offers competitive ${data.currencyPair} rates today with steady market conditions.`;
    
  } catch (error) {
    console.error('Error generating AI commentary:', error);
    
    // Intelligent fallback based on market data
    if (data.movement === 'up' && Math.abs(data.changePercent) > 0.5) {
      return `${data.currencyPair.split('/')[0]} strengthened ${Math.abs(data.changePercent).toFixed(1)}% today - good news for outbound transfers.`;
    } else if (data.movement === 'down' && Math.abs(data.changePercent) > 0.5) {
      return `${data.currencyPair.split('/')[0]} dipped ${Math.abs(data.changePercent).toFixed(1)}% today, making incoming transfers more valuable.`;
    } else if (data.rateSpread < 3) {
      return `Tight competition today with providers offering similar ${data.currencyPair} rates within ${data.rateSpread.toFixed(1)}%.`;
    } else {
      return `${data.bestProvider} leads today's ${data.currencyPair} rates with competitive pricing across the market.`;
    }
  }
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