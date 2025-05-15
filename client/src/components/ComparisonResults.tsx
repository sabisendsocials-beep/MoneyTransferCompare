import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarIcon, InfoIcon, Clock, CheckCircle, AlertCircle, DollarSign, ChevronsDown, ShieldCheck, BadgeCheck } from "lucide-react";
import { TransferResult } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderCard } from "./ProviderCard";
import { ProviderBadge } from "./ProviderBadge";

type ComparisonResultsProps = {
  results: TransferResult[];
  visible: boolean;
};

const ComparisonResults = ({ results, visible }: ComparisonResultsProps) => {
  if (!visible || results.length === 0) {
    return null;
  }

  const formatCurrency = (value: number, currency: string) => {
    const formatter = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'NGN' ? 0 : 2,
      maximumFractionDigits: currency === 'NGN' ? 0 : 2,
    });
    return formatter.format(value);
  };
  
  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 60) {
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
      } else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffDays < 7) {
        return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Unknown';
    }
  };

  // Best provider is the first in the sorted results
  const bestProvider = results[0];
  const otherProviders = results.slice(1);

  // Extract currency pairs from the first result (assuming all results use the same currencies)
  const fromCurrency = "GBP"; // This would normally come from the API response
  const toCurrency = "NGN";

  // Calculate some additional stats for each provider
  const getProviderDetails = (provider: TransferResult) => {
    // Calculate effective exchange rate (after fees)
    const effectiveRate = provider.receivedAmount / provider.sendAmount;
    
    // Calculate rate margin against mid-market
    const midMarketRate = 1500; // This would normally come from the API
    const rateMargin = ((midMarketRate - effectiveRate) / midMarketRate) * 100;
    
    // Calculate savings compared to most expensive option
    const mostExpensiveProvider = [...results].sort((a, b) => a.receivedAmount - b.receivedAmount)[0];
    const savings = provider.receivedAmount - mostExpensiveProvider.receivedAmount;
    
    // Calculate fee as percentage of send amount
    const feePercentage = (provider.fee / provider.sendAmount) * 100;
    
    return {
      effectiveRate,
      rateMargin: Math.max(0, rateMargin).toFixed(1),
      savings: Math.max(0, savings),
      totalCost: provider.sendAmount.toFixed(2),
      feePercentage: feePercentage.toFixed(1),
    };
  };

  const bestProviderDetails = getProviderDetails(bestProvider);

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return null;
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center text-yellow-500">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} className="h-4 w-4 fill-yellow-500" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <StarIcon className="h-4 w-4 fill-yellow-500" />
            <StarIcon className="absolute top-0 right-0 h-4 w-4 fill-gray-300" style={{ clipPath: 'inset(0 0 0 50%)' }} />
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="h-4 w-4 fill-gray-300" />
        ))}
        <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">
          ({rating.toFixed(1)}/5)
        </span>
      </div>
    );
  };

  const providerLogos: { [key: string]: string } = {
    "Wise": "https://static.comparetransfer.com/logos/wise.png",
    "Western Union": "https://static.comparetransfer.com/logos/western-union.png",
    "Remitly": "https://static.comparetransfer.com/logos/remitly.png",
    "WorldRemit": "https://static.comparetransfer.com/logos/worldremit.png",
    "MoneyGram": "https://static.comparetransfer.com/logos/moneygram.png",
    "Azimo": "https://static.comparetransfer.com/logos/azimo.png",
    "TorFX": "https://static.comparetransfer.com/logos/torfx.png",
    "Small World": "https://static.comparetransfer.com/logos/small-world.png",
    "XE Money Transfer": "https://static.comparetransfer.com/logos/xe.png",
    "Currencys": "https://static.comparetransfer.com/logos/currencys.png",
  };

  return (
    <section id="comparison-results" className="py-12 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-2 bg-primary/10 text-primary border-primary/20">Results</Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">
            {results.length} Money Transfer Options Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Compare the best providers for sending money from {fromCurrency} to {toCurrency}. 
            Rate freshness information is displayed for each provider.
          </p>
        </div>

        <Tabs defaultValue="results" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="comparison">Side-by-Side Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="results">
            {/* Best Provider Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-8 relative">
              <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 rounded-bl-lg text-xs font-semibold">
                Best deal
              </div>
              <div className="px-6 py-4 bg-green-500 text-white flex items-center">
                <div className="rounded-full bg-white p-1 mr-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <span className="font-medium">Best Value Provider</span>
                <div className="ml-auto text-sm font-medium">
                  Save up to {formatCurrency(bestProviderDetails.savings, toCurrency)}
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="md:w-1/4 mb-6 md:mb-0 flex flex-col items-center md:items-start">
                    <div className="flex items-center mb-3">
                      <div className="w-16 h-16 flex-shrink-0 bg-white p-2 rounded-lg shadow-sm flex items-center justify-center">
                        {bestProvider.providerLogo || providerLogos[bestProvider.providerName] ? (
                          <img
                            src={bestProvider.providerLogo || providerLogos[bestProvider.providerName]}
                            alt={`${bestProvider.providerName} Logo`}
                            className="max-h-12 max-w-full object-contain"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <h3 className="font-semibold text-xl text-gray-800 dark:text-white">
                          {bestProvider.providerName}
                        </h3>
                        {renderStars(bestProvider.rating)}
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Regulated
                      </Badge>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        <BadgeCheck className="mr-1 h-3 w-3" /> Verified
                      </Badge>
                    </div>
                  </div>

                  <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">You send</h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoIcon className="h-4 w-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Total amount you need to pay, including all fees</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-gray-800 dark:text-white">
                            {formatCurrency(parseFloat(bestProviderDetails.totalCost), fromCurrency)}
                          </span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            Total cost
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-300">Transfer amount</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {formatCurrency(bestProvider.sendAmount, fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-300">Fee</span>
                          <div className="text-right">
                            <span className={`font-medium ${bestProvider.fee === 0 ? 'text-green-500' : 'text-gray-800 dark:text-gray-200'}`}>
                              {bestProvider.fee === 0 ? 'FREE' : formatCurrency(bestProvider.fee, fromCurrency)}
                            </span>
                            <div className="text-xs text-gray-500">
                              ({bestProviderDetails.feePercentage}% of transaction)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Recipient gets</h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoIcon className="h-4 w-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Final amount your recipient will receive</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-green-500">
                            {formatCurrency(bestProvider.receivedAmount, toCurrency)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-300">Exchange rate</span>
                          <div className="text-right">
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              1 {fromCurrency} = {bestProvider.exchangeRate?.toFixed(2) || '-'} {toCurrency}
                            </span>
                            <div className="text-xs flex items-center justify-end mt-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="font-medium">
                                Rate from {bestProvider.lastUpdated ? new Date(bestProvider.lastUpdated).toLocaleString('en-GB', {
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-300">Transfer time</span>
                          <div className="flex items-center text-gray-800 dark:text-gray-200">
                            <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
                            <span className="font-medium">{bestProvider.transferTime || "Unknown"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />
                    Exchange rates and fees may change before your transfer is complete
                  </div>
                  <Button 
                    className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white px-8"
                    onClick={() => window.open(bestProvider.websiteUrl || '#', '_blank')}
                  >
                    Go to provider
                  </Button>
                </div>
              </div>
            </div>

            {/* Other Providers Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherProviders.map((provider, index) => {
                const details = getProviderDetails(provider);
                return (
                  <Card key={provider.providerId} className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="border-b p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-white p-2 rounded-lg shadow-sm flex items-center justify-center mr-3">
                          {provider.providerLogo || providerLogos[provider.providerName] ? (
                            <img
                              src={provider.providerLogo || providerLogos[provider.providerName]}
                              alt={`${provider.providerName} Logo`}
                              className="max-h-8 max-w-full object-contain"
                            />
                          ) : (
                            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800 dark:text-white">{provider.providerName}</h3>
                          {renderStars(provider.rating)}
                        </div>
                      </div>
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        #{index + 2}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">You send</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(details.totalCost), fromCurrency)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Fee: {provider.fee === 0 ? 'FREE' : formatCurrency(provider.fee, fromCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Recipient gets</p>
                          <p className="font-semibold">{formatCurrency(provider.receivedAmount, toCurrency)}</p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {provider.transferTime || "Unknown"}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Exchange rate</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">1 {fromCurrency} = {provider.exchangeRate?.toFixed(2) || '-'} {toCurrency}</span>
                          <div className="flex items-center justify-end mt-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            <span className="font-medium">
                              Rate from {provider.lastUpdated ? new Date(provider.lastUpdated).toLocaleString('en-GB', {
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(provider.websiteUrl || '#', '_blank')}
                      >
                        Go to provider
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="comparison">
            {/* Side-by-Side Comparison Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Provider
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      You Send
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Fee
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Exchange Rate<br/>
                      <span className="font-normal text-gray-400 normal-case text-[10px]">Including timestamp</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Recipient Gets
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Transfer Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[bestProvider, ...otherProviders].map((provider, index) => {
                    const details = getProviderDetails(provider);
                    return (
                      <tr key={provider.providerId} className={index === 0 ? "bg-green-50 dark:bg-green-900/10" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {provider.providerLogo || providerLogos[provider.providerName] ? (
                              <img
                                src={provider.providerLogo || providerLogos[provider.providerName]}
                                alt={`${provider.providerName} Logo`}
                                className="h-8 w-8 object-contain"
                              />
                            ) : (
                              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                {provider.providerName}
                                {index === 0 && (
                                  <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-600 border-green-500/20">
                                    Best
                                  </Badge>
                                )}
                              </div>
                              {renderStars(provider.rating)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(parseFloat(details.totalCost), fromCurrency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={provider.fee === 0 ? "text-green-500 font-medium" : "text-gray-500 dark:text-gray-400"}>
                            {provider.fee === 0 ? 'FREE' : formatCurrency(provider.fee, fromCurrency)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div>1 {fromCurrency} = {provider.exchangeRate?.toFixed(2) || '-'} {toCurrency}</div>
                          <div className="mt-1 text-xs bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span className="font-medium">
                              {provider.lastUpdated ? new Date(provider.lastUpdated).toLocaleString('en-GB', {
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {index === 0 ? (
                            <span className="text-green-500">{formatCurrency(provider.receivedAmount, toCurrency)}</span>
                          ) : (
                            <span className="text-gray-900 dark:text-white">{formatCurrency(provider.receivedAmount, toCurrency)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
                            {provider.transferTime || "Unknown"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Button 
                            variant={index === 0 ? "default" : "outline"}
                            size="sm"
                            className={index === 0 ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                            onClick={() => window.open(provider.websiteUrl || '#', '_blank')}
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Additional Information */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">About Our Comparison</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            TransferCompare shows you real-time rates and fees from multiple providers, helping you find the best option for your international money transfer needs. 
            We compare over 10 major providers including Wise, Western Union, Remitly, WorldRemit, MoneyGram, and more.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                Real-time exchange rates updated throughout the day
              </span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                Transparent fee structure including all hidden costs
              </span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                Independent and unbiased comparisons
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonResults;
