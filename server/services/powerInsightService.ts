/**
 * Unified Power Insight Service
 * Consolidates rate prediction, timing analysis, and alert suggestions into one comprehensive feature
 * Uses base rate trends + provider rate trends to provide 7-day and 30-day forecasts
 */

import { db } from "../db";
import { rateTrends, exchangeRates, providers } from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { storage } from "../storage";

export interface PowerInsightResponse {
  currencyPair: string;
  timestamp: string;
  
  currentMarket: {
    baseRate: number;
    bestProviderRate: number;
    bestProvider: string;
    providerSpread: number;
    providerCount: number;
  };
  
  anomalies: {
    isBestIn30Days: boolean;
    isWorstIn30Days: boolean;
    isHighSpread: boolean;
    insight: string;
  };
  
  forecast: {
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
  };
  
  recommendation: {
    action: 'send_now' | 'wait' | 'set_alert';
    reasoning: string;
    urgency: 'high' | 'medium' | 'low';
    potentialImpact: string;
  };
  
  alertSuggestion: {
    targetRate: number;
    percentageAboveCurrent: number;
    reasoning: string;
  };
}

class PowerInsightService {
  
  async getPowerInsight(fromCurrency: string, toCurrency: string, amount: number = 500): Promise<PowerInsightResponse> {
    const currencyPair = `${fromCurrency}/${toCurrency}`;
    
    const [historicalData, currentRates, rateStats] = await Promise.all([
      this.getHistoricalData(fromCurrency, toCurrency, 60),
      this.getCurrentProviderRates(fromCurrency, toCurrency),
      storage.getRateStats(fromCurrency, toCurrency)
    ]);
    
    const currentMarket = this.analyzeCurrentMarket(currentRates, rateStats);
    const anomalies = await this.detectAnomalies(fromCurrency, toCurrency, currentMarket, historicalData);
    const forecast = this.generateForecast(historicalData, currentMarket);
    const recommendation = this.generateRecommendation(currentMarket, anomalies, forecast, amount);
    const alertSuggestion = this.generateAlertSuggestion(currentMarket, forecast, rateStats);
    
    return {
      currencyPair,
      timestamp: new Date().toISOString(),
      currentMarket,
      anomalies,
      forecast,
      recommendation,
      alertSuggestion
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
  
  private async getCurrentProviderRates(fromCurrency: string, toCurrency: string) {
    const rates = await db
      .select({
        rate: exchangeRates.rate,
        providerId: exchangeRates.provider_id,
        providerName: providers.name,
        verified: exchangeRates.verified
      })
      .from(exchangeRates)
      .leftJoin(providers, eq(exchangeRates.provider_id, providers.id))
      .where(
        and(
          eq(exchangeRates.from_currency, fromCurrency),
          eq(exchangeRates.to_currency, toCurrency)
        )
      );
    
    return rates.filter(r => r.rate > 0);
  }
  
  private analyzeCurrentMarket(currentRates: any[], rateStats: any) {
    if (!currentRates.length) {
      return {
        baseRate: rateStats.currentRate || 0,
        bestProviderRate: rateStats.currentRate || 0,
        bestProvider: 'Unknown',
        providerSpread: 0,
        providerCount: 0
      };
    }
    
    const sortedRates = [...currentRates].sort((a, b) => b.rate - a.rate);
    const bestRate = sortedRates[0];
    const worstRate = sortedRates[sortedRates.length - 1];
    const spread = worstRate.rate > 0 ? ((bestRate.rate - worstRate.rate) / worstRate.rate) * 100 : 0;
    
    return {
      baseRate: rateStats.currentRate || bestRate.rate,
      bestProviderRate: bestRate.rate,
      bestProvider: bestRate.providerName || 'Unknown',
      providerSpread: spread,
      providerCount: currentRates.length
    };
  }
  
  private async detectAnomalies(
    fromCurrency: string, 
    toCurrency: string, 
    currentMarket: any, 
    historicalData: any[]
  ) {
    if (historicalData.length < 7) {
      return {
        isBestIn30Days: false,
        isWorstIn30Days: false,
        isHighSpread: false,
        insight: 'Insufficient historical data for anomaly detection.'
      };
    }
    
    const rates = historicalData.map(d => d.rate);
    const maxRate30Days = Math.max(...rates);
    const minRate30Days = Math.min(...rates);
    const currentRate = currentMarket.baseRate;
    
    const isBestIn30Days = currentRate >= maxRate30Days * 0.998;
    const isWorstIn30Days = currentRate <= minRate30Days * 1.002;
    const isHighSpread = currentMarket.providerSpread > 3.0;
    const avgSpread = 2.0;
    
    let insight = '';
    
    if (isBestIn30Days) {
      insight = `This is the best rate in the last 30 days! Current rate of ${currentRate.toFixed(2)} is at or near the 30-day high of ${maxRate30Days.toFixed(2)}.`;
    } else if (isWorstIn30Days) {
      insight = `Current rate is near the 30-day low. The rate was ${((maxRate30Days / currentRate - 1) * 100).toFixed(1)}% higher earlier this month.`;
    } else if (isHighSpread) {
      insight = `Provider spread is unusually high at ${currentMarket.providerSpread.toFixed(1)}% - comparing providers could save you more today.`;
    } else {
      const positionInRange = ((currentRate - minRate30Days) / (maxRate30Days - minRate30Days)) * 100;
      insight = `Current rate is ${positionInRange.toFixed(0)}% up from the 30-day low. ${currentMarket.bestProvider} leads with the best rate.`;
    }
    
    return {
      isBestIn30Days,
      isWorstIn30Days,
      isHighSpread,
      insight
    };
  }
  
  private generateForecast(historicalData: any[], currentMarket: any) {
    if (historicalData.length < 14) {
      return {
        sevenDay: {
          predictedRate: currentMarket.bestProviderRate,
          changePercent: 0,
          confidence: 0.3,
          direction: 'stable' as const
        },
        thirtyDay: {
          predictedRate: currentMarket.bestProviderRate,
          changePercent: 0,
          confidence: 0.2,
          direction: 'stable' as const
        }
      };
    }
    
    const rates = historicalData.map(d => d.rate);
    const currentRate = rates[rates.length - 1];
    
    const dataPoints = historicalData.map((point, index) => ({
      x: index,
      y: point.rate
    }));
    
    const { slope, intercept, rSquared } = this.calculateLinearRegression(dataPoints);
    const volatility = this.calculateVolatility(rates);
    
    const sevenDayPredicted = slope * (dataPoints.length + 7) + intercept;
    const thirtyDayPredicted = slope * (dataPoints.length + 30) + intercept;
    
    const recentMA = rates.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const smoothed7Day = sevenDayPredicted * 0.7 + recentMA * 0.3;
    const smoothed30Day = thirtyDayPredicted * 0.6 + recentMA * 0.4;
    
    const sevenDayChange = ((smoothed7Day - currentRate) / currentRate) * 100;
    const thirtyDayChange = ((smoothed30Day - currentRate) / currentRate) * 100;
    
    const baseConfidence7 = Math.max(0.35, Math.min(0.85, rSquared * (1 - volatility / 100)));
    const baseConfidence30 = Math.max(0.25, Math.min(0.70, rSquared * 0.8 * (1 - volatility / 100)));
    
    const getDirection = (change: number): 'up' | 'down' | 'stable' => {
      if (Math.abs(change) < 0.3) return 'stable';
      return change > 0 ? 'up' : 'down';
    };
    
    return {
      sevenDay: {
        predictedRate: smoothed7Day,
        changePercent: sevenDayChange,
        confidence: baseConfidence7,
        direction: getDirection(sevenDayChange)
      },
      thirtyDay: {
        predictedRate: smoothed30Day,
        changePercent: thirtyDayChange,
        confidence: baseConfidence30,
        direction: getDirection(thirtyDayChange)
      }
    };
  }
  
  private generateRecommendation(
    currentMarket: any,
    anomalies: any,
    forecast: any,
    amount: number
  ) {
    const { sevenDay, thirtyDay } = forecast;
    const potentialChange7Day = (sevenDay.changePercent / 100) * amount * currentMarket.bestProviderRate;
    
    let action: 'send_now' | 'wait' | 'set_alert';
    let reasoning: string;
    let urgency: 'high' | 'medium' | 'low';
    let potentialImpact: string;
    
    if (anomalies.isBestIn30Days && sevenDay.confidence > 0.5) {
      action = 'send_now';
      reasoning = 'Rate is at the 30-day high - this is an excellent time to transfer.';
      urgency = 'high';
      potentialImpact = `Lock in this rate now. Based on trends, rates may fall by ${Math.abs(sevenDay.changePercent).toFixed(1)}% over the next week.`;
    } else if (anomalies.isWorstIn30Days && sevenDay.direction === 'up' && sevenDay.confidence > 0.5) {
      action = 'wait';
      reasoning = 'Rate is near the 30-day low but trending upward. Waiting could yield better results.';
      urgency = 'medium';
      potentialImpact = `If you wait 7 days, you could receive ~${Math.abs(potentialChange7Day).toFixed(0)} ${currentMarket.bestProvider ? 'more' : 'less'} ${forecast.sevenDay.direction === 'up' ? 'more' : 'less'}.`;
    } else if (sevenDay.direction === 'up' && sevenDay.changePercent > 0.5 && sevenDay.confidence > 0.6) {
      action = 'wait';
      reasoning = `Rates are predicted to increase by ${sevenDay.changePercent.toFixed(1)}% over the next 7 days.`;
      urgency = 'medium';
      potentialImpact = `Waiting could mean ~${Math.abs(potentialChange7Day).toFixed(0)} more in your transfer.`;
    } else if (sevenDay.direction === 'down' && Math.abs(sevenDay.changePercent) > 0.5 && sevenDay.confidence > 0.6) {
      action = 'send_now';
      reasoning = `Rates may decrease by ${Math.abs(sevenDay.changePercent).toFixed(1)}% over the next week.`;
      urgency = 'high';
      potentialImpact = `Sending now could save you ~${Math.abs(potentialChange7Day).toFixed(0)} versus waiting.`;
    } else {
      action = 'set_alert';
      reasoning = 'Market is relatively stable. Set an alert to catch rate improvements.';
      urgency = 'low';
      potentialImpact = 'Rate movements are expected to be modest - monitor for opportunities.';
    }
    
    return { action, reasoning, urgency, potentialImpact };
  }
  
  private generateAlertSuggestion(currentMarket: any, forecast: any, rateStats: any) {
    const currentRate = currentMarket.bestProviderRate;
    const thirtyDayAvg = rateStats.thirtyDayAverage || currentRate;
    
    let targetRate: number;
    let percentageAboveCurrent: number;
    let reasoning: string;
    
    if (forecast.sevenDay.direction === 'up' && forecast.sevenDay.confidence > 0.5) {
      targetRate = forecast.sevenDay.predictedRate * 0.98;
      percentageAboveCurrent = ((targetRate - currentRate) / currentRate) * 100;
      reasoning = `Based on upward forecast, set alert at ${percentageAboveCurrent.toFixed(1)}% above current to catch the predicted improvement.`;
    } else if (currentRate < thirtyDayAvg) {
      targetRate = thirtyDayAvg;
      percentageAboveCurrent = ((targetRate - currentRate) / currentRate) * 100;
      reasoning = `Current rate is below average. Alert when rate returns to the 30-day average of ${thirtyDayAvg.toFixed(2)}.`;
    } else {
      targetRate = currentRate * 1.01;
      percentageAboveCurrent = 1.0;
      reasoning = 'Set a 1% improvement alert to catch market opportunities.';
    }
    
    return {
      targetRate,
      percentageAboveCurrent,
      reasoning
    };
  }
  
  private calculateLinearRegression(dataPoints: { x: number; y: number }[]) {
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
    
    for (const point of dataPoints) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumXX += point.x * point.x;
      sumYY += point.y * point.y;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (const point of dataPoints) {
      const predicted = slope * point.x + intercept;
      ssRes += (point.y - predicted) ** 2;
      ssTot += (point.y - yMean) ** 2;
    }
    
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    
    return { slope, intercept, rSquared: Math.max(0, rSquared) };
  }
  
  private calculateVolatility(rates: number[]): number {
    if (rates.length < 2) return 0;
    
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const squaredDiffs = rates.map(r => (r - mean) ** 2);
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    
    return (stdDev / mean) * 100;
  }
}

export const powerInsightService = new PowerInsightService();
