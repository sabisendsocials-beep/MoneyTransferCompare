import { useState } from "react";
import { TransferResult } from "@shared/schema";
import { Plus, Minus, Clock, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimplifiedComparisonCardProps {
  provider: TransferResult;
  index: number;
  fromCurrency: string;
  toCurrency: string;
  midMarketRate?: number;
}

export const SimplifiedComparisonCard = ({
  provider,
  index,
  fromCurrency,
  toCurrency,
  midMarketRate = 2127.5, // Default mid-market rate if not provided
}: SimplifiedComparisonCardProps) => {
  const [expanded, setExpanded] = useState(index === 0); // First card is expanded by default
  
  // Format numbers with thousand separators
  const formatNumber = (num: number, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
    return new Intl.NumberFormat('en', {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(num);
  };

  // Format as currency
  const formatCurrency = (value: number, currency: string) => {
    const formatter = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'NGN' ? 0 : 2,
      maximumFractionDigits: currency === 'NGN' ? 0 : 2,
    });
    return formatter.format(value);
  };
  
  // Calculate how the rate compares to mid-market
  const rateDifference = ((provider.exchangeRate - midMarketRate) / midMarketRate) * 100;
  const isBetterThanMidMarket = rateDifference > 0;
  const absoluteDifference = Math.abs(rateDifference);
  
  // Calculate the amount difference (e.g., "You save ₦1,234.56")
  // We're comparing to the mid-market to show how much better/worse this rate is
  const amountDifference = provider.receivedAmount - (provider.sendAmount * midMarketRate);
  
  // Ensure Sendwave rate is not absurdly high (e.g., 20000 when it should be around 2000)
  const displayRate = provider.providerName === "Sendwave" && provider.exchangeRate > 5000 
    ? provider.exchangeRate / 10 
    : provider.exchangeRate;
  
  // Fix the received amount for Sendwave if we adjusted the rate
  const displayReceivedAmount = provider.providerName === "Sendwave" && provider.exchangeRate > 5000
    ? provider.receivedAmount / 10
    : provider.receivedAmount;

  return (
    <div className={cn(
      "bg-white border rounded-lg overflow-hidden mb-4 transition-all duration-300",
      index === 0 ? "border-primary shadow-md" : "border-gray-200",
      expanded ? "shadow-md" : "hover:shadow-sm"
    )}>
      {/* Provider Header */}
      <div className="flex items-center p-5">
        <div className="flex-shrink-0 mr-4">
          {provider.providerLogo ? (
            <img 
              src={provider.providerLogo} 
              alt={`${provider.providerName} logo`}
              className="w-12 h-12 object-contain"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-500 font-bold">{provider.providerName.substring(0, 2)}</span>
            </div>
          )}
        </div>
        
        <div className="flex-grow">
          <h3 className="font-bold text-lg">{provider.providerName}</h3>
          {index === 0 && (
            <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
              <CheckCircle className="w-3 h-3 mr-1" /> Best rate
            </span>
          )}
        </div>
      </div>
      
      {/* Rate Information */}
      <div className="grid grid-cols-2 gap-4 px-5 pb-5">
        <div>
          <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-1">FEE & EXCHANGE RATE</h4>
          <div className="mb-1">
            <span className="font-medium">Fee: </span>
            <span className={provider.fee === 0 ? "text-green-600 font-semibold" : ""}>
              {provider.fee === 0 ? "NONE" : formatCurrency(provider.fee, fromCurrency)}
            </span>
          </div>
          <div className="mb-1">
            <span className="font-medium">Exchange rate: </span>
            <span>{formatNumber(displayRate, 4, 4)}</span>
          </div>
          <div className="text-sm">
            <span 
              className={cn(
                isBetterThanMidMarket ? "text-green-600" : "text-red-500",
              )}
            >
              {absoluteDifference < 0.01 ? "Equal to" : `${formatNumber(absoluteDifference, 2, 2)}% ${isBetterThanMidMarket ? "better than" : "worse than"}`} mid-market rate
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-1">YOU RECEIVE</h4>
          <div className="text-2xl font-bold mb-1">
            {formatCurrency(displayReceivedAmount, toCurrency)}
          </div>
          <div className={cn(
            "text-sm",
            amountDifference > 0 ? "text-green-600" : "text-red-500"
          )}>
            {amountDifference !== 0 && (
              <>
                {amountDifference > 0 ? "+" : ""}
                {formatCurrency(Math.abs(amountDifference), toCurrency)}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Toggle for expanding/collapsing details */}
      <div 
        className="border-t border-gray-100 px-5 py-2 flex justify-between items-center cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm text-gray-600 font-medium">
          {expanded ? "Less info" : "More info"}
        </span>
        {expanded ? (
          <Minus className="h-4 w-4 text-gray-400" />
        ) : (
          <Plus className="h-4 w-4 text-gray-400" />
        )}
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-6">
            {/* Transfer Rating */}
            <div>
              <h5 className="text-xs text-gray-500 uppercase tracking-wider mb-2">RATING</h5>
              <div className="flex items-center">
                <div className="text-3xl font-bold mr-2">
                  {provider.rating ? provider.rating.toFixed(1) : "N/A"}
                </div>
                {provider.rating && (
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`text-${i < Math.floor(provider.rating || 0) ? 'yellow-400' : 'gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Transfer Time */}
            <div>
              <h5 className="text-xs text-gray-500 uppercase tracking-wider mb-2">TRANSFER TIME</h5>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-600" />
                <span className="font-medium">{provider.transferTime || "Unknown"}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Pay by card or bank transfer
              </div>
            </div>
            
            {/* Amount Breakdown */}
            <div>
              <h5 className="text-xs text-gray-500 uppercase tracking-wider mb-2">AMOUNT BREAKDOWN</h5>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1">Amount</td>
                    <td className="text-right">{formatCurrency(provider.sendAmount, fromCurrency)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Fee</td>
                    <td className="text-right">{formatCurrency(provider.fee, fromCurrency)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Exchange rate</td>
                    <td className="text-right">{formatNumber(displayRate, 4, 4)}</td>
                  </tr>
                  <tr className="font-medium">
                    <td className="py-1">You receive</td>
                    <td className="text-right">{formatCurrency(displayReceivedAmount, toCurrency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Rate Source & Last Updated Info */}
          <div className="mt-4 flex items-center text-xs text-gray-500">
            <Info className="h-3 w-3 mr-1" />
            <span>
              Rate source: {provider.rateSource} 
              {provider.lastUpdated && ` • Last updated: ${new Date(provider.lastUpdated).toLocaleString()}`}
            </span>
          </div>
          
          {/* Go to Provider Button */}
          {provider.websiteUrl && (
            <div className="mt-4">
              <a
                href={provider.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded text-center w-full"
              >
                Transfer with {provider.providerName}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};