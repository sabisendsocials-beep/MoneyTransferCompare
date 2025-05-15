import React from 'react';
import { Badge } from '@/components/ui/badge';
import { LastUpdated } from './LastUpdated';
import { ExternalLink } from 'lucide-react';

interface ProviderBadgeProps {
  provider: {
    id: number;
    name: string;
    website_url?: string | null;
    logo?: string | null;
  };
  showLastUpdated?: boolean;
  fromCurrency?: string;
  toCurrency?: string;
}

export function ProviderBadge({
  provider,
  showLastUpdated = true,
  fromCurrency = 'GBP',
  toCurrency = 'NGN'
}: ProviderBadgeProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className="flex items-center gap-1.5 py-1 border-primary/20 bg-primary/5"
        >
          {provider.logo && (
            <img 
              src={provider.logo} 
              alt={`${provider.name} logo`} 
              className="w-4 h-4 object-contain" 
            />
          )}
          <span>{provider.name}</span>
          
          {provider.website_url && (
            <a 
              href={provider.website_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </Badge>
      </div>
      
      {showLastUpdated && (
        <div className="mt-1">
          <LastUpdated 
            providerId={provider.id} 
            fromCurrency={fromCurrency} 
            toCurrency={toCurrency} 
          />
        </div>
      )}
    </div>
  );
}