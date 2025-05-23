/**
 * Rate filtering utility to ensure only fresh rates (within 24 hours) are returned
 */

export interface RateWithTimestamp {
  id?: number;
  providerId: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
  [key: string]: any;
}

/**
 * Filters rates to only include those updated within the last 24 hours
 * @param rates Array of rates with lastUpdated timestamps
 * @returns Filtered array containing only fresh rates
 */
export function filterFreshRates<T extends RateWithTimestamp>(rates: T[]): T[] {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  
  return rates.filter(rate => {
    const lastUpdated = new Date(rate.lastUpdated);
    return lastUpdated >= twentyFourHoursAgo;
  });
}

/**
 * Checks if a rate is fresh (within 24 hours)
 * @param lastUpdated The timestamp when the rate was last updated
 * @returns True if the rate is fresh, false otherwise
 */
export function isRateFresh(lastUpdated: Date | string): boolean {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  
  const rateTimestamp = new Date(lastUpdated);
  return rateTimestamp >= twentyFourHoursAgo;
}

/**
 * Gets the maximum age in hours for a rate to be considered fresh
 * @returns 24 (hours)
 */
export function getMaxRateAgeHours(): number {
  return 24;
}