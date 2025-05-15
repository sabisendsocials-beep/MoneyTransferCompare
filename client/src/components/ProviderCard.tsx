import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProviderBadge } from './ProviderBadge';
import { Clock, ExternalLink, Info, ShieldCheck, CheckCircle, BadgeCheck } from 'lucide-react';
import { TransferResult } from '@shared/schema';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProviderCardProps {
  result: TransferResult;
  fromCurrency: string;
  toCurrency: string;
  isBest?: boolean;
  savings?: number;
}

export function ProviderCard({ 
  result, 
  fromCurrency, 
  toCurrency,
  isBest = false,
  savings = 0
}: ProviderCardProps) {
  
  const formatCurrency = (value: number, currency: string) => {
    const formatter = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'NGN' ? 0 : 2,
      maximumFractionDigits: currency === 'NGN' ? 0 : 2,
    });
    return formatter.format(value);
  };
  
  return (
    <Card className={`overflow-hidden ${isBest ? 'border-green-500 shadow-green-200 dark:shadow-green-900/20 shadow-md' : ''} relative`}>
      {isBest && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 rounded-bl-lg text-xs font-semibold">
          Best deal
        </div>
      )}
      {isBest && (
        <div className="px-6 py-4 bg-green-500 text-white flex items-center">
          <div className="rounded-full bg-white p-1 mr-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <span className="font-medium">Best Value Provider</span>
          <div className="ml-auto text-sm font-medium">
            Save up to {formatCurrency(savings, toCurrency)}
          </div>
        </div>
      )}
      
      <CardContent className={`p-6 ${!isBest ? 'pt-6' : ''}`}>
        <div className="flex flex-col space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <ProviderBadge 
                provider={{
                  id: result.providerId,
                  name: result.providerName,
                  website_url: result.websiteUrl,
                  logo: result.providerLogo
                }}
                fromCurrency={fromCurrency}
                toCurrency={toCurrency}
              />
            </div>
            <div className="flex flex-col items-end">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(result.receivedAmount, toCurrency)}
              </div>
              <div className="text-sm text-muted-foreground">
                Recipient gets
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <ShieldCheck className="mr-1 h-3 w-3" /> Regulated
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <Clock className="mr-1 h-3 w-3" /> {result.transferTime}
            </Badge>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
              <BadgeCheck className="mr-1 h-3 w-3" /> Verified
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="text-sm text-muted-foreground">Exchange Rate</div>
              <div className="font-medium">
                1 {fromCurrency} = {result.exchangeRate.toFixed(2)} {toCurrency}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Fee</div>
              <div className="font-medium">
                {formatCurrency(result.fee, fromCurrency)}
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              size="lg"
              onClick={() => {
                if (typeof result.websiteUrl === 'string') {
                  window.open(result.websiteUrl, '_blank')
                }
              }}
            >
              Transfer with {result.providerName} <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}