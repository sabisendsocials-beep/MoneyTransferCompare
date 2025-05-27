/**
 * Rate Collection Scheduler
 * COMPLETELY DISABLED: All automatic rate collection and provider enforcement removed to give admin panel full control
 */

import { storage } from '../storage';

const log = console.log;

/**
 * DISABLED: All rate collection removed - admin panel has full control
 */
export async function collectAllRates(): Promise<boolean> {
  log('✓ Rate collection disabled - admin panel has full control');
  return true;
}

/**
 * DISABLED: API collection removed - admin panel has full control
 */
async function collectFromAPIs(): Promise<void> {
  log('✓ API collection disabled - admin panel has full control');
}

/**
 * DISABLED: Scraper collection removed - admin panel has full control
 */
async function collectFromScrapers(): Promise<void> {
  log('✓ Scraper collection disabled - admin panel has full control');
}

/**
 * DISABLED: Wise enforcement removed - admin panel has full control
 */
async function fixWiseRateSource(): Promise<void> {
  log('✓ Wise enforcement disabled - admin panel has full control');
}

/**
 * DISABLED: All scheduling removed - admin panel has full control
 */
export function startScheduledCollection(): void {
  log('✓ Scheduled collection disabled - admin panel has full control');
}

/**
 * DISABLED: All scheduling removed - admin panel has full control
 */
export function stopScheduledCollection(): void {
  log('✓ Scheduled collection disabled - admin panel has full control');
}