/**
 * Chart Data Service
 * Combines historical data + daily increments for chart display
 * Provides unified data source for frontend charts
 */

import { db } from '../db';
import { rateTrends } from '../../shared/schema';
import { sql, eq, and, desc, asc } from 'drizzle-orm';
import { subDays, format } from 'date-fns';

export interface ChartDataPoint {
  date: string;
  rate: number;
  from_currency: string;
  to_currency: string;
  source: 'alpha_vantage' | 'daily_increment';
}

/**
 * Get combined chart data (historical + daily increments) for a currency pair
 * Prioritizes historical data, supplements with daily increments for recent dates
 */
export async function getChartData(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30
): Promise<ChartDataPoint[]> {
  
  console.log(`Getting chart data for ${fromCurrency}/${toCurrency} (${days} days)`);
  
  const startDate = subDays(new Date(), days);
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  
  try {
    // Get all data (both historical and daily increments) for the period
    const allData = await db.select()
      .from(rateTrends)
      .where(
        and(
          eq(rateTrends.from_currency, fromCurrency),
          eq(rateTrends.to_currency, toCurrency),
          sql`${rateTrends.date} >= ${formattedStartDate}`,
          sql`${rateTrends.source} IN ('alpha_vantage', 'daily_increment')`
        )
      )
      .orderBy(asc(rateTrends.date));
    
    if (allData.length === 0) {
      console.log(`No chart data found for ${fromCurrency}/${toCurrency}`);
      return [];
    }
    
    // Create a map to handle duplicate dates (prioritize alpha_vantage over daily_increment)
    const dataMap = new Map<string, ChartDataPoint>();
    
    for (const record of allData) {
      const key = record.date;
      const existing = dataMap.get(key);
      
      // If no existing data for this date, add it
      if (!existing) {
        dataMap.set(key, {
          date: record.date,
          rate: record.rate,
          from_currency: record.from_currency,
          to_currency: record.to_currency,
          source: record.source as 'alpha_vantage' | 'daily_increment'
        });
      } else {
        // If existing data is daily_increment and new data is alpha_vantage, replace it
        if (existing.source === 'daily_increment' && record.source === 'alpha_vantage') {
          dataMap.set(key, {
            date: record.date,
            rate: record.rate,
            from_currency: record.from_currency,
            to_currency: record.to_currency,
            source: record.source as 'alpha_vantage' | 'daily_increment'
          });
        }
        // Keep alpha_vantage data if it already exists (don't overwrite with daily_increment)
      }
    }
    
    // Convert back to array and sort by date
    const chartData = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`Found ${chartData.length} chart data points for ${fromCurrency}/${toCurrency}`);
    console.log(`Data sources: ${chartData.filter(d => d.source === 'alpha_vantage').length} historical, ${chartData.filter(d => d.source === 'daily_increment').length} daily increments`);
    
    return chartData;
    
  } catch (error) {
    console.error(`Error getting chart data for ${fromCurrency}/${toCurrency}:`, error);
    return [];
  }
}

/**
 * Get chart statistics for a currency pair
 */
export async function getChartStats(
  fromCurrency: string,
  toCurrency: string
): Promise<{
  currentRate: number | null;
  thirtyDayHigh: number | null;
  thirtyDayLow: number | null;
  thirtyDayChange: number | null;
  oneYearHigh: number | null;
  oneYearLow: number | null;
  dataPoints: number;
  historicalDataPoints: number;
  dailyIncrementPoints: number;
}> {
  
  try {
    // Get 30-day data
    const thirtyDayData = await getChartData(fromCurrency, toCurrency, 30);
    
    // Get 1-year data
    const oneYearData = await getChartData(fromCurrency, toCurrency, 365);
    
    // Calculate statistics
    const currentRate = thirtyDayData.length > 0 ? thirtyDayData[thirtyDayData.length - 1].rate : null;
    const oldestRate = thirtyDayData.length > 0 ? thirtyDayData[0].rate : null;
    
    const thirtyDayRates = thirtyDayData.map(d => d.rate);
    const oneYearRates = oneYearData.map(d => d.rate);
    
    const thirtyDayHigh = thirtyDayRates.length > 0 ? Math.max(...thirtyDayRates) : null;
    const thirtyDayLow = thirtyDayRates.length > 0 ? Math.min(...thirtyDayRates) : null;
    const oneYearHigh = oneYearRates.length > 0 ? Math.max(...oneYearRates) : null;
    const oneYearLow = oneYearRates.length > 0 ? Math.min(...oneYearRates) : null;
    
    const thirtyDayChange = (currentRate && oldestRate) 
      ? ((currentRate - oldestRate) / oldestRate) * 100 
      : null;
    
    const historicalDataPoints = oneYearData.filter(d => d.source === 'alpha_vantage').length;
    const dailyIncrementPoints = oneYearData.filter(d => d.source === 'daily_increment').length;
    
    return {
      currentRate,
      thirtyDayHigh,
      thirtyDayLow,
      thirtyDayChange,
      oneYearHigh,
      oneYearLow,
      dataPoints: oneYearData.length,
      historicalDataPoints,
      dailyIncrementPoints
    };
    
  } catch (error) {
    console.error(`Error calculating chart stats for ${fromCurrency}/${toCurrency}:`, error);
    return {
      currentRate: null,
      thirtyDayHigh: null,
      thirtyDayLow: null,
      thirtyDayChange: null,
      oneYearHigh: null,
      oneYearLow: null,
      dataPoints: 0,
      historicalDataPoints: 0,
      dailyIncrementPoints: 0
    };
  }
}

/**
 * Get data coverage summary for all currency pairs
 */
export async function getDataCoverageSummary(): Promise<Array<{
  pair: string;
  historicalRecords: number;
  dailyIncrements: number;
  totalRecords: number;
  earliestDate: string | null;
  latestDate: string | null;
  coverage: 'complete' | 'partial' | 'minimal';
}>> {
  
  const ALL_CURRENCY_PAIRS = [
    ['GBP', 'NGN'], ['EUR', 'NGN'], ['USD', 'NGN'],
    ['GBP', 'GHS'], ['EUR', 'GHS'], ['USD', 'GHS'],
    ['GBP', 'KES'], ['EUR', 'KES'], ['USD', 'KES'],
    ['GBP', 'INR'], ['EUR', 'INR'], ['USD', 'INR'],
    ['GBP', 'PKR'], ['EUR', 'PKR'], ['USD', 'PKR']
  ];
  
  const summary = [];
  
  for (const [fromCurrency, toCurrency] of ALL_CURRENCY_PAIRS) {
    // Get historical data count
    const historicalCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM rate_trends 
      WHERE from_currency = ${fromCurrency} 
      AND to_currency = ${toCurrency} 
      AND source = 'alpha_vantage'
    `);
    
    // Get daily increment count
    const dailyCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM rate_trends 
      WHERE from_currency = ${fromCurrency} 
      AND to_currency = ${toCurrency} 
      AND source = 'daily_increment'
    `);
    
    // Get date range
    const dateRange = await db.execute(sql`
      SELECT MIN(date) as earliest, MAX(date) as latest FROM rate_trends 
      WHERE from_currency = ${fromCurrency} 
      AND to_currency = ${toCurrency} 
      AND source IN ('alpha_vantage', 'daily_increment')
    `);
    
    const historicalRecords = historicalCount.rows[0].count as number;
    const dailyIncrements = dailyCount.rows[0].count as number;
    const totalRecords = historicalRecords + dailyIncrements;
    const earliestDate = dateRange.rows[0].earliest as string;
    const latestDate = dateRange.rows[0].latest as string;
    
    // Determine coverage level
    let coverage: 'complete' | 'partial' | 'minimal';
    if (historicalRecords > 1000) {
      coverage = 'complete';
    } else if (totalRecords > 50) {
      coverage = 'partial';
    } else {
      coverage = 'minimal';
    }
    
    summary.push({
      pair: `${fromCurrency}/${toCurrency}`,
      historicalRecords,
      dailyIncrements,
      totalRecords,
      earliestDate,
      latestDate,
      coverage
    });
  }
  
  return summary;
}