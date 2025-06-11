import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Bell, Calculator, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PersonalizedHomeProps {
  user: any;
}

export function PersonalizedHome({ user }: PersonalizedHomeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [alertAmount, setAlertAmount] = useState("");
  const [selectedPair, setSelectedPair] = useState(user.preferences?.preferredCurrencyPair || "GBP-NGN");
  const [calculatorAmount, setCalculatorAmount] = useState("1000");

  const [fromCurrency, toCurrency] = selectedPair.split("-");

  // Fetch current rates for preferred currency pair
  const { data: currentRates } = useQuery({
    queryKey: ['/api/rate-alerts/current-rates', fromCurrency, toCurrency],
    queryFn: () => apiRequest('GET', `/api/rate-alerts/current-rates?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`),
  });

  // Fetch best rates for comparison
  const { data: bestRates } = useQuery({
    queryKey: ['/api/best-rates'],
  });

  // Fetch rate trends
  const { data: rateTrends } = useQuery({
    queryKey: ['/api/rate-trends', fromCurrency, toCurrency],
    queryFn: () => apiRequest('GET', `/api/rate-trends?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&days=30`),
  });

  // Fetch all providers for calculator
  const { data: allProviders } = useQuery({
    queryKey: ['/api/compare', fromCurrency, toCurrency, calculatorAmount],
    queryFn: () => apiRequest('POST', '/api/compare', {
      fromCurrency,
      toCurrency,
      amount: parseFloat(calculatorAmount),
      type: 'basic'
    }),
    enabled: !!calculatorAmount && !isNaN(parseFloat(calculatorAmount)),
  });

  // Create rate alert mutation
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

  const currencyPairs = [
    "GBP-NGN", "USD-NGN", "EUR-NGN",
    "GBP-GHS", "USD-GHS", "EUR-GHS", 
    "GBP-KES", "USD-KES", "EUR-KES",
    "GBP-INR", "USD-INR", "EUR-INR",
    "GBP-PKR", "USD-PKR", "EUR-PKR"
  ];

  const preferredProviders = user.preferences?.preferredProviders || [];
  const currentRate = (currentRates as any)?.data?.officialRate;
  const bestProvider = (currentRates as any)?.data?.bestProviderName;
  const bestRate = (currentRates as any)?.data?.bestProviderRate;

  // Calculate trend data
  const calculateTrendStats = () => {
    if (!rateTrends || !Array.isArray(rateTrends) || rateTrends.length < 2) return null;
    
    const latest = (rateTrends as any)[rateTrends.length - 1];
    const previous = (rateTrends as any)[rateTrends.length - 2];
    const weekAgo = (rateTrends as any)[Math.max(0, rateTrends.length - 7)];
    
    const dailyChange = ((latest.rate - previous.rate) / previous.rate) * 100;
    const weeklyChange = ((latest.rate - weekAgo.rate) / weekAgo.rate) * 100;
    
    return {
      current: latest.rate,
      dailyChange,
      weeklyChange,
      isUp: dailyChange > 0
    };
  };

  const trendStats = calculateTrendStats();

  // Get preferred provider rates
  const getPreferredProviderRates = () => {
    const rates = bestRates as any[];
    if (!rates || !preferredProviders.length) return [];
    
    const pairRates = rates.find((rate: any) => 
      rate.fromCurrency === fromCurrency && rate.toCurrency === toCurrency
    );
    
    if (!pairRates) return [];
    
    return preferredProviders.map(providerName => {
      const provider = pairRates.providers?.find((p: any) => p.name === providerName);
      return provider ? { ...provider, isPreferred: true } : null;
    }).filter(Boolean);
  };

  const preferredRates = getPreferredProviderRates();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Welcome back, {user.firstName}!</h1>
        <p className="text-blue-100 mt-1">Here's your personalized exchange rate dashboard</p>
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
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">
                {currentRate ? formatCurrency(currentRate, toCurrency) : "Loading..."}
              </span>
              {trendStats && (
                <div className={`flex items-center ${trendStats.isUp ? 'text-green-600' : 'text-red-600'}`}>
                  {trendStats.isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-sm ml-1">{formatPercentage(Math.abs(trendStats.dailyChange))}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Best Rate Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {bestRate ? formatCurrency(bestRate, toCurrency) : "Loading..."}
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
            <CardTitle className="text-sm font-medium">Weekly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {trendStats ? (
                <>
                  <span className={`text-2xl font-bold ${trendStats.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trendStats.weeklyChange >= 0 ? '+' : ''}{formatPercentage(trendStats.weeklyChange)}%
                  </span>
                  {trendStats.weeklyChange >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                </>
              ) : (
                <span className="text-2xl font-bold">Loading...</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="preferred" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferred">Your Providers</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="alerts">Quick Alert</TabsTrigger>
        </TabsList>

        <TabsContent value="preferred" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Your Preferred Providers for {selectedPair}
              </CardTitle>
              <CardDescription>
                Current rates from your selected providers compared to the best available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preferredRates.length > 0 ? (
                <div className="space-y-3">
                  {preferredRates.map((provider: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {provider.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Fee: {provider.fee || 'Not available'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {provider.rate ? formatCurrency(provider.rate, toCurrency) : 'N/A'}
                        </p>
                        {provider.name === bestProvider && (
                          <Badge variant="default" className="text-xs">Best Rate</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No rates available for your preferred providers. You can view all providers in the Calculator tab.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Currency Calculator
              </CardTitle>
              <CardDescription>
                Compare rates across all providers for any amount
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency Pair</label>
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyPairs.map(pair => (
                        <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ({fromCurrency})</label>
                  <Input
                    type="number"
                    value={calculatorAmount}
                    onChange={(e) => setCalculatorAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              {(allProviders as any)?.providers && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="font-medium">All Available Providers</h4>
                  <div className="grid gap-3">
                    {(allProviders as any).providers.slice(0, 6).map((provider: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-sm">
                              {provider.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{provider.name}</p>
                            <p className="text-sm text-muted-foreground">
                              You get: {formatCurrency(provider.amountReceived || 0, toCurrency)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(provider.rate || 0, toCurrency)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Fee: {provider.fee || 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Quick Rate Alert
              </CardTitle>
              <CardDescription>
                Set up instant notifications for {selectedPair} rate changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Rate</label>
                  <Input
                    type="number"
                    value={alertAmount}
                    onChange={(e) => setAlertAmount(e.target.value)}
                    placeholder={`e.g., ${currentRate ? Math.round(currentRate * 1.02) : '2100'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alert Type</label>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
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
                      <Target className="h-4 w-4 mr-1" />
                      Above
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
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
                      <Target className="h-4 w-4 mr-1" />
                      Below
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  You'll receive email notifications when {selectedPair} reaches your target rate.
                  Current rate: {currentRate ? formatCurrency(currentRate, toCurrency) : 'Loading...'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}