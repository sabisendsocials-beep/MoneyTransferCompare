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

  // Render stars based on rating
  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div 
      className={cn(
        "bg-white border overflow-hidden mb-4 rounded-lg",
        index === 0 ? "border-primary/50 shadow-md bg-primary/5" : "border-gray-200 hover:shadow-sm hover:border-gray-300"
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 items-center">
        {/* Provider Info Column */}
        <div className={cn(
          "py-4 px-5 flex items-center md:col-span-4 border-b md:border-b-0 md:border-r relative",
          index === 0 ? "bg-primary/5" : ""
        )}>
          {/* Rank Badge */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
            {index === 0 ? (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-700 font-medium text-lg">{index + 1}</span>
              </div>
            )}
          </div>
          
          {/* Provider Logo and Name */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col mb-1">
              {provider.providerLogo ? (
                <div className="flex items-center">
                  <div className="w-8 h-8 mr-2 flex-shrink-0">
                    <img 
                      src={provider.providerLogo} 
                      alt={`${provider.providerName} logo`} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="font-semibold text-lg">{provider.providerName}</h3>
                </div>
              ) : (
                <h3 className="font-semibold text-lg">{provider.providerName}</h3>
              )}
              
              {provider.rating && (
                <div className="flex items-center mt-1">
                  <span className="font-medium mr-1.5 text-gray-700">{provider.rating.toFixed(1)}</span>
                  {renderStars(provider.rating)}
                </div>
              )}
            </div>
            
            {provider.transferTime && (
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <Clock className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span>{provider.transferTime}</span>
              </div>
            )}
            
            {/* Best Provider Badge */}
            {index === 0 && (
              <div className="absolute top-2 right-2 text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded">
                Best Rate
              </div>
            )}
          </div>
        </div>
        
        {/* YOU SEND Column */}
        <div className="p-4 flex flex-col md:col-span-2 border-b md:border-b-0 md:border-r text-center">
          <div className="text-xs text-gray-500 mb-2 uppercase">YOU SEND</div>
          <div className="font-semibold text-lg">
            {formatCurrency(provider.sendAmount, fromCurrency)}
          </div>
          {provider.fee > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Fee: {formatCurrency(provider.fee, fromCurrency)}
            </div>
          )}
        </div>
        
        {/* EXCHANGE RATE Column */}
        <div className="p-4 flex flex-col md:col-span-2 border-b md:border-b-0 md:border-r text-center">
          <div className="text-xs text-gray-500 mb-2 uppercase">EXCHANGE RATE</div>
          <div className="font-semibold text-lg">
            {normalizedRate.toFixed(4)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            1 {fromCurrency} = {normalizedRate.toFixed(4)} {toCurrency}
          </div>
          {provider.fee > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Fee: {formatCurrency(provider.fee, fromCurrency)}
            </div>
          )}
          {provider.comment && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
              {provider.comment}
            </div>
          )}
          {provider.lastUpdated && (
            <div className="text-xs text-gray-400 mt-1">
              Updated {new Date(provider.lastUpdated).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
        
        {/* THEY RECEIVE Column */}
        <div className="p-4 flex flex-col md:col-span-2 border-b md:border-b-0 md:border-r text-center">
          <div className="text-xs text-gray-500 mb-2 uppercase">THEY RECEIVE</div>
          <div className="text-xl font-bold text-primary">
            {formatCurrency(normalizedReceivedAmount, toCurrency)}
          </div>
          {index === 0 && (
            <div className="text-xs text-green-600 mt-1">
              Best value
            </div>
          )}
        </div>
        
        {/* ACTION Column */}
        <div className="p-4 flex items-center justify-center md:col-span-2">
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