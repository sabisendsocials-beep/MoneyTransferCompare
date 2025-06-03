import { TransferResult } from "@shared/schema";
import { ExternalLink, Clock, Star, Check, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackProviderClick } from "./analytics/EventTracking";

interface HorizontalComparisonCardProps {
  provider: TransferResult;
  index: number;
  fromCurrency: string;
  toCurrency: string;
  bestRateAmount?: number;
  calculationMode?: string;
}

export const HorizontalComparisonCard = ({
  provider,
  index,
  fromCurrency,
  toCurrency,
  bestRateAmount,
  calculationMode
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
  
  // Format the timestamp in a simple way
  const formatTimeStamp = (date: string) => {
    if (!date) return "";
    const updateTime = new Date(date);
    return updateTime.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate difference from best rate
  const calculateDifference = () => {
    if (!bestRateAmount || index === 0) return null;
    
    const difference = bestRateAmount - normalizedReceivedAmount;
    return {
      amount: difference,
      percentage: (difference / bestRateAmount) * 100
    };
  };
  
  const difference = calculateDifference();

  // Format ratings as stars (simplified)
  const renderRating = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
      </div>
    );
  };
  
  return (
    <div 
      className={cn(
        "bg-white border overflow-hidden mb-4 rounded-lg transition-all duration-200",
        index === 0 
          ? "border-primary/50 shadow-md" 
          : "border-gray-200 hover:shadow-sm hover:border-gray-300"
      )}
    >
      <div className="flex flex-col md:flex-row">
        {/* Provider Column */}
        <div className="flex items-center py-4 px-5 md:w-1/3 border-b md:border-b-0 md:border-r relative">
          {/* Rank Badge */}
          <div className="mr-3 flex-shrink-0">
            {index === 0 ? (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-700 font-medium">{index + 1}</span>
              </div>
            )}
          </div>
          
          {/* Provider Info */}
          <div className="flex-1">
            <div className="flex items-center">
              {provider.providerLogo && (
                <img 
                  src={provider.providerLogo} 
                  alt={`${provider.providerName} logo`} 
                  className="w-12 h-12 mr-3 object-contain"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg">{provider.providerName}</h3>
                <div className="flex items-center mt-1 space-x-3">
                  {provider.rating && renderRating(provider.rating)}
                  
                  {provider.transferTime && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{provider.transferTime}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Badge for best rate */}
          {index === 0 && (
            <div className="absolute top-2 right-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
              Best rate
            </div>
          )}
        </div>
        
        {/* Fee & Exchange Rate Column */}
        <div className="p-4 md:w-2/5 border-b md:border-b-0 md:border-r">
          <div className="text-xs text-gray-500 uppercase mb-2">FEE & EXCHANGE RATE</div>
          
          <div className="text-lg font-medium mb-1">
            {normalizedRate.toFixed(4)}
          </div>
          
          {provider.comment && (
            <div className="text-sm mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
              {provider.comment}
            </div>
          )}
          
          <div className="flex justify-between items-center text-xs text-gray-500 mt-1.5">
            <div>
              Fee: {hasFreeTransfer ? formatCurrency(0, fromCurrency) : formatCurrency(provider.fee, fromCurrency)}
            </div>
            
            {provider.lastUpdated && (
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1 text-gray-400" />
                <span>Rate updated at {formatTimeStamp(provider.lastUpdated)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* They Receive Column */}
        <div className="p-4 md:w-1/6 border-b md:border-b-0 md:border-r text-center">
          <div className="text-xs text-gray-500 uppercase mb-2">
            {calculationMode === "receive" ? "YOU SEND" : "YOU RECEIVE"}
          </div>
          <div className="text-3xl font-bold text-primary">
            {calculationMode === "receive" 
              ? formatCurrency(provider.sendAmount || 0, fromCurrency)
              : formatCurrency(normalizedReceivedAmount, toCurrency)
            }
          </div>
          
          {difference && (
            <div className="text-xs text-red-500 mt-1 flex items-center justify-center">
              <TrendingDown className="h-3 w-3 mr-1" />
              <span>Receive {formatCurrency(difference.amount, toCurrency)} less than best provider</span>
            </div>
          )}
        </div>
        
        {/* Action Column */}
        <div className="p-4 md:w-1/12 flex items-center justify-center">
          {provider.websiteUrl ? (
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 px-3"
              onClick={() => {
                // Track the provider click in analytics
                trackProviderClick(
                  provider.providerName,
                  fromCurrency,
                  toCurrency,
                  provider.sendAmount || 100
                );
                window.open(provider.websiteUrl as string, '_blank');
              }}
            >
              Go
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 px-3"
              onClick={() => {
                // Track the provider click in analytics
                trackProviderClick(
                  provider.providerName,
                  fromCurrency,
                  toCurrency,
                  provider.sendAmount || 100
                );
                window.open(`https://www.google.com/search?q=${provider.providerName}+money+transfer`, '_blank');
              }}
            >
              Go
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};