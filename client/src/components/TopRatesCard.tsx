import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Trophy, ArrowRight, Clock, RefreshCw, ChevronDown, 
  TrendingUp, Zap, ExternalLink 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface TransferResult {
  providerId: number;
  providerName: string;
  providerLogo?: string;
  exchangeRate: number;
  fee: number;
  transferTime: string;
  totalCost: number;
  receivedAmount: number;
  sendAmount: number;
  rateSource?: string;
  lastUpdated?: string;
  rating?: number;
}

const currencySymbols: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  INR: "₹",
  PKR: "Rs",
};

const currencyFlags: Record<string, string> = {
  GBP: "🇬🇧",
  EUR: "🇪🇺",
  USD: "🇺🇸",
  NGN: "🇳🇬",
  GHS: "🇬🇭",
  KES: "🇰🇪",
  INR: "🇮🇳",
  PKR: "🇵🇰",
};

const fromCurrencies = ["GBP", "EUR", "USD"];
const toCurrencies = ["NGN", "GHS", "KES", "INR", "PKR"];

const formatRate = (rate: number): string => {
  return rate.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTime = (time: string): string => {
  const now = new Date();
  return now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

interface TopRatesCardProps {
  className?: string;
  defaultFrom?: string;
  defaultTo?: string;
}

const TopRatesCard = ({ 
  className = "",
  defaultFrom = "GBP",
  defaultTo = "NGN"
}: TopRatesCardProps) => {
  const [fromCurrency, setFromCurrency] = useState(defaultFrom);
  const [toCurrency, setToCurrency] = useState(defaultTo);
  const [showTop5, setShowTop5] = useState(false);

  const { data: results, isLoading, error, refetch, dataUpdatedAt } = useQuery<TransferResult[]>({
    queryKey: ['/api/compare', fromCurrency, toCurrency, 'top-rates'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/compare', {
        amount: 100,
        fromCurrency,
        toCurrency,
        type: "send"
      });
      return response as unknown as TransferResult[];
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const sortedResults = results
    ?.slice()
    .sort((a, b) => b.exchangeRate - a.exchangeRate)
    .slice(0, showTop5 ? 5 : 3);

  const displayCount = showTop5 ? 5 : 3;
  const totalProviders = results?.length || 0;
  const hiddenCount = Math.max(0, totalProviders - displayCount);

  const lastUpdated = dataUpdatedAt 
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  const compareUrl = `/results?amount=100&fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&calculationMode=send`;

  return (
    <Card className={`border-2 shadow-lg ${className}`} data-testid="top-rates-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Top Rates Right Now</CardTitle>
              <p className="text-sm text-gray-500">Best exchange rates from all providers</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger className="w-[100px]" data-testid="from-currency-select">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span>{currencyFlags[fromCurrency]}</span>
                    <span>{fromCurrency}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {fromCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    <span className="flex items-center gap-2">
                      <span>{currencyFlags[currency]}</span>
                      <span>{currency}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
            
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger className="w-[100px]" data-testid="to-currency-select">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span>{currencyFlags[toCurrency]}</span>
                    <span>{toCurrency}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {toCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    <span className="flex items-center gap-2">
                      <span>{currencyFlags[currency]}</span>
                      <span>{currency}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <p className="text-xs text-gray-500">Quick switch:</p>
          {toCurrencies.map((currency) => (
            <button
              key={currency}
              onClick={() => setToCurrency(currency)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                toCurrency === currency 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              data-testid={`quick-switch-${currency}`}
            >
              {currencyFlags[currency]} {currency}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-3">Unable to load rates</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {sortedResults?.map((provider, index) => (
                <div 
                  key={provider.providerId}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    index === 0 
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200" 
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                  data-testid={`provider-row-${provider.providerId}`}
                >
                  <div className="flex items-center gap-3">
                    {index === 0 && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs">
                        BEST
                      </Badge>
                    )}
                    {index > 0 && (
                      <span className="text-sm font-medium text-gray-400 w-6">#{index + 1}</span>
                    )}
                    <div>
                      <p className={`font-semibold ${index === 0 ? "text-gray-900" : "text-gray-700"}`}>
                        {provider.providerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Fee: {currencySymbols[fromCurrency]}{provider.fee.toFixed(2)} • {provider.transferTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold ${index === 0 ? "text-lg text-green-600" : "text-gray-800"}`}>
                      {currencySymbols[fromCurrency]}1 = {currencySymbols[toCurrency]}{formatRate(provider.exchangeRate)}
                    </p>
                    {index === 0 && sortedResults.length > 1 && (
                      <p className="text-xs text-green-600">
                        +{currencySymbols[toCurrency]}{formatRate(provider.exchangeRate - (sortedResults[1]?.exchangeRate || 0))} vs #2
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalProviders > 3 && (
              <button
                onClick={() => setShowTop5(!showTop5)}
                className="w-full mt-3 py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-1"
                data-testid="toggle-top5-btn"
              >
                {showTop5 ? "Show Top 3" : `+${hiddenCount} more providers`}
                <ChevronDown className={`h-4 w-4 transition-transform ${showTop5 ? "rotate-180" : ""}`} />
              </button>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>Updated {lastUpdated || "just now"}</span>
                <button onClick={() => refetch()} className="text-primary hover:underline ml-2">
                  <RefreshCw className="h-3 w-3 inline mr-1" />
                  Refresh
                </button>
              </div>
              
              <Link href={compareUrl}>
                <Button className="w-full sm:w-auto gap-2" data-testid="see-full-comparison-btn">
                  See Full Comparison
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopRatesCard;
