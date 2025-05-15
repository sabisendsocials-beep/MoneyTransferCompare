import { useQuery } from '@tanstack/react-query';

export interface ExchangeRate {
  id: number;
  provider_id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  timestamp: string;
}

export function useExchangeRates(fromCurrency = 'GBP', toCurrency = 'NGN') {
  return useQuery<ExchangeRate[]>({
    queryKey: ['/api/rates', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await fetch(`/api/rates?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`);
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      return response.json();
    },
    refetchInterval: 1000 * 60 * 15, // Refetch every 15 minutes
    staleTime: 1000 * 60 * 5,        // Consider data stale after 5 minutes
  });
}

export function useRateStats(fromCurrency = 'GBP', toCurrency = 'NGN') {
  return useQuery({
    queryKey: ['/api/rate-stats', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await fetch(`/api/rate-stats?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`);
      if (!response.ok) {
        throw new Error('Failed to fetch rate statistics');
      }
      return response.json();
    }
  });
}

export function getRateAge(timestamp: string): string {
  const now = new Date();
  const rateDate = new Date(timestamp);
  const diffMs = now.getTime() - rateDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) {
    return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
  } else if (diffMins < 60 * 24) {
    const hours = Math.floor(diffMins / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else {
    const days = Math.floor(diffMins / (60 * 24));
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }
}