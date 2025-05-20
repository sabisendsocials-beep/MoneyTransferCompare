import { TransferResult } from "@shared/schema";
import { ExternalLink, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimpleComparisonCardProps {
  provider: TransferResult;
  index: number;
  fromCurrency: string;
  toCurrency: string;
}

export const SimpleComparisonCard = ({
  provider,
  index,
  fromCurrency,
  toCurrency,
}: SimpleComparisonCardProps) => {
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
        "bg-white rounded border shadow-sm overflow-hidden flex flex-col h-full",
        index === 0 ? "border-primary/30" : "border-gray-200"
      )}
    >
      {/* Provider Header */}
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        index === 0 ? "bg-primary/5" : ""
      )}>
        <div className="flex items-center">
          {/* Provider Logo */}
          <div className="w-10 h-10 mr-3 flex-shrink-0">
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
          
          {/* Provider Name */}
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
        
        {index === 0 && (
          <div className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-sm">
            Best Rate
          </div>
        )}
      </div>
      
      {/* Exchange Rate & Fee */}
      <div className="p-4 grid grid-cols-2 gap-4 text-center flex-grow">
        <div>
          <div className="text-xs text-gray-500 mb-1">FEE</div>
          <div className={cn(
            "font-medium text-lg",
            hasFreeTransfer ? "text-green-600" : ""
          )}>
            {hasFreeTransfer ? "NONE" : formatCurrency(provider.fee, fromCurrency)}
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500 mb-1">EXCHANGE RATE</div>
          <div className="font-medium text-lg">{formatRate(normalizedRate)}</div>
        </div>
      </div>
      
      {/* Amount Received & Time */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-gray-500">YOU RECEIVE</div>
          {provider.transferTime && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              <span>{provider.transferTime}</span>
            </div>
          )}
        </div>
        <div className="text-xl font-bold text-primary mb-4 text-center">
          {formatCurrency(normalizedReceivedAmount, toCurrency)}
        </div>
        
        {/* Action Button */}
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
  );
};