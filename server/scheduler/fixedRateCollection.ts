/**
 * Fixed Rate Collection Scheduler
 * DISABLED: All automatic provider enforcement removed to give admin panel full control
 */

import { storage } from '../storage';

const log = console.log;

// Track providers collected via API to avoid duplicate processing
const providersCollectedViaAPI = new Set<number>();

/**
 * Collect rates from direct provider APIs
 * DISABLED: Removed all hardcoded Wise enforcement
 */
async function collectFromAPIs(): Promise<void> {
  try {
    log('API collection disabled - admin panel has full control over provider settings');
  } catch (error) {
    log(`Error in API rate collection: ${error}`);
  }
}

/**
 * Setup schedules only - no immediate execution
 */
export function setupSchedulesOnly(): void {
  log('Rate collection scheduler setup - admin panel has full provider control');
}

/**
 * Main rate collection function
 * DISABLED: Removed all automatic enforcement
 */
export async function collectAllRates(): Promise<void> {
  log('Rate collection deferred - admin panel controls all provider settings');
}