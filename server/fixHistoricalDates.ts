/**
 * Fix Historical Dates Script
 * 
 * This script corrects the dates in our historical rate data by shifting future dates (2025)
 * to be within the proper historical range (past year from today).
 */

import { db } from './db';
import { rateTrends } from '@shared/schema';
import { format, subDays, parseISO } from 'date-fns';
import { eq, sql } from 'drizzle-orm';

/**
 * Updates the dates in the rate_trends table to ensure they are in the correct historical range
 */
export async function fixHistoricalDates(): Promise<boolean> {
  try {
    console.log('Starting date correction for historical rate data...');
    
    // Get all rate trend data
    const allTrends = await db.select().from(rateTrends);
    
    console.log(`Found ${allTrends.length} historical rate records total`);
    
    // Check if we have any future dates
    const today = new Date();
    const futureDates = allTrends.filter(trend => {
      const trendDate = parseISO(trend.date);
      return trendDate > today;
    });
    
    if (futureDates.length === 0) {
      console.log('No future dates found, no correction needed');
      return true;
    }
    
    console.log(`Found ${futureDates.length} future dates that need correction`);
    
    // Determine the proper date range (1 year ago until today)
    const oneYearAgo = subDays(today, 365);
    
    // Group trends by currency pair to maintain relative ordering within each pair
    const pairGroups: Record<string, typeof allTrends> = {};
    
    allTrends.forEach(trend => {
      const pairKey = `${trend.from_currency}-${trend.to_currency}`;
      if (!pairGroups[pairKey]) {
        pairGroups[pairKey] = [];
      }
      pairGroups[pairKey].push(trend);
    });
    
    // For each pair, sort by date and remap the dates to the proper historical range
    let totalUpdated = 0;
    
    for (const [pairKey, trends] of Object.entries(pairGroups)) {
      console.log(`Processing ${trends.length} records for ${pairKey}`);
      
      // Sort trends by date (ascending)
      const sortedTrends = [...trends].sort((a, b) => {
        return parseISO(a.date).getTime() - parseISO(b.date).getTime();
      });
      
      // Make a copy of the sorted trends
      const trendsToUpdate = [...sortedTrends];
      
      // For each trend in the pair, update its date relative to the date range
      for (let i = 0; i < trendsToUpdate.length; i++) {
        const trend = trendsToUpdate[i];
        
        // Calculate new date based on position in the array
        const relativePosition = i / (trendsToUpdate.length - 1);
        const daysFromStart = Math.round(relativePosition * 365);
        
        const newDate = subDays(today, 365 - daysFromStart);
        const formattedNewDate = format(newDate, 'yyyy-MM-dd');
        
        // Only update future dates
        const trendDate = parseISO(trend.date);
        if (trendDate > today) {
          try {
            await db.update(rateTrends)
              .set({ date: formattedNewDate })
              .where(
                sql`id = ${trend.id}`
              );
            
            totalUpdated++;
            
            if (totalUpdated % 50 === 0) {
              console.log(`Updated ${totalUpdated} records so far...`);
            }
          } catch (error) {
            console.error(`Error updating record ${trend.id}: ${error}`);
          }
        }
      }
    }
    
    console.log(`Successfully updated ${totalUpdated} date records`);
    return true;
  } catch (error) {
    console.error(`Error fixing historical dates: ${error}`);
    return false;
  }
}

// Execute the function if this script is run directly
if (require.main === module) {
  fixHistoricalDates()
    .then(success => {
      if (success) {
        console.log('✓ Historical dates have been corrected successfully');
      } else {
        console.error('❌ Failed to correct historical dates');
      }
      process.exit(success ? 0 : 1);
    });
}