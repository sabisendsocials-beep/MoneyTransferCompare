/**
 * Rate Bridge Service
 *
 * Fetches provider rates from an external rate bridge API.
 * This is used as an automated collection path, sitting above
 * manual entry in the priority order: API > Bridge > Manual > Scraper
 */

import { storage } from '../storage';
import { RateSourceType, InsertExchangeRate } from '@shared/schema';

const BRIDGE_BASE_URL = 'https://rates.sabisendrates.com';

export interface BridgeRateResult {
  provider: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  observedAt: string;
  status: string;
  extractionMode: string;
  source: 'rate-bridge';
  savedToDb: boolean;
  dbRecordId?: number;
  error?: string;
}

/**
 * Fetch a rate from the external bridge API and normalise it
 * into the app-side format.
 */
export async function fetchBridgeRate(
  provider: string,
  fromCurrency: string,
  toCurrency: string
): Promise<BridgeRateResult | null> {
  const url = `${BRIDGE_BASE_URL}/rates/latest?provider=${encodeURIComponent(provider)}&from=${fromCurrency}&to=${toCurrency}`;

  try {
    console.log(`[RateBridge] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error(`[RateBridge] HTTP ${response.status} for ${provider} ${fromCurrency}->${toCurrency}`);
      return null;
    }

    const json = await response.json() as {
      success: boolean;
      rate?: {
        provider: string;
        fromCurrency: string;
        toCurrency: string;
        rate: number;
        status: string;
        observedAt: string;
        extractionMode: string;
        errorMessage: string | null;
      };
    };

    if (!json.success || !json.rate) {
      console.error(`[RateBridge] Unsuccessful response for ${provider}:`, json);
      return null;
    }

    const r = json.rate;

    if (!r.rate || r.rate <= 0) {
      console.error(`[RateBridge] Invalid rate value: ${r.rate}`);
      return null;
    }

    return {
      provider: r.provider,
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      rate: r.rate,
      observedAt: r.observedAt,
      status: r.status,
      extractionMode: r.extractionMode,
      source: 'rate-bridge',
      savedToDb: false
    };
  } catch (err: any) {
    console.error(`[RateBridge] Fetch error for ${provider} ${fromCurrency}->${toCurrency}:`, err.message);
    return null;
  }
}

/**
 * Fetch a rate from the bridge and persist it to the database
 * as an API-sourced rate (highest priority tier).
 */
export async function fetchAndSaveBridgeRate(
  providerName: string,
  fromCurrency: string,
  toCurrency: string
): Promise<BridgeRateResult | null> {
  const bridgeRate = await fetchBridgeRate(providerName, fromCurrency, toCurrency);

  if (!bridgeRate) {
    return null;
  }

  try {
    const providers = await storage.getProviders();
    const dbProvider = providers.find(
      p => p.name.toLowerCase() === providerName.toLowerCase()
    );

    if (!dbProvider) {
      console.error(`[RateBridge] Provider not found in DB: ${providerName}`);
      bridgeRate.savedToDb = false;
      return bridgeRate;
    }

    const record: InsertExchangeRate = {
      provider_id: dbProvider.id,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: bridgeRate.rate,
      source: RateSourceType.API,
      source_url: BRIDGE_BASE_URL,
      verified: true
    };

    const saved = await storage.createExchangeRate(record);

    console.log(
      `[RateBridge] Saved rate ${bridgeRate.rate} for ${providerName} ${fromCurrency}->${toCurrency} (DB id: ${saved.id})`
    );

    bridgeRate.savedToDb = true;
    bridgeRate.dbRecordId = saved.id;

    // Mark provider as recently collected
    await storage.updateProvider(dbProvider.id, {
      last_successful_collection: new Date()
    });

    return bridgeRate;
  } catch (err: any) {
    console.error(`[RateBridge] DB save error:`, err.message);
    bridgeRate.savedToDb = false;
    bridgeRate.error = err.message;
    return bridgeRate;
  }
}
