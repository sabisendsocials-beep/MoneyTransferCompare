import { useState } from "react";
import { TransferResult } from "@shared/schema";
import { ExternalLink, Clock, ChevronDown, ChevronUp, CheckCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CleanComparisonCardProps {
  provider: TransferResult;
  index: number;
  fromCurrency: string;
  toCurrency: string;
}

export const CleanComparisonCard = ({
  provider,
  index,
  fromCurrency,
  toCurrency,
}: CleanComparisonCardProps) => {
  const [expanded, setExpanded] = useState(index === 0); // First card is expanded by default
  
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
    
  // Get last updated time in human readable format
  const getLastUpdated = () => {
    if (!provider.lastUpdated) return "Unknown";
    
    try {
      const date = new Date(provider.lastUpdated);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return "Unknown";
    }
  };

  // Determine if the provider has no fees
  const hasFreeTransfer = provider.fee === 0;
  
  return (
    <div 
      className={cn(
        "border-b last:border-b-0 transition-all py-5",
        expanded ? "pb-6" : "",
        index === 0 ? "bg-gradient-to-r from-blue-50/30 to-indigo-50/30" : ""
      )}
    >
      <div className="flex flex-col md:flex-row items-start justify-between">
        {/* Provider Info */}
        <div className="flex items-center mb-4 md:mb-0 w-full md:w-auto">
          {/* Provider Logo */}
          <div className="w-12 h-12 flex-shrink-0 mr-3">
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
          
          {/* Provider Name & Details */}
          <div>
            <div className="flex items-center">
              <h3 className="font-bold text-lg mr-2">{provider.providerName}</h3>
              {index === 0 && (
                <span className="bg-green-500 text-white text-xs py-0.5 px-1.5 rounded-sm flex items-center font-medium">
                  <CheckCircle className="w-3 h-3 mr-1" /> Best
                </span>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5 mr-1" /> 
              <span>{provider.transferTime || "Unknown"}</span>
              {provider.rating && (
                <div className="flex items-center ml-3">
                  <Star className="w-3.5 h-3.5 mr-1 text-yellow-400 fill-yellow-400" />
                  <span>{provider.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap items-end justify-between w-full md:w-auto gap-x-8">
          {/* Exchange Rate & Fee */}
          <div className="w-1/2 md:w-auto">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Fee</div>
            <div className={hasFreeTransfer ? "text-green-600 font-bold" : "font-medium"}>
              {hasFreeTransfer ? "FREE" : formatCurrency(provider.fee, fromCurrency)}
            </div>
          </div>
          
          <div className="w-1/2 md:w-auto">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Rate</div>
            <div className="font-medium">{formatRate(normalizedRate)}</div>
          </div>
          
          {/* Amount Received */}
          <div className="mt-3 md:mt-0 w-full md:w-auto text-center md:text-left">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">You Receive</div>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(normalizedReceivedAmount, toCurrency)}
            </div>
          </div>
          
          {/* Action Button */}
          <div className="mt-3 md:mt-0 w-full md:w-auto">
            {provider.websiteUrl ? (
              <Button 
                className="w-full"
                onClick={() => window.open(provider.websiteUrl as string, '_blank')}
              >
                <span>Send Money</span>
                <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button 
                className="w-full"
                onClick={() => window.open(`https://www.google.com/search?q=${provider.providerName}+money+transfer`, '_blank')}
              >
                <span>Visit Provider</span>
                <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Expand/Collapse Toggle */}
      <div 
        className="flex items-center justify-center mt-3 text-sm text-blue-600 font-medium cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <span>Show less</span>
            <ChevronUp className="w-4 h-4 ml-1" />
          </>
        ) : (
          <>
            <span>Show details</span>
            <ChevronDown className="w-4 h-4 ml-1" />
          </>
        )}
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 text-sm grid md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div>
            <h4 className="font-medium mb-2">Transaction Details</h4>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-600">You send</td>
                  <td className="text-right font-medium">{formatCurrency(provider.sendAmount, fromCurrency)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Fee</td>
                  <td className="text-right font-medium">{formatCurrency(provider.fee, fromCurrency)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Exchange rate</td>
                  <td className="text-right font-medium">1 {fromCurrency} = {formatRate(normalizedRate)} {toCurrency}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-1">They receive</td>
                  <td className="text-right">{formatCurrency(normalizedReceivedAmount, toCurrency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">About {provider.providerName}</h4>
            <div className="text-gray-600 space-y-1">
              <p>
                {provider.transferTime && (
                  <span className="flex items-center mb-1">
                    <Clock className="w-4 h-4 mr-1" /> Delivery: {provider.transferTime}
                  </span>
                )}
              </p>
              <p>
                {provider.comment || 
                  `${provider.providerName} offers international money transfer services with competitive rates and fees.`}
              </p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Rate Information</h4>
            <div className="text-gray-600 space-y-1">
              <p>Source: {provider.rateSource}</p>
              <p>Last updated: {getLastUpdated()}</p>
              <p className="italic text-xs mt-2">
                Rates and fees are accurate as of the time shown and are subject to change.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};