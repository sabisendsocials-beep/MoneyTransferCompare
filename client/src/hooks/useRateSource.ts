import { useQuery } from '@tanstack/react-query';

export type RateSource = 'api' | 'screenshot' | 'scraping' | 'unavailable';

export interface RateSourceData {
  providerId: number;
  providerName: string;
  fromCurrency: string;
  toCurrency: string;
  source: RateSource;
  timestamp: string;
}

/**
 * Custom hook to get the source of a provider's exchange rate
 * Returns information about where the rate comes from (API, screenshot, or web scraping)
 */
export function useRateSource(
  providerId?: number,
  fromCurrency: string = 'GBP',
  toCurrency: string = 'NGN'
) {
  return useQuery<RateSourceData>({
    queryKey: ['/api/rate-source', providerId, fromCurrency, toCurrency],
    enabled: !!providerId && !!fromCurrency && !!toCurrency,
  });
}