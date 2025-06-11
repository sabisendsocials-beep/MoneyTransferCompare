import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Bell, Calculator, Star, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface PersonalizedDashboardProps {
  user: any;
}

export function PersonalizedDashboard({ user }: PersonalizedDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [alertAmount, setAlertAmount] = useState("");
  const [calculatorAmount, setCalculatorAmount] = useState("100");
  
  const selectedPair = user.preferences?.preferredCurrencyPair || "GBP-NGN";
  const [fromCurrency, toCurrency] = selectedPair.split("-");
  const preferredProviders = user.preferences?.preferredProviders || [];

  // Fetch current rates for preferred currency pair
  const { data: currentRates, isLoading: currentRatesLoading } = useQuery({
    queryKey: ['/api/rate-alerts/current-rates', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/rate-alerts/current-rates?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`);
      return response.json();
    },
  });

  // Fetch all provider rates for comparison using calculator amount
  const { data: allProviderRates, isLoading: providerRatesLoading } = useQuery({
    queryKey: ['/api/compare', fromCurrency, toCurrency, calculatorAmount],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/compare', {
        fromCurrency,
        toCurrency,
        amount: parseFloat(calculatorAmount),
        type: 'send'
      });
      return response.json();
    },
    enabled: !!calculatorAmount && !isNaN(parseFloat(calculatorAmount)),
  });

  // Rate alert creation
  const createAlertMutation = useMutation({
    mutationFn: async (data: { targetValue: number; alertType: string }) => {
      return apiRequest('POST', '/api/rate-alerts', {
        fromCurrency,
        toCurrency,
        targetValue: data.targetValue,
        alertType: data.alertType,
      });
    },
    onSuccess: () => {
      setAlertAmount("");
      toast({
        title: "Success",
        description: "Rate alert created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/rate-alerts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create rate alert",
        variant: "destructive",
      });
    },
  });

  const currentRate = (currentRates as any)?.data?.officialRate;
  const bestProvider = (currentRates as any)?.data?.bestProviderName;
  const bestRate = (currentRates as any)?.data?.bestProviderRate;

  // Navigate to existing results page with current values
  const navigateToCompare = () => {
    const params = new URLSearchParams({
      amount: calculatorAmount,
      fromCurrency,
      toCurrency,
      calculationMode: 'send'
    });
    setLocation(`/results?${params.toString()}`);
  };




  // Format currency display
  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
  };

  // Get preferred provider rates from all provider data
  const getPreferredProviderData = () => {
    if (!allProviderRates || !Array.isArray(allProviderRates)) return [];
    
    // Filter providers that match user's preferences
    const preferredRateData = allProviderRates.filter((provider: any) => 
      preferredProviders.includes(provider.providerName)
    );
    
    // Find the best rate for comparison
    const bestRate = Math.max(...(allProviderRates.map((p: any) => p.exchangeRate) || [0]));
    
    return preferredRateData.map((provider: any) => {
      const rateDifference = bestRate - provider.exchangeRate;
      const percentageDiff = bestRate > 0 ? ((rateDifference / bestRate) * 100) : 0;
      
      return {
        name: provider.providerName,
        rate: provider.exchangeRate,
        fee: provider.fee || provider.transferFee || 'Free',
        receivedAmount: provider.receivedAmount,
        totalCost: provider.totalCost || provider.sendAmount,
        logo: provider.providerLogo,
        rateDifference,
        percentageDiff,
        isBest: provider.exchangeRate === bestRate
      };
    }).sort((a, b) => b.rate - a.rate); // Sort by best rate first
  };

  const preferredRates = getPreferredProviderData();



  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Welcome back, {user.firstName}!</h1>
        <p className="text-blue-100 mt-1">Your personalized exchange rate dashboard for {selectedPair}</p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Current Rate</CardTitle>
              <Badge variant="outline">{selectedPair}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentRate ? `${formatRate(currentRate)} ${toCurrency}` : "Loading..."}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Official market rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Best Rate Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {bestRate ? `${formatRate(bestRate)} ${toCurrency}` : "Loading..."}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                {bestProvider || "Loading..."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Your Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preferredProviders.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Selected favorites</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="providers">Your Providers</TabsTrigger>
          <TabsTrigger value="alerts">Rate Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          {/* Calculator Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Quick Calculator
              </CardTitle>
              <CardDescription>
                Enter amount to see what you'll receive from your preferred providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={calculatorAmount}
                    onChange={(e) => setCalculatorAmount(e.target.value)}
                    placeholder="100"
                    className="text-lg"
                  />
                </div>
                <span className="text-lg font-medium">{fromCurrency}</span>
              </div>
            </CardContent>
          </Card>

          {/* Preferred Providers Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Your Preferred Providers for {selectedPair}
              </CardTitle>
              <CardDescription>
                Sending £{calculatorAmount} - sorted by best rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preferredRates.length > 0 ? (
                <div className="space-y-4">
                  {/* Enhanced Rankings Table Headers */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border-2 border-blue-200">
                    <div className="grid grid-cols-12 gap-2 font-bold text-gray-800 text-xs">
                      <div className="col-span-1 text-center">Rank</div>
                      <div className="col-span-4">Provider</div>
                      <div className="col-span-3 text-center">Receive</div>
                      <div className="col-span-2 text-center">Speed</div>
                      <div className="col-span-2 text-center">Rating</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {preferredRates.map((provider: any, index: number) => {
                      const rank = index + 1;
                      const isBest = index === 0;
                      
                      return (
                        <div key={index} className={`rounded-lg border-2 p-4 ${isBest ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'} hover:shadow-md transition-shadow`}>
                          <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Ranking Column */}
                            <div className="col-span-1 text-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isBest ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                {isBest ? '👑' : rank}
                              </div>
                              {isBest && (
                                <div className="text-xs text-green-600 font-bold mt-1">BEST</div>
                              )}
                            </div>

                            {/* Provider Column */}
                            <div className="col-span-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-10 h-10 bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
                                  {provider.logo ? (
                                    <img 
                                      src={provider.logo} 
                                      alt={provider.name}
                                      className="max-h-8 max-w-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-gray-600 font-semibold text-xs">
                                      {provider.name.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold text-sm">{provider.name}</h3>
                                  <div className="text-xs text-gray-600">
                                    Fee: {provider.fee}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Receive Amount Column */}
                            <div className="col-span-3 text-center">
                              <div className="text-2xl font-black text-green-600">
                                {formatRate(provider.receivedAmount)} {toCurrency}
                              </div>
                              {!isBest && provider.rateDifference > 0 && (
                                <div className="mt-1 bg-red-50 border border-red-200 rounded-md p-1">
                                  <div className="text-red-600 text-xs font-bold">
                                    -{formatRate(provider.rateDifference * parseFloat(calculatorAmount))} {toCurrency}
                                  </div>
                                  <div className="text-red-500 text-xs">
                                    {provider.percentageDiff?.toFixed(2)}% less
                                  </div>
                                </div>
                              )}
                              {isBest && (
                                <div className="text-green-600 text-xs font-medium mt-1">Best Available</div>
                              )}
                            </div>

                            {/* Transfer Speed Column */}
                            <div className="col-span-2 text-center">
                              <div className="flex items-center justify-center space-x-1 text-blue-500">
                                <span className="text-sm">⏱️</span>
                                <span className="font-medium text-xs">1-2 days</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Express</div>
                            </div>

                            {/* Rating Column */}
                            <div className="col-span-2 text-center">
                              <div className="flex items-center justify-center text-yellow-500 mb-1">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className="text-xs">⭐</span>
                                ))}
                              </div>
                              <div className="text-xs text-gray-500">4.5 • 1k+ reviews</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Enhanced Compare All button */}
                  <div className="pt-4 border-t">
                    <Button 
                      variant="default" 
                      className="w-full" 
                      onClick={navigateToCompare}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Compare All Providers (£{calculatorAmount})
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No rates available for your preferred providers. You can view all providers using the comparison tool.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Quick Rate Alert for {selectedPair}
              </CardTitle>
              <CardDescription>
                Set up instant email notifications when rates reach your target
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-2">Target Rate ({toCurrency})</label>
                  <Input
                    type="number"
                    value={alertAmount}
                    onChange={(e) => setAlertAmount(e.target.value)}
                    placeholder={`e.g., ${currentRate ? Math.round(currentRate * 1.02) : '2100'}`}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Alert When Rate Goes</label>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        if (alertAmount) {
                          createAlertMutation.mutate({
                            targetValue: parseFloat(alertAmount),
                            alertType: 'above'
                          });
                        }
                      }}
                      disabled={!alertAmount || createAlertMutation.isPending}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {createAlertMutation.isPending ? "Creating..." : "Above"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        if (alertAmount) {
                          createAlertMutation.mutate({
                            targetValue: parseFloat(alertAmount),
                            alertType: 'below'
                          });
                        }
                      }}
                      disabled={!alertAmount || createAlertMutation.isPending}
                    >
                      <TrendingDown className="h-4 w-4 mr-1" />
                      {createAlertMutation.isPending ? "Creating..." : "Below"}
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  You'll receive email notifications when {selectedPair} reaches your target rate. 
                  Current rate: {currentRate ? `${formatRate(currentRate)} ${toCurrency}` : 'Loading...'}
                </AlertDescription>
              </Alert>

              {/* Link to manage all alerts */}
              <div className="pt-4 border-t">
                <Button variant="ghost" className="w-full" onClick={() => window.location.href = '/profile'}>
                  View & Manage All Rate Alerts
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}