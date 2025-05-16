import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle2, Globe, ShieldCheck } from 'lucide-react';
import { useRateSource, RateSource } from '@/hooks/useRateSource';

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

  // Fetch the rate source information
  const { data: rateSourceData } = useRateSource(providerId, fromCurrency, toCurrency);
  const rateSource = rateSourceData?.source || 'unavailable';

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

  // Get appropriate icon based on rate source
  const getSourceIcon = (source: RateSource) => {
    switch (source) {
      case 'api':
        return <ShieldCheck size={12} className="text-green-500" />;
      case 'screenshot':
        return <CheckCircle2 size={12} className="text-blue-500" />;
      case 'scraping':
        return <Globe size={12} />;
      default:
        return <Clock size={12} />;
    }
  };

  // Get appropriate tooltip content based on rate source
  const getSourceTooltip = (source: RateSource) => {
    switch (source) {
      case 'api':
        return "This rate comes directly from the provider's official API";
      case 'screenshot':
        return "This rate has been verified with the provider's website";
      case 'scraping':
        return "This rate was collected from the provider's website";
      default:
        return "Rate information source is unavailable";
    }
  };

  // Get appropriate CSS class based on rate source
  const getSourceClass = (source: RateSource) => {
    switch (source) {
      case 'api':
        return 'text-green-600';
      case 'screenshot':
        return 'text-blue-600';
      case 'scraping':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-xs ${getSourceClass(rateSource)} flex items-center gap-1 cursor-help`}>
              {getSourceIcon(rateSource)}
              {rateSource === 'api' ? 'API Verified Rate' : 
                rateSource === 'screenshot' ? 'Verified Rate' : 
                'Web Sourced Rate'}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getSourceTooltip(rateSource)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
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
    </div>
  );
}