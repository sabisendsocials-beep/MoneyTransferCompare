import { useQuery } from '@tanstack/react-query';

export type RateSource = 'api' | 'scraping' | 'screenshot' | 'unavailable';

export interface RateSourceData {
  providerId: number;
  providerName: string;
  fromCurrency: string;
  toCurrency: string;
  source: RateSource;
  timestamp: string;
}

/**
 * Custom hook to fetch the source of a provider's exchange rate
 * This helps identify if rates come from API, scraping, or screenshot verification
 */
export function useRateSource(
  providerId?: number, 
  fromCurrency: string = 'GBP',
  toCurrency: string = 'NGN'
) {
  return useQuery<RateSourceData>({
    queryKey: ['/api/rate-source', providerId, fromCurrency, toCurrency],
    enabled: !!providerId,
  });
}

/**
 * Custom hook to fetch all rate sources
 */
export function useAllRateSources() {
  return useQuery<RateSourceData[]>({
    queryKey: ['/api/rate-sources'],
  });
}