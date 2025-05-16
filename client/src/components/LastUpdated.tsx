import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';

interface ExchangeRate {
  id: number;
  provider_id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  timestamp: string;
}

interface LastUpdatedProps {
  providerId?: number;
  fromCurrency?: string;
  toCurrency?: string;
}

export function LastUpdated({ 
  providerId, 
  fromCurrency = 'GBP', 
  toCurrency = 'NGN' 
}: LastUpdatedProps) {
  // Fetch the latest rates to get timestamp
  const { data, isLoading } = useQuery<ExchangeRate[]>({
    queryKey: ['/api/rates', fromCurrency, toCurrency, providerId],
    enabled: !!fromCurrency && !!toCurrency
  });

  // If it's for a specific provider, find that provider's rate
  const rate = data && data.length > 0 ? (
    providerId 
      ? data.find((r) => r.provider_id === providerId)
      : data[0]
  ) : undefined;

  const timestamp = rate?.timestamp;

  if (isLoading) {
    return <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Clock size={12} /> Loading...
    </span>;
  }

  if (!timestamp) {
    return <span className="text-xs text-amber-600 flex items-center gap-1">
      <Clock size={12} /> Rate not available from provider
    </span>;
  }

  const date = new Date(timestamp);
  const relativeTime = formatDistanceToNow(date, { addSuffix: true });
  const exactTime = format(date, 'MMM d, yyyy h:mm a');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
            <Clock size={12} /> Updated {relativeTime}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Last updated at: {exactTime}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}