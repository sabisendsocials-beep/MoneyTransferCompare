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
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

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
    const historicalData = await this.getHistoricalData(fromCurrency, toCurrency, 60);
    
    if (historicalData.length < 14) {
      console.log('[AI Forecast] Insufficient data, using fallback');
      return this.getFallbackForecast(currentBestProviderRate);
    }
    
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
    const recentData = data.slice(-30);
    const weekAgo = data.slice(-7);
    const monthAgo = data.slice(-30, -23);
    
    const weekAvg = weekAgo.reduce((sum, d) => sum + d.rate, 0) / weekAgo.length;
    const monthAvg = recentData.reduce((sum, d) => sum + d.rate, 0) / recentData.length;
    
    const highRate = Math.max(...recentData.map(d => d.rate));
    const lowRate = Math.min(...recentData.map(d => d.rate));
    const volatility = ((highRate - lowRate) / monthAvg * 100).toFixed(2);
    
    const dataTable = recentData.map(d => 
      `${d.date} (${d.dayOfWeek}): ${d.rate.toFixed(4)}`
    ).join('\n');
    
    return `Analyse this ${fromCurrency}/${toCurrency} exchange rate history and predict future rates.

HISTORICAL DATA (last 30 days):
${dataTable}

KEY STATISTICS:
- Current base rate: ${currentBaseRate.toFixed(4)}
- Current best provider rate: ${currentBestProviderRate.toFixed(2)}
- Provider premium: ${((currentBestProviderRate / currentBaseRate - 1) * 100).toFixed(2)}%
- 7-day average: ${weekAvg.toFixed(4)}
- 30-day average: ${monthAvg.toFixed(4)}
- 30-day high: ${highRate.toFixed(4)}
- 30-day low: ${lowRate.toFixed(4)}
- Volatility range: ${volatility}%

ANALYSIS REQUIRED:
1. Identify any trends (upward, downward, or sideways movement)
2. Look for weekly patterns (certain days typically better/worse)
3. Assess momentum (is the trend accelerating, decelerating, or reversing?)
4. Consider volatility and uncertainty

Provide predictions as percentage changes from the current base rate.
The frontend will scale these to provider rates.

Respond with this exact JSON structure:
{
  "sevenDay": {
    "predictedChangePercent": <number between -5 and 5>,
    "confidence": <number between 0.3 and 0.85>,
    "direction": "<up|down|stable>"
  },
  "thirtyDay": {
    "predictedChangePercent": <number between -10 and 10>,
    "confidence": <number between 0.2 and 0.7>,
    "direction": "<up|down|stable>"
  },
  "reasoning": "<2-3 sentences explaining the key factors driving your prediction>",
  "keyPatterns": ["<pattern 1>", "<pattern 2>"],
  "riskFactors": ["<risk 1>", "<risk 2>"]
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
