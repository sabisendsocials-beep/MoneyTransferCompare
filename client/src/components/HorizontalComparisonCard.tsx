import { TransferResult } from "@shared/schema";
import { ExternalLink, Clock, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HorizontalComparisonCardProps {
  provider: TransferResult;
  index: number;
  fromCurrency: string;
  toCurrency: string;
}

export const HorizontalComparisonCard = ({
  provider,
  index,
  fromCurrency,
  toCurrency,
}: HorizontalComparisonCardProps) => {
  // Format currency with proper formatting
  const formatCurrency = (value: number, currency: string) => {
    const formatter = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'NGN' ? 0 : 2,
      maximumFractionDigits: currency === 'NGN' ? 0 : 2,
    });
    return formatter.format(value);
  };
  
  // Format rate with 4 decimal places
  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(rate);
  };
  
  // Normalize Sendwave's abnormal rate (20000 -> 2000)
  const normalizedRate = provider.providerName === "Sendwave" && provider.exchangeRate > 5000 
    ? provider.exchangeRate / 10 
    : provider.exchangeRate;
  
  // Fix the received amount for Sendwave if we adjusted the rate
  const normalizedReceivedAmount = provider.providerName === "Sendwave" && provider.exchangeRate > 5000
    ? provider.receivedAmount / 10
    : provider.receivedAmount;
    
  // Determine if the provider has no fees
  const hasFreeTransfer = provider.fee === 0;
  
  return (
    <div 
      className={cn(
        "bg-white rounded-lg border shadow-sm overflow-hidden mb-3",
        index === 0 ? "border-primary/30" : "border-gray-200"
      )}
    >
      <div className="flex flex-col md:flex-row">
        {/* Provider Info Column */}
        <div className={cn(
          "p-4 flex items-center md:w-1/4 lg:w-1/5 border-b md:border-b-0 md:border-r",
          index === 0 ? "bg-primary/5" : ""
        )}>
          {/* Rank Badge (only for mobile) */}
          <div className="md:hidden w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2 flex-shrink-0">
            <span className="text-xs font-medium text-gray-700">{index + 1}</span>
          </div>
          
          {/* Desktop Rank Column */}
          <div className="hidden md:flex flex-col items-center mr-3 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              {index === 0 ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <span className="text-xs font-medium text-gray-700">{index + 1}</span>
              )}
            </div>
          </div>
          
          {/* Provider Logo and Name */}
          <div className="flex items-center">
            <div className="w-9 h-9 mr-3 flex-shrink-0">
              {provider.providerLogo ? (
                <img 
                  src={provider.providerLogo} 
                  alt={`${provider.providerName} logo`} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 font-bold">{provider.providerName.substring(0, 2)}</span>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-medium">{provider.providerName}</h3>
              {provider.rating && (
                <div className="flex items-center text-xs text-gray-500">
                  <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
                  <span>{provider.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Best Provider Badge (visible only on mobile) */}
          {index === 0 && (
            <div className="ml-auto md:hidden text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-sm">
              Best
            </div>
          )}
        </div>
        
        {/* Amount, Rate & Results Column */}
        <div className="p-4 flex items-center justify-between md:w-1/2 lg:w-3/5 border-b md:border-b-0 md:border-r">
          <div className="flex flex-col items-start">
            <div className="text-xs text-gray-500 mb-1">YOU SEND</div>
            <div className="font-medium">
              {formatCurrency(provider.sendAmount, fromCurrency)}
            </div>
            {provider.fee > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Fee: {formatCurrency(provider.fee, fromCurrency)}
              </div>
            )}
            {provider.transferTime && (
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <Clock className="w-3 h-3 mr-1" />
                <span>{provider.transferTime}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-start">
            <div className="text-xs text-gray-500 mb-1">EXCHANGE RATE</div>
            <div className="font-medium">
              {formatRate(normalizedRate)}
            </div>
            {provider.rating && (
              <div className="flex items-center text-xs text-yellow-500 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i}
                    className={`w-3 h-3 ${i < Math.floor(provider.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-500 mb-1">THEY RECEIVE</div>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(normalizedReceivedAmount, toCurrency)}
            </div>
            {/* Best Rate Badge (desktop only) */}
            {index === 0 && (
              <div className="hidden md:block text-xs text-green-600 mt-1">
                Best value
              </div>
            )}
          </div>
        </div>
        
        {/* Action Column */}
        <div className="p-4 flex items-center justify-center md:w-1/4 lg:w-1/5">
          {provider.websiteUrl ? (
            <Button
              className="w-full"
              onClick={() => window.open(provider.websiteUrl as string, '_blank')}
            >
              Send Money
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => window.open(`https://www.google.com/search?q=${provider.providerName}+money+transfer`, '_blank')}
            >
              Visit Provider
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};