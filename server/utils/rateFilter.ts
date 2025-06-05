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

// Default rate freshness threshold in hours (7 days = 168 hours)
const DEFAULT_MAX_RATE_AGE_HOURS = 168;

/**
 * Get the current rate freshness threshold from environment or default
 * This can be configured via admin panel or environment variable
 */
export function getMaxRateAgeHours(): number {
  // Check for environment variable first (for easy configuration)
  const envHours = process.env.MAX_RATE_AGE_HOURS;
  if (envHours && !isNaN(parseInt(envHours))) {
    return parseInt(envHours);
  }
  
  return DEFAULT_MAX_RATE_AGE_HOURS;
}

/**
 * Filters rates to only include those updated within the configured freshness window
 * @param rates Array of rates with lastUpdated timestamps
 * @returns Filtered array containing only fresh rates
 */
export function filterFreshRates<T extends RateWithTimestamp>(rates: T[]): T[] {
  const maxAgeHours = getMaxRateAgeHours();
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
  
  return rates.filter(rate => {
    const lastUpdated = new Date(rate.lastUpdated);
    return lastUpdated >= cutoffTime;
  });
}

/**
 * Checks if a rate is fresh (within the configured freshness window)
 * @param lastUpdated The timestamp when the rate was last updated
 * @returns True if the rate is fresh, false otherwise
 */
export function isRateFresh(lastUpdated: Date | string): boolean {
  const maxAgeHours = getMaxRateAgeHours();
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
  
  const rateTimestamp = new Date(lastUpdated);
  return rateTimestamp >= cutoffTime;
}