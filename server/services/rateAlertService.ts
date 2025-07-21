/**
 * Rate Alert Service
 * Handles creation, validation, and checking of rate alerts
 */

import { db } from '../db';
import { rateAlerts, exchangeRates, providers, rateTrends } from '../../shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import type { InsertRateAlert, RateAlert } from '../../shared/schema';

export interface CurrentRates {
  officialRate: number | null;
  bestProviderRate: number | null;
  bestProviderName: string | null;
}

export interface AlertValidationResult {
  isValid: boolean;
  error?: string;
  currentRates?: CurrentRates;
}

/**
 * Get current official rate from latest rate trends data (including daily increments)
 */
async function getOfficialRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  try {
    // Import the rate_trends table
    const { rateTrends } = await import('../../shared/schema');
    
    // Get the most recent rate from rate_trends (includes daily increments and alpha vantage data)
    const [latestRate] = await db
      .select()
      .from(rateTrends)
      .where(
        and(
          eq(rateTrends.from_currency, fromCurrency),
          eq(rateTrends.to_currency, toCurrency)
        )
      )
      .orderBy(desc(rateTrends.created_at))
      .limit(1);
    
    if (latestRate) {
      console.log(`Official rate for ${fromCurrency}/${toCurrency}:`, latestRate.rate, `(source: ${latestRate.source})`);
      return latestRate.rate;
    }
    
    console.log(`No official rate found for ${fromCurrency}/${toCurrency}`);
    return null;
  } catch (error) {
    console.error(`Error getting official rate for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

/**
 * Get current best provider rate using exact same logic as calculator
 */
async function getBestProviderRate(fromCurrency: string, toCurrency: string): Promise<{
  rate: number | null;
  providerName: string | null;
}> {
  try {
    // Import storage to use same method as calculator
    const { storage } = await import('../storage');
    
    // Get all active providers (same as calculator)
    const activeProviders = await storage.getActiveProviders();
    
    // Find the Sendwave provider ID to filter it out (same as calculator logic)
    const sendwaveProvider = activeProviders.find(p => p.name === 'Sendwave');
    const sendwaveId = sendwaveProvider ? sendwaveProvider.id : -1;
    
    // Get the latest rates using exact same method as calculator
    const latestRates = await storage.getLatestRates(fromCurrency, toCurrency);
    
    // Filter out Sendwave and any rate over 5000 (sanity check) - same as calculator
    const validRates = latestRates.filter(rate => 
      rate.provider_id !== sendwaveId && 
      rate.rate < 5000 && 
      rate.rate > 0
    );

    if (validRates.length > 0) {
      // Sort by rate (highest first) - same as calculator
      validRates.sort((a, b) => b.rate - a.rate);
      
      // Get the best rate
      const bestRate = validRates[0];
      
      // Find provider info
      const provider = activeProviders.find(p => p.id === bestRate.provider_id);
      
      return {
        rate: bestRate.rate,
        providerName: provider ? provider.name : 'Unknown',
      };
    }

    return { rate: null, providerName: null };
  } catch (error) {
    console.error(`Error getting best provider rate for ${fromCurrency}/${toCurrency}:`, error);
    return { rate: null, providerName: null };
  }
}

/**
 * Get current rates for a currency pair
 */
export async function getCurrentRates(
  fromCurrency: string,
  toCurrency: string
): Promise<CurrentRates> {
  const [officialRate, bestProvider] = await Promise.all([
    getOfficialRate(fromCurrency, toCurrency),
    getBestProviderRate(fromCurrency, toCurrency),
  ]);

  return {
    officialRate,
    bestProviderRate: bestProvider.rate,
    bestProviderName: bestProvider.providerName,
  };
}

/**
 * Validate alert parameters and calculate target threshold
 */
export async function validateAlert(
  fromCurrency: string,
  toCurrency: string,
  alertBasis: 'official' | 'best_provider',
  triggerType: 'absolute' | 'percentage',
  targetValue: number
): Promise<AlertValidationResult> {
  // Get current rates
  const currentRates = await getCurrentRates(fromCurrency, toCurrency);

  // Determine base rate based on alert basis
  const baseRate = alertBasis === 'official' 
    ? currentRates.officialRate 
    : currentRates.bestProviderRate;

  if (baseRate === null) {
    return {
      isValid: false,
      error: `No current ${alertBasis === 'official' ? 'official' : 'provider'} rate available for ${fromCurrency}/${toCurrency}`,
      currentRates,
    };
  }

  let calculatedTarget: number;

  if (triggerType === 'absolute') {
    calculatedTarget = targetValue;
  } else {
    // Percentage increase
    calculatedTarget = baseRate * (1 + targetValue / 100);
  }

  // Validate that target is greater than current rate
  if (calculatedTarget <= baseRate) {
    return {
      isValid: false,
      error: `Target rate (${calculatedTarget.toFixed(4)}) must be greater than current rate (${baseRate.toFixed(4)})`,
      currentRates,
    };
  }

  return {
    isValid: true,
    currentRates,
  };
}

/**
 * Create a new rate alert
 */
export async function createRateAlert(alertData: {
  email: string;
  fromCurrency: string;
  toCurrency: string;
  alertBasis: 'official' | 'best_provider';
  triggerType: 'absolute' | 'percentage';
  targetValue: number;
}): Promise<{ success: boolean; alertId?: number; error?: string }> {
  
  // Validate the alert first
  const validation = await validateAlert(
    alertData.fromCurrency,
    alertData.toCurrency,
    alertData.alertBasis,
    alertData.triggerType,
    alertData.targetValue
  );

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  // Get the current rate for storage
  const currentRate = alertData.alertBasis === 'official' 
    ? validation.currentRates!.officialRate!
    : validation.currentRates!.bestProviderRate!;

  try {
    // Check for existing alert with same exact target value
    const existingAlert = await db
      .select()
      .from(rateAlerts)
      .where(
        and(
          eq(rateAlerts.email, alertData.email),
          eq(rateAlerts.from_currency, alertData.fromCurrency),
          eq(rateAlerts.to_currency, alertData.toCurrency),
          eq(rateAlerts.alert_basis, alertData.alertBasis),
          eq(rateAlerts.trigger_type, alertData.triggerType),
          eq(rateAlerts.target_value, alertData.targetValue),
          eq(rateAlerts.alert_status, 'pending')
        )
      )
      .limit(1);

    if (existingAlert.length > 0) {
      return {
        success: false,
        error: 'You already have a pending alert with this exact target value',
      };
    }

    // Create the alert
    const newAlert = await db
      .insert(rateAlerts)
      .values({
        email: alertData.email,
        from_currency: alertData.fromCurrency,
        to_currency: alertData.toCurrency,
        alert_basis: alertData.alertBasis,
        trigger_type: alertData.triggerType,
        target_value: alertData.targetValue,
        current_rate_at_creation: currentRate,
        alert_status: 'pending',
      })
      .returning({ id: rateAlerts.id });

    console.log(`Created rate alert: ${alertData.email} for ${alertData.fromCurrency}/${alertData.toCurrency} at ${alertData.targetValue}`);

    return {
      success: true,
      alertId: newAlert[0].id,
    };

  } catch (error) {
    console.error('Error creating rate alert:', error);
    return {
      success: false,
      error: 'Failed to create rate alert. Please try again.',
    };
  }
}

/**
 * Get all pending alerts
 */
export async function getPendingAlerts(): Promise<RateAlert[]> {
  try {
    const alerts = await db
      .select()
      .from(rateAlerts)
      .where(eq(rateAlerts.alert_status, 'pending'));

    return alerts;
  } catch (error) {
    console.error('Error getting pending alerts:', error);
    return [];
  }
}

/**
 * Check if an alert should be triggered
 */
export async function checkAlertTrigger(alert: RateAlert): Promise<{
  shouldTrigger: boolean;
  currentRate: number | null;
  targetRate: number;
  providerName?: string;
}> {
  const currentRates = await getCurrentRates(alert.from_currency, alert.to_currency);
  
  const currentRate = alert.alert_basis === 'official' 
    ? currentRates.officialRate 
    : currentRates.bestProviderRate;

  if (currentRate === null) {
    return {
      shouldTrigger: false,
      currentRate: null,
      targetRate: 0,
    };
  }

  // Calculate target rate
  let targetRate: number;
  if (alert.trigger_type === 'absolute') {
    targetRate = alert.target_value;
  } else {
    // Percentage increase from creation rate
    targetRate = alert.current_rate_at_creation * (1 + alert.target_value / 100);
  }

  const shouldTrigger = currentRate >= targetRate;

  return {
    shouldTrigger,
    currentRate,
    targetRate,
    providerName: alert.alert_basis === 'best_provider' ? currentRates.bestProviderName || undefined : undefined,
  };
}

/**
 * Mark alert as triggered
 */
export async function markAlertTriggered(alertId: number): Promise<void> {
  try {
    await db
      .update(rateAlerts)
      .set({
        alert_status: 'triggered',
        triggered_at: new Date(),
      })
      .where(eq(rateAlerts.id, alertId));

    console.log(`Alert ${alertId} marked as triggered`);
  } catch (error) {
    console.error(`Error marking alert ${alertId} as triggered:`, error);
  }
}

/**
 * Get alerts for a specific email
 */
export async function getUserAlerts(email: string): Promise<RateAlert[]> {
  try {
    const alerts = await db
      .select()
      .from(rateAlerts)
      .where(eq(rateAlerts.email, email))
      .orderBy(desc(rateAlerts.created_at));

    return alerts;
  } catch (error) {
    console.error(`Error getting alerts for ${email}:`, error);
    return [];
  }
}

/**
 * Cancel an alert
 */
export async function cancelAlert(alertId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db
      .update(rateAlerts)
      .set({ alert_status: 'cancelled' })
      .where(
        and(
          eq(rateAlerts.id, alertId),
          eq(rateAlerts.alert_status, 'pending')
        )
      )
      .returning({ id: rateAlerts.id });

    if (result.length === 0) {
      return {
        success: false,
        error: 'Alert not found or already processed',
      };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error cancelling alert ${alertId}:`, error);
    return {
      success: false,
      error: 'Failed to cancel alert',
    };
  }
}