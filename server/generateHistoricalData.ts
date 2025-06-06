/**
 * Historical Data Population Script
 * 
 * This script helps populate the rate_trends table with historical data
 * for all supported currency pairs going back a full year.
 */

import { db } from './db';
import { rateTrends, rateCache } from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';
import { subDays, format, subYears, addDays } from 'date-fns';

// Currency pairs we want to track
const CURRENCY_PAIRS = [
  { from: 'GBP', to: 'NGN' },
  { from: 'EUR', to: 'NGN' },
  { from: 'GBP', to: 'GHS' },
  { from: 'EUR', to: 'GHS' }
];

// Base rates to use as starting points
const BASE_RATES: Record<string, number> = {
  'GBP-NGN': 2130,
  'EUR-NGN': 1800,
  'GBP-GHS': 16.5,
  'EUR-GHS': 14.2
};

/**
 * Populate a full year of historical exchange rate data for all currency pairs
 * This creates realistic-looking data with trends that match typical currency movements
 */
export async function populateYearOfHistoricalData(forceUpdate = false): Promise<boolean> {
  try {
    console.log('Starting population of historical rate data for a full year...');
    
    // Check for Alpha Vantage protected data first
    console.log('Checking for protected Alpha Vantage datasets...');
    
    for (const pair of CURRENCY_PAIRS) {
      const alphaVantageData = await db.select({ count: sql`COUNT(*)` })
        .from(rateTrends)
        .where(
          and(
            eq(rateTrends.from_currency, pair.from),
            eq(rateTrends.to_currency, pair.to),
            eq(rateTrends.source, 'alpha_vantage')
          )
        );
      
      const alphaCount = typeof alphaVantageData[0]?.count === 'number' ? alphaVantageData[0].count : 
                        typeof alphaVantageData[0]?.count === 'string' ? parseInt(alphaVantageData[0].count) : 0;
      
      if (alphaCount > 1000) {
        console.log(`PROTECTED DATASET FOUND: ${pair.from}/${pair.to} has ${alphaCount} Alpha Vantage records - aborting data generation`);
        console.log('Data protection system active - will not overwrite authentic historical data');
        return true; // Exit to preserve authentic data
      }
    }
    
    // If forceUpdate is false, check if we already have sufficient data
    if (!forceUpdate) {
      const countQuery = await db.select({ count: sql`COUNT(*)` }).from(rateTrends);
      // Handle type safely
      const countValue = countQuery[0]?.count;
      const count = typeof countValue === 'number' ? countValue : 
                   typeof countValue === 'string' ? parseInt(countValue) : 0;
      
      if (count > 100) {
        console.log(`Found ${count} existing historical rates, skipping population`);
        return true;
      }
    }
    
    // Calculate date range for a full year
    const today = new Date();
    const oneYearAgo = subYears(today, 1);
    
    // Keep track of how many data points we create
    let totalCreated = 0;
    
    for (const pair of CURRENCY_PAIRS) {
      const pairKey = `${pair.from}-${pair.to}`;
      let baseRate = BASE_RATES[pairKey] || 1.0;
      
      console.log(`Populating data for ${pairKey} from ${format(oneYearAgo, 'yyyy-MM-dd')} to ${format(today, 'yyyy-MM-dd')}`);
      
      // Get existing data to avoid duplicates
      const existingDates = new Set();
      const existingRecords = await db.select()
        .from(rateTrends)
        .where(
          and(
            eq(rateTrends.from_currency, pair.from),
            eq(rateTrends.to_currency, pair.to)
          )
        );
      
      existingRecords.forEach(record => {
        existingDates.add(record.date);
      });
      
      console.log(`Found ${existingDates.size} existing data points for ${pairKey}`);
      
      // Generate data for each day in the range
      let currentDate = new Date(oneYearAgo);
      let currentRate = baseRate;
      let created = 0;
      
      // Add a bit of randomness to starting point
      const randomStartingOffset = (Math.random() - 0.5) * 0.05 * baseRate;
      currentRate += randomStartingOffset;
      
      while (currentDate <= today) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Skip if we already have data for this date
        if (!existingDates.has(dateStr)) {
          // Generate a realistic rate with some volatility and trend patterns
          // Monthly trend pattern 
          const dayOfYear = Math.floor((currentDate.getTime() - oneYearAgo.getTime()) / (1000 * 60 * 60 * 24));
          const yearlyTrendFactor = 1 + 0.15 * Math.sin(dayOfYear / 365 * Math.PI * 2);
          
          // Weekly pattern
          const dayOfWeek = currentDate.getDay();
          const weeklyFactor = 1 + 0.01 * Math.sin(dayOfWeek / 7 * Math.PI * 2);
          
          // Daily random component (normal market volatility)
          const dailyVolatility = (Math.random() - 0.5) * 0.01;
          
          // Occasional small jumps (market events)
          const jumpFactor = Math.random() > 0.97 ? (Math.random() - 0.5) * 0.03 : 0;
          
          // Calculate the new rate with all factors
          const changePercent = (yearlyTrendFactor * weeklyFactor - 1) * 0.01 + dailyVolatility + jumpFactor;
          currentRate = currentRate * (1 + changePercent);
          
          // Insert into database
          await db.insert(rateTrends).values({
            from_currency: pair.from,
            to_currency: pair.to,
            date: dateStr,
            rate: currentRate,
          });
          
          created++;
          totalCreated++;
          
          // Show progress every 30 days
          if (created % 30 === 0) {
            console.log(`Created ${created} data points for ${pairKey} so far...`);
          }
        }
        
        // Move to next day
        currentDate = addDays(currentDate, 1);
      }
      
      console.log(`Created ${created} new data points for ${pairKey}`);
      
      // Update rate cache
      const cacheEntry = await db.select()
        .from(rateCache)
        .where(
          and(
            eq(rateCache.from_currency, pair.from),
            eq(rateCache.to_currency, pair.to)
          )
        );
      
      if (cacheEntry.length === 0) {
        await db.insert(rateCache).values({
          from_currency: pair.from,
          to_currency: pair.to,
          last_updated: new Date()
        });
      } else {
        await db.update(rateCache)
          .set({ last_updated: new Date() })
          .where(
            and(
              eq(rateCache.from_currency, pair.from),
              eq(rateCache.to_currency, pair.to)
            )
          );
      }
    }
    
    console.log(`Successfully created ${totalCreated} historical data points`);
    return true;
  } catch (error) {
    console.error(`Error populating historical data: ${error}`);
    return false;
  }
}