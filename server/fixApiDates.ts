/**
 * Fix API Dates Script
 * 
 * This script updates the historical rate data to ensure dates are in the proper historical range,
 * shifting any future dates to be correctly set in the past.
 */

import { db } from './db';
import { rateTrends } from '@shared/schema';
import { format, subDays, parseISO } from 'date-fns';
import { eq, sql } from 'drizzle-orm';

/**
 * Updates the existing rate trends data to use proper historical dates
 */
export async function correctHistoricalDates(): Promise<{ success: boolean; corrected: number }> {
  try {
    console.log('Starting correction of historical rate dates to proper time range...');
    
    // Get all trends data
    const allTrends = await db.select().from(rateTrends);
    console.log(`Found ${allTrends.length} total historical rate records`);
    
    const today = new Date();
    
    // Find all records with future dates (these need correction)
    const futureDates = allTrends.filter(trend => {
      const trendDate = parseISO(trend.date);
      return trendDate > today;
    });
    
    console.log(`Found ${futureDates.length} records with future dates that need correction`);
    
    if (futureDates.length === 0) {
      console.log('No future dates found in the database, no correction needed');
      return { success: true, corrected: 0 };
    }
    
    // Calculate date adjustment to move future dates to proper historical range
    // Find the furthest future date
    const maxDate = futureDates.reduce((max, trend) => {
      const trendDate = parseISO(trend.date);
      return trendDate > max ? trendDate : max;
    }, parseISO(futureDates[0].date));
    
    // Calculate years to shift back
    const yearsToShift = maxDate.getFullYear() - today.getFullYear() + 1;
    
    console.log(`Adjusting dates by shifting back ${yearsToShift} years`);
    
    // Update all future dates
    let corrected = 0;
    
    for (const trend of futureDates) {
      const originalDate = parseISO(trend.date);
      
      // Shift the date back by the calculated number of years
      const adjustedDate = new Date(originalDate);
      adjustedDate.setFullYear(adjustedDate.getFullYear() - yearsToShift);
      
      // Format the new date
      const newDateStr = format(adjustedDate, 'yyyy-MM-dd');
      
      // Update the record
      await db.update(rateTrends)
        .set({ date: newDateStr })
        .where(eq(rateTrends.id, trend.id));
      
      corrected++;
      
      if (corrected % 50 === 0) {
        console.log(`Corrected ${corrected} / ${futureDates.length} records so far...`);
      }
    }
    
    console.log(`Successfully corrected ${corrected} records with future dates`);
    return { success: true, corrected };
  } catch (error) {
    console.error(`Error correcting historical dates: ${error}`);
    return { success: false, corrected: 0 };
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  correctHistoricalDates()
    .then(result => {
      if (result.success) {
        console.log(`✓ Successfully corrected ${result.corrected} historical date records`);
        process.exit(0);
      } else {
        console.error('✗ Failed to correct historical dates');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`Error running correction script: ${error}`);
      process.exit(1);
    });
}