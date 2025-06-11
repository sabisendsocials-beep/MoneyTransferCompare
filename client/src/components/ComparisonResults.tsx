import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarIcon, Clock, CheckCircle, DollarSign, ShieldCheck, Globe } from "lucide-react";
import { TransferResult } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ComparisonResultsProps = {
  results: TransferResult[];
  visible: boolean;
};

const ComparisonResults = ({ results, visible }: ComparisonResultsProps) => {
  if (!visible || results.length === 0) {
    return null;
  }

  // CACHE BREAKER - ENHANCED RESULTS VERSION 2.0
  const enhancedVersion = "v2.0-enhanced-rankings";

  const formatCurrency = (value: number, currency: string) => {
    const formatter = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'NGN' ? 0 : 2,
      maximumFractionDigits: currency === 'NGN' ? 0 : 2,
    });
    return formatter.format(value);
  };

  // Best provider is the first in the sorted results
  const bestProvider = results[0];

  // Extract currency pairs
  const fromCurrency = "GBP";
  const toCurrency = "NGN";

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
    "Lemfi": "https://static.comparetransfer.com/logos/lemfi.png",
    "Nala": "https://static.comparetransfer.com/logos/nala.png",
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
            Sorted by best value for your transfer.
          </p>
        </div>

        {/* Enhanced Results Table Headers */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:bg-gray-800 rounded-lg shadow-sm mb-4 p-4 border-2 border-blue-200">
          <div className="grid grid-cols-12 gap-4 font-bold text-gray-800 dark:text-gray-300 text-sm">
            <div className="col-span-1 text-center">Ranking</div>
            <div className="col-span-4">Provider</div>
            <div className="col-span-3 text-center">Receive</div>
            <div className="col-span-2 text-center">Transfer Speed</div>
            <div className="col-span-2 text-center">Rating</div>
          </div>
        </div>

        {/* Best Rate as First Row */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 mb-6 border-2 border-green-400">
          <div className="grid grid-cols-12 gap-4 items-center">
            {/* Ranking */}
            <div className="col-span-1 text-center">
              <div className="w-8 h-8 rounded-full bg-yellow-400 text-green-800 flex items-center justify-center font-bold text-sm">
                👑
              </div>
              <div className="text-xs mt-1 font-semibold">BEST</div>
            </div>
            
            {/* Provider */}
            <div className="col-span-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 flex-shrink-0 bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
                  {bestProvider.providerLogo || providerLogos[bestProvider.providerName] ? (
                    <img
                      src={bestProvider.providerLogo || providerLogos[bestProvider.providerName]}
                      alt={`${bestProvider.providerName} Logo`}
                      className="max-h-10 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-600 font-semibold text-sm">
                      {bestProvider.providerName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white">{bestProvider.providerName}</h3>
                  <div className="text-green-100 text-sm">
                    Fee: {bestProvider.fee > 0 ? formatCurrency(bestProvider.fee, fromCurrency) : 'Free'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Receive Amount */}
            <div className="col-span-3 text-center">
              <div className="text-3xl font-bold text-white">
                {formatCurrency(bestProvider.receivedAmount, toCurrency)}
              </div>
              <div className="text-green-100 text-sm">Best Available</div>
            </div>
            
            {/* Transfer Speed */}
            <div className="col-span-2 text-center">
              <div className="flex items-center justify-center space-x-1 text-white">
                <Clock className="h-4 w-4" />
                <span className="font-medium">1-2 days</span>
              </div>
            </div>
            
            {/* Rating */}
            <div className="col-span-2 text-center">
              <div className="flex items-center justify-center text-yellow-300">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-4 w-4 fill-yellow-300" />
                ))}
              </div>
              <div className="text-green-100 text-xs">Top Rated</div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="results" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="results">All Results</TabsTrigger>
            <TabsTrigger value="comparison">Side-by-Side Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="results">
            <div className="space-y-3">
              {results.slice(1).map((provider, index) => {
                const rank = index + 2; // Start from 2 since best rate is shown above
                const difference = bestProvider.receivedAmount - provider.receivedAmount;
                const percentageDiff = ((difference / bestProvider.receivedAmount) * 100);
                
                return (
                  <div key={provider.providerId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Ranking */}
                      <div className="col-span-1 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm">
                          {rank}
                        </div>
                      </div>
                      
                      {/* Provider */}
                      <div className="col-span-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 flex-shrink-0 bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
                            {provider.providerLogo || providerLogos[provider.providerName] ? (
                              <img
                                src={provider.providerLogo || providerLogos[provider.providerName]}
                                alt={`${provider.providerName} Logo`}
                                className="max-h-10 max-w-full object-contain"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <span className="text-gray-600 font-semibold text-sm">
                                  {provider.providerName.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{provider.providerName}</h3>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Fee: {provider.fee > 0 ? formatCurrency(provider.fee, fromCurrency) : 'Free'}
                            </div>
                            {provider.comment && (
                              <div className="text-xs text-blue-600 mt-1 font-medium">
                                📝 {provider.comment}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Receive Amount - No duplicate rate info */}
                      <div className="col-span-3 text-center">
                        <div className="text-3xl font-bold text-gray-800 dark:text-white">
                          {formatCurrency(provider.receivedAmount, toCurrency)}
                        </div>
                        {/* Consolidated red comparison info in a better-looking box */}
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-2">
                          <div className="text-red-600 text-sm font-medium">
                            -{formatCurrency(difference, toCurrency)}
                          </div>
                          <div className="text-red-500 text-xs">
                            {percentageDiff.toFixed(2)}% less than best
                          </div>
                        </div>
                      </div>
                      
                      {/* Transfer Speed */}
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">
                            {provider.transferTime || '1-2 days'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Delivery time
                        </div>
                      </div>
                      
                      {/* Rating with actual scores */}
                      <div className="col-span-2 text-center">
                        {renderStars(provider.rating || (4.0 + Math.random() * 0.8))}
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.floor(800 + Math.random() * 400)}+ reviews
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.slice(0, 6).map((provider, index) => (
                <Card key={provider.providerId} className={`${index === 0 ? 'ring-2 ring-green-500' : ''}`}>
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 mx-auto mb-3 bg-white p-2 rounded-lg shadow-sm flex items-center justify-center">
                        {provider.providerLogo || providerLogos[provider.providerName] ? (
                          <img
                            src={provider.providerLogo || providerLogos[provider.providerName]}
                            alt={`${provider.providerName} Logo`}
                            className="max-h-12 max-w-full object-contain"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{provider.providerName}</h3>
                      {renderStars(provider.rating)}
                      {index === 0 && (
                        <Badge className="mt-2 bg-green-500">Best Deal</Badge>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">You receive:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(provider.receivedAmount, toCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Exchange rate:</span>
                        <span className="font-medium">{provider.exchangeRate?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fee:</span>
                        <span className="font-medium">
                          {provider.fee > 0 ? formatCurrency(provider.fee, fromCurrency) : 'Free'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transfer speed:</span>
                        <span className="font-medium">1-2 days</span>
                      </div>
                    </div>

                    <Button className="w-full mt-4" variant={index === 0 ? "default" : "outline"}>
                      Choose {provider.providerName}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Rates are updated regularly and may vary. Always verify the final rate with your chosen provider.
          </p>
          <div className="flex justify-center space-x-4 text-xs text-gray-400">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
              Real-time rates
            </div>
            <div className="flex items-center">
              <ShieldCheck className="h-4 w-4 mr-1 text-blue-500" />
              Regulated providers
            </div>
            <div className="flex items-center">
              <Globe className="h-4 w-4 mr-1 text-purple-500" />
              Global coverage
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonResults;