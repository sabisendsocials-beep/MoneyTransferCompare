/**
 * Bridge Sync Service
 *
 * Fetches all provider rates for all supported corridors from the
 * rate bridge in bulk, using /comparison/latest (one call per corridor).
 * Saves results as API-sourced, verified rates — highest priority tier.
 *
 * Bridge corridors available:
 *   GBP: NGN, GHS, KES, INR, PKR  (5)
 *   EUR: NGN, GHS, KES, INR, PKR  (5)
 *   USD: GHS, INR, PKR             (3)
 *   Total: 13 corridors
 */

import { db } from '../db';
import { exchangeRates, providers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { RateSourceType } from '@shared/schema';

const BRIDGE_BASE_URL = 'https://rates.sabisendrates.com';

const BRIDGE_CORRIDORS = [
  { from: 'GBP', to: 'NGN' },
  { from: 'GBP', to: 'GHS' },
  { from: 'GBP', to: 'KES' },
  { from: 'GBP', to: 'INR' },
  { from: 'GBP', to: 'PKR' },
  { from: 'EUR', to: 'NGN' },
  { from: 'EUR', to: 'GHS' },
  { from: 'EUR', to: 'KES' },
  { from: 'EUR', to: 'INR' },
  { from: 'EUR', to: 'PKR' },
  { from: 'USD', to: 'NGN' },
  { from: 'USD', to: 'GHS' },
  { from: 'USD', to: 'KES' },
  { from: 'USD', to: 'INR' },
  { from: 'USD', to: 'PKR' },
];

interface BridgeComparisonRate {
  provider: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  collectedAt: string;
  status: string;
  source: string;
  fresh: boolean;
}

interface SyncResult {
  corridor: string;
  saved: number;
  skipped: number;
  errors: string[];
}

interface FullSyncReport {
  success: boolean;
  startedAt: string;
  completedAt: string;
  corridorsAttempted: number;
  corridorsSucceeded: number;
  totalSaved: number;
  totalSkipped: number;
  results: SyncResult[];
}

/**
 * Fetch all provider rates for a single corridor from the bridge.
 */
async function fetchCorridorRates(
  from: string,
  to: string
): Promise<BridgeComparisonRate[]> {
  const url = `${BRIDGE_BASE_URL}/comparison/latest?from=${from}&to=${to}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${from}->${to}`);
  }

  const json = await response.json() as {
    success: boolean;
    count: number;
    rates: BridgeComparisonRate[];
  };

  if (!json.success) throw new Error(`Bridge returned success=false for ${from}->${to}`);
  return json.rates || [];
}

/**
 * Load all providers from DB once and return a name→id map.
 * Bridge provider names are lowercase; DB names may differ slightly.
 */
async function buildProviderMap(): Promise<Map<string, number>> {
  const rows = await db.select({ id: providers.id, name: providers.name }).from(providers);
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.name.toLowerCase().replace(/\s+/g, ''), row.id);
    map.set(row.name.toLowerCase(), row.id);
  }
  // Manual aliases for common mismatches between bridge names and DB names
  const aliases: Record<string, string> = {
    'westernunion': 'western union',
    'taptapsend': 'taptap send',
    'worldremit': 'worldremit',
    'transfergo': 'transfergo',
    'remitly': 'remitly',
    'wise': 'wise',
    'lemfi': 'lemfi',
    'xoom': 'xoom (paypal)',
    'monieworld': 'monieworld',
    'nala': 'nala',
    'sendwave': 'sendwave',
    'yousend': 'yousend',
  };
  for (const [bridgeName, dbName] of Object.entries(aliases)) {
    const id = map.get(dbName);
    if (id) map.set(bridgeName, id);
  }
  return map;
}

/**
 * Save a single bridge rate to the database.
 * Returns true if saved, false if skipped (no provider match or invalid rate).
 */
async function saveBridgeRate(
  rate: BridgeComparisonRate,
  providerMap: Map<string, number>
): Promise<{ saved: boolean; reason?: string }> {
  if (!rate.exchangeRate || rate.exchangeRate <= 0) {
    return { saved: false, reason: `Invalid rate: ${rate.exchangeRate}` };
  }
  if (rate.status !== 'success') {
    return { saved: false, reason: `Non-success status: ${rate.status}` };
  }

  const providerId = providerMap.get(rate.provider.toLowerCase().replace(/\s+/g, ''))
    || providerMap.get(rate.provider.toLowerCase());

  if (!providerId) {
    return { saved: false, reason: `No DB match for provider: ${rate.provider}` };
  }

  await db.insert(exchangeRates).values({
    provider_id: providerId,
    from_currency: rate.fromCurrency,
    to_currency: rate.toCurrency,
    rate: rate.exchangeRate,
    source: RateSourceType.API,
    source_url: BRIDGE_BASE_URL,
    verified: true,
    timestamp: new Date(),
  });

  return { saved: true };
}

/**
 * Run a full sync across all 13 bridge-supported corridors.
 * Fetches all providers per corridor in a single API call each.
 */
export async function runFullBridgeSync(): Promise<FullSyncReport> {
  const startedAt = new Date().toISOString();
  console.log('[BridgeSync] Starting full sync across', BRIDGE_CORRIDORS.length, 'corridors...');

  const providerMap = await buildProviderMap();
  const results: SyncResult[] = [];
  let corridorsSucceeded = 0;

  for (const { from, to } of BRIDGE_CORRIDORS) {
    const corridor = `${from}->${to}`;
    const result: SyncResult = { corridor, saved: 0, skipped: 0, errors: [] };

    try {
      const rates = await fetchCorridorRates(from, to);

      if (rates.length === 0) {
        result.errors.push('No rates returned from bridge');
        results.push(result);
        continue;
      }

      for (const rate of rates) {
        try {
          const { saved, reason } = await saveBridgeRate(rate, providerMap);
          if (saved) {
            result.saved++;
          } else {
            result.skipped++;
            if (reason) result.errors.push(`${rate.provider}: ${reason}`);
          }
        } catch (err: any) {
          result.errors.push(`${rate.provider}: ${err.message}`);
        }
      }

      corridorsSucceeded++;
      console.log(`[BridgeSync] ${corridor}: saved ${result.saved}, skipped ${result.skipped}`);
    } catch (err: any) {
      result.errors.push(err.message);
      console.error(`[BridgeSync] Failed ${corridor}:`, err.message);
    }

    results.push(result);
  }

  const totalSaved = results.reduce((s, r) => s + r.saved, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
  const completedAt = new Date().toISOString();

  console.log(`[BridgeSync] Complete — saved ${totalSaved} rates across ${corridorsSucceeded}/${BRIDGE_CORRIDORS.length} corridors`);

  return {
    success: corridorsSucceeded > 0,
    startedAt,
    completedAt,
    corridorsAttempted: BRIDGE_CORRIDORS.length,
    corridorsSucceeded,
    totalSaved,
    totalSkipped,
    results,
  };
}

/**
 * Start the auto-sync scheduler.
 * Runs immediately on startup, then every hour.
 */
export function startBridgeSyncScheduler(): void {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  // Run immediately (with short delay to let the app fully boot)
  setTimeout(async () => {
    console.log('[BridgeSync] Running initial sync on startup...');
    try {
      const report = await runFullBridgeSync();
      console.log(`[BridgeSync] Startup sync done — ${report.totalSaved} rates saved`);
    } catch (err: any) {
      console.error('[BridgeSync] Startup sync failed:', err.message);
    }
  }, 10000);

  // Then repeat every 6 hours
  setInterval(async () => {
    console.log('[BridgeSync] Running scheduled sync...');
    try {
      const report = await runFullBridgeSync();
      console.log(`[BridgeSync] Scheduled sync done — ${report.totalSaved} rates saved`);
    } catch (err: any) {
      console.error('[BridgeSync] Scheduled sync failed:', err.message);
    }
  }, INTERVAL_MS);

  console.log('[BridgeSync] Scheduler started — syncing every 6 hours');
}
