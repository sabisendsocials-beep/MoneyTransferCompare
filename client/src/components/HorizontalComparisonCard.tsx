import { TransferResult } from "@shared/schema";
import { ExternalLink, Clock, Star, Check, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HorizontalComparisonCardProps {
  provider: TransferResult;
  index: number;
  fromCurrency: string;
  toCurrency: string;
  bestRateAmount?: number;
}

export const HorizontalComparisonCard = ({
  provider,
  index,
  fromCurrency,
  toCurrency,
  bestRateAmount
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
  
  // Remove currency symbol
  const formatCurrencyWithoutSymbol = (value: number, currency: string) => {
    return formatCurrency(value, currency).replace(/[£$€₦]/g, '');
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
  
  // Render ratings as stars
  const renderRating = (rating: number | undefined) => {
    if (!rating) return null;
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        <span className="text-sm font-medium mr-1">{rating.toFixed(1)}</span>
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={cn(
                "h-3.5 w-3.5", 
                i < fullStars 
                  ? "text-yellow-400 fill-yellow-400" 
                  : i === fullStars && hasHalfStar 
                    ? "text-yellow-400 fill-yellow-400/50" 
                    : "text-gray-300"
              )} 
            />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div 
      className={cn(
        "bg-white border overflow-hidden mb-4 rounded-lg transition-all duration-200",
        index === 0 
          ? "border-blue-500 shadow-md" 
          : "border-gray-200 hover:shadow-sm hover:border-gray-300"
      )}
    >
      <div className="flex flex-col md:flex-row">
        {/* Provider Column - First Column */}
        <div className="flex items-center py-4 px-4 md:w-1/4 border-b md:border-b-0 md:border-r relative">
          {/* Rank Number */}
          <div className="mr-3 flex-shrink-0 w-8">
            {index === 0 ? (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-blue-600" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-700 font-medium">{index + 1}</span>
              </div>
            )}
          </div>
          
          {/* Provider Logo and Name */}
          <div className="flex-1">
            <div className="flex flex-col">
              {provider.providerLogo && (
                <img 
                  src={provider.providerLogo} 
                  alt={`${provider.providerName} logo`} 
                  className="w-8 h-8 mb-2 object-contain"
                />
              )}
              <h3 className="font-semibold text-gray-800 text-lg mb-1">{provider.providerName}</h3>
              {provider.rating && renderRating(provider.rating)}
              
              {provider.transferTime && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Clock className="w-3 h-3 mr-1 inline" />
                  <span>{provider.transferTime}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Best Value Badge */}
          {index === 0 && (
            <div className="absolute top-2 right-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Best value
            </div>
          )}
        </div>
        
        {/* You Send - Second Column */}
        <div className="p-4 md:w-1/6 border-b md:border-b-0 md:border-r flex flex-col justify-center">
          <div className="text-xs text-gray-500 uppercase mb-2 font-medium">YOU SEND</div>
          <div className="text-lg font-semibold text-gray-800">
            {formatCurrency(provider.sendAmount, fromCurrency)}
          </div>
          
          {!hasFreeTransfer && provider.fee > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Fee: {formatCurrency(provider.fee, fromCurrency)}
            </div>
          )}
          
          {hasFreeTransfer && (
            <div className="text-xs text-green-600 mt-1 font-medium">
              No fee
            </div>
          )}
        </div>
        
        {/* Exchange Rate - Third Column */}
        <div className="p-4 md:w-1/4 border-b md:border-b-0 md:border-r">
          <div className="text-xs text-gray-500 uppercase mb-2 font-medium">EXCHANGE RATE</div>
          <div className="text-lg font-semibold text-gray-800 mb-1">
            {normalizedRate.toFixed(4)}
          </div>
          
          {/* Star Rating Visual */}
          <div className="flex mb-2">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={cn(
                  "h-4 w-4", 
                  i < 4 ? "text-yellow-400 fill-yellow-400" : "text-yellow-200 fill-yellow-200"
                )} 
              />
            ))}
          </div>
          
          {/* Provider Comment */}
          {provider.comment && (
            <div className="text-sm text-gray-600 mt-1">
              {provider.comment}
            </div>
          )}
          
          {/* Updated Time */}
          {provider.lastUpdated && (
            <div className="text-xs text-gray-500 mt-2 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Updated {formatTimeStamp(provider.lastUpdated)}
            </div>
          )}
        </div>
        
        {/* They Receive - Fourth Column */}
        <div className="p-4 md:w-1/6 border-b md:border-b-0 md:border-r">
          <div className="text-xs text-gray-500 uppercase mb-2 font-medium">THEY RECEIVE</div>
          <div className="text-xl font-bold text-blue-600">
            {toCurrency}{formatCurrencyWithoutSymbol(normalizedReceivedAmount, toCurrency)}
          </div>
          
          {difference && (
            <div className="text-xs text-red-500 mt-1 flex items-center">
              <TrendingDown className="h-3 w-3 mr-1" />
              {toCurrency}{formatCurrencyWithoutSymbol(difference.amount, toCurrency)} less
            </div>
          )}
        </div>
        
        {/* Action Button - Fifth Column */}
        <div className="p-4 md:w-1/12 flex items-center justify-center">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white rounded-md"
            onClick={() => window.open(provider.websiteUrl as string || `https://www.google.com/search?q=${provider.providerName}+money+transfer`, '_blank')}
          >
            <span className="mr-1">Send Money</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};