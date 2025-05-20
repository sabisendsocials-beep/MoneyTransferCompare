/**
 * Enhanced Rate Trends API Endpoint
 * 
 * This module implements an improved rate trends endpoint that ensures:
 * 1. Data fetched and returned is for the correct historical period
 * 2. Future dates are properly converted to historical dates
 * 3. The full requested period (7d, 30d, 90d, 365d) of data is returned when available
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { rateTrends } from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';
import { subDays, parseISO, isAfter, isBefore, format } from 'date-fns';
import { IStorage } from '../storage';
import { correctHistoricalDates } from '../fixApiDates';

/**
 * Fetches historical rate trend data, correcting date issues if needed
 */
export async function handleRateTrendsRequest(req: Request, res: Response, storage: IStorage) {
  try {
    const { from, to, days = '30' } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing required parameters: from and to currencies' });
    }
    
    const numDays = parseInt(days as string);
    const fromCurrency = from as string;
    const toCurrency = to as string;
    
    console.log(`[API] Fetching rate trends for ${fromCurrency}/${toCurrency} (${numDays} days)`);
    
    // Get data directly from storage first
    const trends = await storage.getRateTrends(fromCurrency, toCurrency, numDays);
    
    // Check if we need to correct any future dates in the data
    const today = new Date();
    const futureDates = trends.filter(trend => {
      const trendDate = parseISO(trend.date);
      return isAfter(trendDate, today);
    });
    
    if (futureDates.length > 0) {
      console.log(`[API] Found ${futureDates.length} future dates in trend data, running correction...`);
      
      // Run the date correction
      const { success, corrected } = await correctHistoricalDates();
      
      if (success && corrected > 0) {
        console.log(`[API] Successfully corrected ${corrected} date records, fetching updated data...`);
        
        // Fetch the corrected data
        const correctedTrends = await storage.getRateTrends(fromCurrency, toCurrency, numDays);
        
        if (correctedTrends.length > 0) {
          console.log(`[API] Returning ${correctedTrends.length} corrected historical rate points`);
          console.log(`[API] First point: ${JSON.stringify(correctedTrends[0])}`);
          console.log(`[API] Last point: ${JSON.stringify(correctedTrends[correctedTrends.length - 1])}`);
          return res.json(correctedTrends);
        }
      }
    }
    
    // If we have data and no corrections were needed, return it
    if (trends.length > 0) {
      console.log(`[API] Found ${trends.length} historical rate points from real data`);
      console.log(`[API] First point: ${JSON.stringify(trends[0])}`);
      console.log(`[API] Last point: ${JSON.stringify(trends[trends.length - 1])}`);
      return res.json(trends);
    }
    
    // If no data was found, return empty array with appropriate message
    console.log(`[API] No historical rate data found for ${fromCurrency}/${toCurrency}`);
    return res.json([]);
  } catch (error) {
    console.error(`[API] Error fetching rate trends: ${error}`);
    return res.status(500).json({ error: 'Failed to fetch rate trends' });
  }
}