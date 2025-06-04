/**
 * Optimized Rate Statistics Service
 * Simple, efficient calculations using targeted database queries
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { RateStats } from '@shared/schema';

export class RateStatsService {
  
  /**
   * Get rate statistics with optimized queries
   * Returns raw historical rates for frontend percentage calculations
   */
  async getRateStats(fromCurrency: string, toCurrency: string): Promise<RateStats> {
    try {
      // Get current rate (most recent)
      const currentResult = await db.execute<{ rate: number }>(sql`
        SELECT rate FROM rate_trends
        WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
        AND rate > 0
        ORDER BY date DESC
        LIMIT 1
      `);
      
      if (!currentResult.rows.length) {
        return this.getEmptyStats();
      }
      
      const currentRate = currentResult.rows[0].rate;
      
      // Get 30-day high, low, and average in one query
      const thirtyDayStats = await db.execute<{
        high: number;
        low: number;
        avg: number;
      }>(sql`
        SELECT 
          MAX(rate) as high,
          MIN(rate) as low,
          AVG(rate) as avg
        FROM (
          SELECT rate FROM rate_trends
          WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
          AND rate > 0
          ORDER BY date DESC
          LIMIT 30
        ) recent
      `);
      
      // Get historical reference points (30, 90, 365 days ago)
      const historicalRates = await Promise.all([
        this.getHistoricalRate(fromCurrency, toCurrency, 30),
        this.getHistoricalRate(fromCurrency, toCurrency, 90),
        this.getHistoricalRate(fromCurrency, toCurrency, 365)
      ]);
      
      const [oneMonthRate, threeMonthRate, oneYearRate] = historicalRates;
      
      // Simple percentage calculations
      const oneMonthChange = oneMonthRate ? this.calculatePercentChange(currentRate, oneMonthRate) : null;
      const threeMonthChange = threeMonthRate ? this.calculatePercentChange(currentRate, threeMonthRate) : null;
      const oneYearChange = oneYearRate ? this.calculatePercentChange(currentRate, oneYearRate) : null;
      
      const stats = thirtyDayStats.rows[0];
      
      return {
        currentRate,
        thirtyDayHigh: stats?.high || null,
        thirtyDayHighDate: null,
        thirtyDayLow: stats?.low || null,
        thirtyDayLowDate: null,
        thirtyDayAverage: stats?.avg ? parseFloat(stats.avg.toFixed(2)) : null,
        oneMonthChange,
        threeMonthChange,
        oneYearChange,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error getting stats for ${fromCurrency}-${toCurrency}:`, error);
      return this.getEmptyStats();
    }
  }
  
  /**
   * Get historical rate for specific number of days ago
   */
  private async getHistoricalRate(fromCurrency: string, toCurrency: string, daysAgo: number): Promise<number | null> {
    try {
      const result = await db.execute<{ rate: number }>(sql`
        SELECT rate FROM rate_trends
        WHERE from_currency = ${fromCurrency} AND to_currency = ${toCurrency}
        AND rate > 0
        AND date::date <= (CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days')
        ORDER BY date DESC
        LIMIT 1
      `);
      
      return result.rows[0]?.rate || null;
    } catch (error) {
      console.error(`Error getting ${daysAgo}-day historical rate:`, error);
      return null;
    }
  }
  
  /**
   * Calculate percentage change between current and historical rate
   */
  private calculatePercentChange(current: number, historical: number): number {
    return parseFloat(((current - historical) / historical * 100).toFixed(2));
  }
  
  /**
   * Return empty stats structure
   */
  private getEmptyStats(): RateStats {
    return {
      currentRate: null,
      thirtyDayHigh: null,
      thirtyDayHighDate: null,
      thirtyDayLow: null,
      thirtyDayLowDate: null,
      thirtyDayAverage: null,
      oneMonthChange: null,
      threeMonthChange: null,
      oneYearChange: null,
      lastUpdated: new Date().toISOString()
    };
  }
}

export const rateStatsService = new RateStatsService();