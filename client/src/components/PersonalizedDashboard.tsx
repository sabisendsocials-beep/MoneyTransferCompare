import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Bell, Calculator, Star, ArrowRight, Building2, Award, LineChart, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import NewsSection from "@/components/NewsSection";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PersonalizedDashboardProps {
  user: any;
}

export function PersonalizedDashboard({ user }: PersonalizedDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [alertAmount, setAlertAmount] = useState("");
  const [calculatorAmount, setCalculatorAmount] = useState("100");
  const [alertBasis, setAlertBasis] = useState<'official' | 'best_provider'>('official');
  const [trendPeriod, setTrendPeriod] = useState<'7' | '30' | '90' | '365'>('7');
  
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

  // Fetch rate trends for yesterday comparison
  const { data: rateTrends } = useQuery({
    queryKey: ['/api/rate-trends', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/rate-trends?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&days=2`);
      return response.json();
    },
  });

  // Fetch rate trends for chart based on selected period
  const { data: chartTrends } = useQuery({
    queryKey: ['/api/rate-trends', fromCurrency, toCurrency, `${trendPeriod}days`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/rate-trends?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&days=${trendPeriod}`);
      return response.json();
    },
  });

  // Fetch rate stats for performance metrics
  const { data: rateStats } = useQuery({
    queryKey: ['/api/rate-stats', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/rate-stats?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`);
      return response.json();
    },
  });

  // Rate alert creation
  const createAlertMutation = useMutation({
    mutationFn: async (data: { targetValue: number; alertBasis: 'official' | 'best_provider' }) => {
      return apiRequest('POST', '/api/rate-alerts', {
        email: user.email,
        fromCurrency,
        toCurrency,
        alertBasis: data.alertBasis,
        triggerType: 'absolute',
        targetValue: data.targetValue,
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

  // Calculate rate change from yesterday
  const calculateRateChange = () => {
    if (!rateTrends || !Array.isArray(rateTrends) || rateTrends.length < 2) {
      return { change: 0, percentage: 0, direction: 'neutral' };
    }
    
    const today = rateTrends[rateTrends.length - 1]?.rate || 0;
    const yesterday = rateTrends[rateTrends.length - 2]?.rate || 0;
    
    if (yesterday === 0) return { change: 0, percentage: 0, direction: 'neutral' };
    
    const change = today - yesterday;
    const percentage = (change / yesterday) * 100;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    
    return { change, percentage, direction };
  };

  const rateChange = calculateRateChange();

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
        comment: provider.comment,
        deliverySpeed: provider.deliverySpeed || '1-2 days',
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Rate Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                  {/* Best Rate Today Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Best Rate Today</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          ₦{formatRate(bestRate * parseFloat(calculatorAmount))}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {bestProvider} • £→₦
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          rateChange.direction === 'up' ? 'text-green-600' : 
                          rateChange.direction === 'down' ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {rateChange.direction === 'up' ? '↗' : rateChange.direction === 'down' ? '↘' : '→'} 
                          {rateChange.direction !== 'neutral' ? 
                            `${rateChange.percentage > 0 ? '+' : ''}${rateChange.percentage.toFixed(2)}% today` : 
                            'No change'
                          }
                        </div>
                        <div className="text-xs text-gray-500">vs yesterday</div>
                      </div>
                    </div>
                  </div>

                  {/* Your Providers Cards */}
                  <div>
                    <div className="text-sm text-gray-600 mb-3">Your Providers • {preferredRates.length} selected favorites</div>
                    <div className="grid gap-3">
                      {preferredRates.map((provider: any, index: number) => {
                        const bestMarketAmount = bestRate * parseFloat(calculatorAmount);
                        const difference = bestMarketAmount - provider.receivedAmount;
                        const isBest = provider.name === bestProvider;
                        
                        return (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 text-sm">{provider.name}</h3>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {provider.fee} • {provider.deliverySpeed}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                  ₦{formatRate(provider.receivedAmount)}
                                </div>
                                {isBest ? (
                                  <div className="text-green-600 text-xs font-medium">
                                    👑 Best rate
                                  </div>
                                ) : difference > 0 ? (
                                  <div className="text-red-500 text-xs">
                                    -₦{formatRate(difference)} vs best
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Compare All button */}
                  <div className="pt-2">
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

          {/* Exchange Rate Trends Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Exchange Rate Trends for {selectedPair.replace('-', '→')}
              </CardTitle>
              <CardDescription>
                Track rate performance over different time periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Historical Performance Info */}
              {rateStats && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Historical Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">1 Month Change</div>
                      <div className={`text-lg font-semibold ${(rateStats.oneMonth || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {(rateStats.oneMonth || 0) >= 0 ? '+' : ''}{(rateStats.oneMonth || 0).toFixed(2)}% {(rateStats.oneMonth || 0) >= 0 ? '↗' : '↘'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">3 Month Change</div>
                      <div className={`text-lg font-semibold ${(rateStats.threeMonth || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {(rateStats.threeMonth || 0) >= 0 ? '+' : ''}{(rateStats.threeMonth || 0).toFixed(2)}% {(rateStats.threeMonth || 0) >= 0 ? '↗' : '↘'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">1 Year Change</div>
                      <div className={`text-lg font-semibold ${(rateStats.oneYear || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {(rateStats.oneYear || 0) >= 0 ? '+' : ''}{(rateStats.oneYear || 0).toFixed(1)}% {(rateStats.oneYear || 0) >= 0 ? '↗' : '↘'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Tabs value={trendPeriod} onValueChange={(value) => setTrendPeriod(value as '7' | '30' | '90' | '365')} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="7">7 Days</TabsTrigger>
                  <TabsTrigger value="30">30 Days</TabsTrigger>
                  <TabsTrigger value="90">90 Days</TabsTrigger>
                  <TabsTrigger value="365">1 Year</TabsTrigger>
                </TabsList>

                <TabsContent value="7">
                  {chartTrends && Array.isArray(chartTrends) && chartTrends.length > 0 ? (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={chartTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                          />
                          <YAxis 
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(value) => formatRate(value)}
                          />
                          <Tooltip 
                            formatter={(value) => [formatRate(Number(value)), 'Rate']}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString();
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#2563eb" 
                            strokeWidth={2}
                            dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      Loading 7-day trend data...
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="30">
                  {chartTrends && Array.isArray(chartTrends) && chartTrends.length > 0 ? (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={chartTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                          />
                          <YAxis 
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(value) => formatRate(value)}
                          />
                          <Tooltip 
                            formatter={(value) => [formatRate(Number(value)), 'Rate']}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString();
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#2563eb" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      Loading 30-day trend data...
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="90">
                  {chartTrends && Array.isArray(chartTrends) && chartTrends.length > 0 ? (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={chartTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                          />
                          <YAxis 
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(value) => formatRate(value)}
                          />
                          <Tooltip 
                            formatter={(value) => [formatRate(Number(value)), 'Rate']}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString();
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#2563eb" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      Loading 90-day trend data...
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="365">
                  {chartTrends && Array.isArray(chartTrends) && chartTrends.length > 0 ? (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={chartTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                          />
                          <YAxis 
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(value) => formatRate(value)}
                          />
                          <Tooltip 
                            formatter={(value) => [formatRate(Number(value)), 'Rate']}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString();
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#2563eb" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      Loading 1-year trend data...
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                  <label className="text-sm font-medium">Rate Type</label>
                  <div className="bg-gray-100 rounded-lg p-1 flex">
                    <Button
                      variant={alertBasis === 'official' ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => setAlertBasis('official')}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Official
                    </Button>
                    <Button
                      variant={alertBasis === 'best_provider' ? 'default' : 'ghost'}
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => setAlertBasis('best_provider')}
                    >
                      <Award className="h-4 w-4 mr-1" />
                      Best Provider
                    </Button>
                  </div>
                </div>
              </div>

              {/* Create Alert Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    if (alertAmount) {
                      createAlertMutation.mutate({
                        targetValue: parseFloat(alertAmount),
                        alertBasis: alertBasis
                      });
                    }
                  }}
                  disabled={!alertAmount || createAlertMutation.isPending}
                  className="w-full md:w-auto px-8"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {createAlertMutation.isPending ? "Creating Alert..." : "Create Alert"}
                </Button>
              </div>

              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  You'll receive email notifications when {selectedPair} reaches your target rate.
                  <div className="mt-2 text-sm">
                    <div>Official Rate: {currentRate ? `${formatRate(currentRate)} ${toCurrency}` : 'Loading...'}</div>
                    <div>Best Provider Rate: {bestRate ? `${formatRate(bestRate)} ${toCurrency}` : 'Loading...'} ({bestProvider})</div>
                  </div>
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

      {/* News Section */}
      <div className="mt-8">
        <NewsSection />
      </div>
    </div>
  );
}