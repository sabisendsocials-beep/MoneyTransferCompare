import React from 'react';
import { ShieldCheck, CheckCircle2, Globe, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Define rate source types directly in this component for simplicity
export type RateSource = 'api' | 'screenshot' | 'scraping' | 'unavailable';

interface RateSourceBadgeProps {
  source: RateSource;
  className?: string;
  showLabel?: boolean;
}

/**
 * Displays a visual indicator showing where the exchange rate data comes from
 * Color coded: green for API, blue for screenshot-verified, gray for web scraping
 */
export function RateSourceBadge({ source, className, showLabel = true }: RateSourceBadgeProps) {
  // Get appropriate icon based on rate source
  const getSourceIcon = () => {
    switch (source) {
      case 'api':
        return <ShieldCheck className="h-3.5 w-3.5" />;
      case 'screenshot':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'scraping':
        return <Globe className="h-3.5 w-3.5" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5" />;
    }
  };

  // Get appropriate label text based on rate source
  const getSourceLabel = () => {
    switch (source) {
      case 'api':
        return 'API Verified';
      case 'screenshot':
        return 'Verified';
      case 'scraping':
        return 'Web Sourced';
      default:
        return 'Unknown Source';
    }
  };

  // Get appropriate tooltip text based on rate source
  const getSourceTooltip = () => {
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

  // Get appropriate CSS classes based on rate source
  const getBadgeClasses = () => {
    switch (source) {
      case 'api':
        return 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50';
      case 'screenshot':
        return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50';
      case 'scraping':
        return 'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800/50';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800/50';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
            getBadgeClasses(),
            className
          )}>
            {getSourceIcon()}
            {showLabel && getSourceLabel()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{getSourceTooltip()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}