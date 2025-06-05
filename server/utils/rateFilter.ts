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

// Cache for database setting to avoid repeated queries
let cachedMaxRateAge: number | null = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current rate freshness threshold from database, environment, or default
 * This can be configured via admin panel or environment variable
 */
export async function getMaxRateAgeHours(): Promise<number> {
  // Check cache first
  const now = Date.now();
  if (cachedMaxRateAge !== null && (now - lastCacheTime) < CACHE_DURATION_MS) {
    return cachedMaxRateAge;
  }

  try {
    // Try to get from database first
    const { db } = await import('../db');
    const { systemSettings } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const setting = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.setting_key, 'max_rate_age_hours'))
      .limit(1);
    
    if (setting.length > 0) {
      const dbValue = parseInt(setting[0].setting_value);
      if (!isNaN(dbValue) && dbValue > 0) {
        cachedMaxRateAge = dbValue;
        lastCacheTime = now;
        return dbValue;
      }
    }
  } catch (error) {
    console.warn('Could not fetch max_rate_age_hours from database:', error);
  }
  
  // Fallback to environment variable
  const envHours = process.env.MAX_RATE_AGE_HOURS;
  if (envHours && !isNaN(parseInt(envHours))) {
    const envValue = parseInt(envHours);
    cachedMaxRateAge = envValue;
    lastCacheTime = now;
    return envValue;
  }
  
  // Final fallback to default
  cachedMaxRateAge = DEFAULT_MAX_RATE_AGE_HOURS;
  lastCacheTime = now;
  return DEFAULT_MAX_RATE_AGE_HOURS;
}

/**
 * Synchronous version for backwards compatibility
 * Returns cached value or default if no cache available
 */
export function getMaxRateAgeHoursSync(): number {
  return cachedMaxRateAge || DEFAULT_MAX_RATE_AGE_HOURS;
}

/**
 * Filters rates to only include those updated within the configured freshness window
 * @param rates Array of rates with lastUpdated timestamps
 * @returns Filtered array containing only fresh rates
 */
export function filterFreshRates<T extends RateWithTimestamp>(rates: T[]): T[] {
  const maxAgeHours = getMaxRateAgeHoursSync();
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
  const maxAgeHours = getMaxRateAgeHoursSync();
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
  
  const rateTimestamp = new Date(lastUpdated);
  return rateTimestamp >= cutoffTime;
}