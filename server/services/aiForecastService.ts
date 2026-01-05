/**
 * AI-Powered Forecast Service
 * Uses OpenAI GPT to analyze historical rate data and generate intelligent predictions
 * No hardcoded formulas - AI learns patterns from real market data
 */

import OpenAI from 'openai';
import { db } from "../db";
import { rateTrends, exchangeRates, providers } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AIForecastResult {
  sevenDay: {
    predictedRate: number;
    changePercent: number;
    confidence: number;
    direction: 'up' | 'down' | 'stable';
  };
  thirtyDay: {
    predictedRate: number;
    changePercent: number;
    confidence: number;
    direction: 'up' | 'down' | 'stable';
  };
  reasoning: string;
  keyPatterns: string[];
  riskFactors: string[];
}

interface HistoricalDataPoint {
  date: string;
  rate: number;
  dayOfWeek: string;
}

const forecastCache = new Map<string, { result: AIForecastResult; timestamp: number }>();
const CACHE_DURATION = 20 * 60 * 60 * 1000; // 20 hours - extended cache to reduce API costs

export class AIForecastService {
  
  async getForecast(
    fromCurrency: string, 
    toCurrency: string, 
    currentBestProviderRate: number
  ): Promise<AIForecastResult> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = forecastCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`[AI Forecast] Using cached prediction for ${cacheKey}`);
      return this.scaleToProviderRate(cached.result, currentBestProviderRate);
    }
    
    try {
      const result = await this.generateAIForecast(fromCurrency, toCurrency, currentBestProviderRate);
      forecastCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('[AI Forecast] Error generating forecast:', error);
      return this.getFallbackForecast(currentBestProviderRate);
    }
  }
  
  private async generateAIForecast(
    fromCurrency: string, 
    toCurrency: string,
    currentBestProviderRate: number
  ): Promise<AIForecastResult> {
    // Use 2 years of data to capture seasonal trends and patterns
    const historicalData = await this.getHistoricalData(fromCurrency, toCurrency, 730);
    
    if (historicalData.length < 30) {
      console.log('[AI Forecast] Insufficient data, using fallback');
      return this.getFallbackForecast(currentBestProviderRate);
    }
    
    console.log(`[AI Forecast] Analyzing ${historicalData.length} days of historical data for ${fromCurrency}/${toCurrency}`);
    
    const dataForAI = this.prepareDataForAI(historicalData);
    const currentBaseRate = historicalData[historicalData.length - 1].rate;
    
    const prompt = this.buildPrompt(fromCurrency, toCurrency, dataForAI, currentBaseRate, currentBestProviderRate);
    
    console.log(`[AI Forecast] Requesting OpenAI prediction for ${fromCurrency}/${toCurrency}...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert financial analyst specialising in foreign exchange markets. 
Analyse historical exchange rate data and provide predictions based on patterns you identify.
You must respond ONLY with valid JSON matching the exact schema provided.
Base your analysis on the actual data patterns - look for trends, cycles, volatility, and seasonal effects.
Be conservative with confidence levels - currency markets are inherently unpredictable.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    const aiResponse = response.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }
    
    console.log(`[AI Forecast] Received prediction for ${fromCurrency}/${toCurrency}`);
    
    const parsed = JSON.parse(aiResponse);
    return this.validateAndTransformResponse(parsed, currentBestProviderRate, currentBaseRate);
  }
  
  private buildPrompt(
    fromCurrency: string, 
    toCurrency: string, 
    data: HistoricalDataPoint[],
    currentBaseRate: number,
    currentBestProviderRate: number
  ): string {
    // Use all available data for comprehensive analysis
    const totalDays = data.length;
    const recentData = data.slice(-60); // Last 60 days for recent trends
    const weekData = data.slice(-7);
    const monthData = data.slice(-30);
    const quarterData = data.slice(-90);
    const yearData = data.slice(-365);
    
    // Calculate multiple timeframe averages
    const weekAvg = weekData.length > 0 ? weekData.reduce((sum, d) => sum + d.rate, 0) / weekData.length : currentBaseRate;
    const monthAvg = monthData.length > 0 ? monthData.reduce((sum, d) => sum + d.rate, 0) / monthData.length : currentBaseRate;
    const quarterAvg = quarterData.length > 0 ? quarterData.reduce((sum, d) => sum + d.rate, 0) / quarterData.length : currentBaseRate;
    const yearAvg = yearData.length > 0 ? yearData.reduce((sum, d) => sum + d.rate, 0) / yearData.length : currentBaseRate;
    
    // Calculate highs and lows across timeframes
    const monthHigh = monthData.length > 0 ? Math.max(...monthData.map(d => d.rate)) : currentBaseRate;
    const monthLow = monthData.length > 0 ? Math.min(...monthData.map(d => d.rate)) : currentBaseRate;
    const yearHigh = yearData.length > 0 ? Math.max(...yearData.map(d => d.rate)) : currentBaseRate;
    const yearLow = yearData.length > 0 ? Math.min(...yearData.map(d => d.rate)) : currentBaseRate;
    
    const monthVolatility = monthAvg > 0 ? ((monthHigh - monthLow) / monthAvg * 100).toFixed(2) : '0';
    const yearVolatility = yearAvg > 0 ? ((yearHigh - yearLow) / yearAvg * 100).toFixed(2) : '0';
    
    // Current position analysis
    const positionVsMonthAvg = ((currentBaseRate - monthAvg) / monthAvg * 100).toFixed(2);
    const positionVsYearAvg = ((currentBaseRate - yearAvg) / yearAvg * 100).toFixed(2);
    
    // Seasonal analysis - group by month
    const monthlyAverages: { [key: string]: number[] } = {};
    data.forEach(d => {
      const month = d.date.substring(5, 7); // Extract MM from YYYY-MM-DD
      if (!monthlyAverages[month]) monthlyAverages[month] = [];
      monthlyAverages[month].push(d.rate);
    });
    
    const seasonalSummary = Object.entries(monthlyAverages)
      .map(([month, rates]) => {
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        return `Month ${month}: avg ${avg.toFixed(4)} (${rates.length} samples)`;
      })
      .join('\n');
    
    // Recent trend direction
    const trendStart = recentData[0]?.rate || currentBaseRate;
    const trendChange = ((currentBaseRate - trendStart) / trendStart * 100).toFixed(2);
    
    // Sample of recent data (last 14 days)
    const recentSample = data.slice(-14).map(d => 
      `${d.date} (${d.dayOfWeek}): ${d.rate.toFixed(4)}`
    ).join('\n');
    
    return `Analyse this ${fromCurrency}/${toCurrency} exchange rate with ${totalDays} days of historical data to predict future movements.

RECENT DATA (last 14 days):
${recentSample}

MULTI-TIMEFRAME STATISTICS:
- Current rate: ${currentBaseRate.toFixed(4)}
- 7-day average: ${weekAvg.toFixed(4)}
- 30-day average: ${monthAvg.toFixed(4)} (current is ${positionVsMonthAvg}% vs this)
- 90-day average: ${quarterAvg.toFixed(4)}
- 365-day average: ${yearAvg.toFixed(4)} (current is ${positionVsYearAvg}% vs this)

RANGE ANALYSIS:
- 30-day range: ${monthLow.toFixed(4)} to ${monthHigh.toFixed(4)} (${monthVolatility}% volatility)
- 365-day range: ${yearLow.toFixed(4)} to ${yearHigh.toFixed(4)} (${yearVolatility}% volatility)
- 60-day trend: ${trendChange}% change

SEASONAL PATTERNS (monthly averages):
${seasonalSummary}

CURRENT MARKET CONTEXT:
- Best provider rate: ${currentBestProviderRate.toFixed(2)} ${toCurrency}
- Provider premium: ${((currentBestProviderRate / currentBaseRate - 1) * 100).toFixed(2)}%

ANALYSIS REQUIRED:
1. Identify the primary trend direction using multi-timeframe analysis
2. Detect any seasonal patterns from monthly data
3. Assess current rate position relative to historical averages
4. Consider mean reversion tendencies and momentum
5. Factor in volatility for confidence assessment

Be realistic but also decisive - avoid defaulting to 0% change unless data truly shows stability.
If the rate is significantly above/below yearly average, consider mean reversion.
If there's a clear trend, project it forward with appropriate confidence.

Respond with this exact JSON structure:
{
  "sevenDay": {
    "predictedChangePercent": <number between -5 and 5, be specific not 0>,
    "confidence": <number between 0.4 and 0.85>,
    "direction": "<up|down|stable>"
  },
  "thirtyDay": {
    "predictedChangePercent": <number between -10 and 10, be specific>,
    "confidence": <number between 0.3 and 0.7>,
    "direction": "<up|down|stable>"
  },
  "reasoning": "<2-3 specific sentences explaining the key factors - mention actual numbers from the data>",
  "keyPatterns": ["<specific pattern from data>", "<another pattern>"],
  "riskFactors": ["<specific risk>", "<another risk>"]
}`;
  }
  
  private validateAndTransformResponse(
    parsed: any, 
    currentBestProviderRate: number,
    currentBaseRate: number
  ): AIForecastResult {
    const sevenDayChange = Math.max(-5, Math.min(5, parsed.sevenDay?.predictedChangePercent || 0));
    const thirtyDayChange = Math.max(-10, Math.min(10, parsed.thirtyDay?.predictedChangePercent || 0));
    
    const sevenDayConfidence = Math.max(0.3, Math.min(0.85, parsed.sevenDay?.confidence || 0.5));
    const thirtyDayConfidence = Math.max(0.2, Math.min(0.7, parsed.thirtyDay?.confidence || 0.4));
    
    const predicted7Day = currentBestProviderRate * (1 + sevenDayChange / 100);
    const predicted30Day = currentBestProviderRate * (1 + thirtyDayChange / 100);
    
    const getDirection = (change: number): 'up' | 'down' | 'stable' => {
      if (Math.abs(change) < 0.3) return 'stable';
      return change > 0 ? 'up' : 'down';
    };
    
    return {
      sevenDay: {
        predictedRate: predicted7Day,
        changePercent: sevenDayChange,
        confidence: sevenDayConfidence,
        direction: getDirection(sevenDayChange)
      },
      thirtyDay: {
        predictedRate: predicted30Day,
        changePercent: thirtyDayChange,
        confidence: thirtyDayConfidence,
        direction: getDirection(thirtyDayChange)
      },
      reasoning: parsed.reasoning || 'Based on historical pattern analysis.',
      keyPatterns: parsed.keyPatterns || [],
      riskFactors: parsed.riskFactors || []
    };
  }
  
  private scaleToProviderRate(cached: AIForecastResult, currentBestProviderRate: number): AIForecastResult {
    return {
      ...cached,
      sevenDay: {
        ...cached.sevenDay,
        predictedRate: currentBestProviderRate * (1 + cached.sevenDay.changePercent / 100)
      },
      thirtyDay: {
        ...cached.thirtyDay,
        predictedRate: currentBestProviderRate * (1 + cached.thirtyDay.changePercent / 100)
      }
    };
  }
  
  private async getHistoricalData(fromCurrency: string, toCurrency: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select()
      .from(rateTrends)
      .where(
        and(
          eq(rateTrends.from_currency, fromCurrency),
          eq(rateTrends.to_currency, toCurrency),
          gte(rateTrends.date, startDate.toISOString().split('T')[0])
        )
      )
      .orderBy(rateTrends.date);
  }
  
  private prepareDataForAI(historicalData: any[]): HistoricalDataPoint[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return historicalData.map(d => {
      const date = new Date(d.date);
      return {
        date: d.date,
        rate: d.rate,
        dayOfWeek: dayNames[date.getDay()]
      };
    });
  }
  
  private getFallbackForecast(currentRate: number): AIForecastResult {
    return {
      sevenDay: {
        predictedRate: currentRate,
        changePercent: 0,
        confidence: 0.3,
        direction: 'stable'
      },
      thirtyDay: {
        predictedRate: currentRate,
        changePercent: 0,
        confidence: 0.2,
        direction: 'stable'
      },
      reasoning: 'Insufficient historical data for AI analysis. Showing current rates.',
      keyPatterns: [],
      riskFactors: ['Limited data availability']
    };
  }
}

export const aiForecastService = new AIForecastService();
