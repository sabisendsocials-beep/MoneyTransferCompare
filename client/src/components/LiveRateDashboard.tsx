import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, RefreshCw, ArrowRight, Clock, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BestRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: string;
  providerName: string;
}

interface RateCardProps {
  rate: BestRate;
  previousRate?: number;
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

const formatRate = (rate: number, toCurrency: string): string => {
  if (toCurrency === "NGN" || toCurrency === "PKR" || toCurrency === "KES" || toCurrency === "INR") {
    return rate.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return rate.toLocaleString("en-GB", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
};

const RateCard = ({ rate, previousRate }: RateCardProps) => {
  const isUp = previousRate ? rate.rate > previousRate : null;
  const changePercent = previousRate ? ((rate.rate - previousRate) / previousRate * 100).toFixed(2) : null;
  
  const compareUrl = `/compare?from=${rate.fromCurrency}&to=${rate.toCurrency}`;
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800" data-testid={`rate-card-${rate.fromCurrency}-${rate.toCurrency}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currencyFlags[rate.fromCurrency]}</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="text-2xl">{currencyFlags[rate.toCurrency]}</span>
          </div>
          {isUp !== null && (
            <Badge variant={isUp ? "default" : "destructive"} className={`${isUp ? "bg-green-500" : "bg-red-500"} text-xs`}>
              {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {changePercent}%
            </Badge>
          )}
        </div>
        
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {currencySymbols[rate.fromCurrency]}1 {rate.fromCurrency} =
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {currencySymbols[rate.toCurrency]}{formatRate(rate.rate, rate.toCurrency)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {rate.toCurrency}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{rate.providerName}</span>
          </div>
        </div>
        
        <Link href={compareUrl}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3 text-primary hover:text-primary hover:bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors"
            data-testid={`compare-btn-${rate.fromCurrency}-${rate.toCurrency}`}
          >
            Compare All Providers
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

const RateCardSkeleton = () => (
  <Card className="border-2 bg-gradient-to-br from-white to-gray-50">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-12 mb-3" />
      <Skeleton className="h-4 w-28 mb-3" />
      <Skeleton className="h-9 w-full" />
    </CardContent>
  </Card>
);

interface LiveRateDashboardProps {
  className?: string;
  showTitle?: boolean;
  maxCards?: number;
  layout?: "grid" | "ticker";
}

const LiveRateDashboard = ({ 
  className = "", 
  showTitle = true, 
  maxCards = 6,
  layout = "grid" 
}: LiveRateDashboardProps) => {
  const { data: bestRates, isLoading, refetch, dataUpdatedAt } = useQuery<BestRate[]>({
    queryKey: ['/api/best-rates'],
    refetchInterval: 60000,
  });

  const priorityOrder = [
    "GBP-NGN", "EUR-NGN", "USD-NGN",
    "GBP-GHS", "EUR-GHS", "USD-GHS",
    "GBP-KES", "GBP-INR", "GBP-PKR"
  ];

  const sortedRates = bestRates
    ?.slice()
    .sort((a, b) => {
      const keyA = `${a.fromCurrency}-${a.toCurrency}`;
      const keyB = `${b.fromCurrency}-${b.toCurrency}`;
      const indexA = priorityOrder.indexOf(keyA);
      const indexB = priorityOrder.indexOf(keyB);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    })
    .slice(0, maxCards);

  const lastUpdated = dataUpdatedAt 
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-GB", { 
        hour: "2-digit", 
        minute: "2-digit" 
      })
    : null;

  if (layout === "ticker") {
    return (
      <div className={`bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-3 overflow-hidden ${className}`} data-testid="rate-ticker">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6 animate-scroll">
            <div className="flex items-center gap-2 text-sm font-medium text-primary shrink-0">
              <Zap className="h-4 w-4" />
              <span>LIVE RATES</span>
            </div>
            {isLoading ? (
              <div className="flex gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-6 w-40" />
                ))}
              </div>
            ) : (
              <div className="flex gap-8">
                {sortedRates?.map((rate) => (
                  <div 
                    key={`${rate.fromCurrency}-${rate.toCurrency}`} 
                    className="flex items-center gap-2 shrink-0 text-sm"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {currencyFlags[rate.fromCurrency]} {rate.fromCurrency}/{rate.toCurrency}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatRate(rate.rate, rate.toCurrency)}
                    </span>
                    <span className="text-xs text-gray-500">
                      via {rate.providerName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`py-8 ${className}`} data-testid="live-rate-dashboard">
      <div className="container mx-auto px-4">
        {showTitle && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-green-500 h-2 w-2 rounded-full animate-pulse" />
                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                  LIVE
                </Badge>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Best Rates Right Now</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time rates from 15+ providers. Updated every minute.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Updated {lastUpdated}</span>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="gap-2"
                data-testid="refresh-rates-btn"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <RateCardSkeleton key={i} />
              ))}
            </>
          ) : (
            sortedRates?.map((rate) => (
              <RateCard 
                key={`${rate.fromCurrency}-${rate.toCurrency}`} 
                rate={rate} 
              />
            ))
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/compare">
            <Button size="lg" className="gap-2" data-testid="view-all-rates-btn">
              View All Currency Pairs
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LiveRateDashboard;
