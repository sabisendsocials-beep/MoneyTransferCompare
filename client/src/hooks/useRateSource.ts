import { useQuery } from '@tanstack/react-query';
import { RateSource } from '../components/RateSourceBadge';

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
 * 
 * For now, this uses a simple provider-based logic until the API route is fully implemented
 */
export function useRateSource(
  providerId?: number,
  fromCurrency: string = 'GBP',
  toCurrency: string = 'NGN'
) {
  // Simplified implementation that doesn't rely on API request
  // This allows the app to run while we finish implementing the server-side
  const getMockSourceData = (): RateSourceData => {
    let source: RateSource = 'scraping';
    let providerName = 'Unknown';
    
    // Provider IDs are based on their order in the database
    switch (providerId) {
      case 1:
        source = 'api';
        providerName = 'Wise';
        break;
      case 2:
      case 3:
      case 5:
      case 8:
        source = 'screenshot';
        providerName = ['WorldRemit', 'MoneyGram', 'Western Union', 'Nala'][providerId - 2];
        break;
      default:
        source = 'scraping';
        providerName = 'Provider';
    }
    
    return {
      providerId: providerId || 0,
      providerName,
      fromCurrency,
      toCurrency,
      source,
      timestamp: new Date().toISOString()
    };
  };
  
  // We'll still try to use the API, but fall back to our local logic if it's not ready
  return useQuery<RateSourceData>({
    queryKey: ['/api/rate-source', providerId, fromCurrency, toCurrency],
    enabled: !!providerId && !!fromCurrency && !!toCurrency,
    initialData: getMockSourceData,
  });
}