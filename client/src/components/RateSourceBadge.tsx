import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Globe, ShieldCheck } from 'lucide-react';

export type RateSource = 'api' | 'scraping' | 'screenshot' | 'unavailable';

interface RateSourceBadgeProps {
  source: RateSource;
  className?: string;
}

/**
 * Displays a badge indicating the source of an exchange rate
 * This helps users understand which rates are most accurate
 */
export function RateSourceBadge({ source, className = '' }: RateSourceBadgeProps) {
  // Define badge styles and content based on source
  switch (source) {
    case 'api':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 ${className}`}
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                API Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">This rate comes directly from the provider's official API</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      
    case 'screenshot':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 ${className}`}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">This rate has been verified with the provider's website</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      
    case 'scraping':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 ${className}`}
              >
                <Globe className="h-3 w-3 mr-1" />
                Web Sourced
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">This rate was collected from the provider's website</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      
    case 'unavailable':
    default:
      return null;
  }
}