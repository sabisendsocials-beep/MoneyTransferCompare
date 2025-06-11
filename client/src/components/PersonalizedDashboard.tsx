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

interface PersonalizedDashboardProps {
  user: any;
}

export function PersonalizedDashboard({ user }: PersonalizedDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [alertAmount, setAlertAmount] = useState("");
  
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

  // Fetch best rates for comparison
  const { data: bestRates, isLoading: bestRatesLoading } = useQuery({
    queryKey: ['/api/best-rates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/best-rates');
      return response.json();
    },
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





  // Format currency display
  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
  };

  // Get preferred provider rates from best rates data
  const getPreferredProviderData = () => {
    if (!bestRates || !Array.isArray(bestRates)) return [];
    
    // Filter rates for the current currency pair and preferred providers
    const pairRates = (bestRates as any[]).filter((item: any) => 
      item.fromCurrency === fromCurrency && 
      item.toCurrency === toCurrency &&
      preferredProviders.includes(item.providerName)
    );
    
    return pairRates.map((rate: any) => ({
      name: rate.providerName,
      rate: rate.rate,
      fee: rate.fee || 'Fee info not available',
      timestamp: rate.timestamp
    }));
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Your Preferred Providers for {selectedPair}
              </CardTitle>
              <CardDescription>
                Current rates from your selected providers compared to today's best rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preferredRates.length > 0 ? (
                <div className="space-y-3">
                  {preferredRates.map((provider: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {provider.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {provider.fee ? `Fee: ${provider.fee}` : 'Fee info not available'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {provider.rate ? `${formatRate(provider.rate)} ${toCurrency}` : 'Rate N/A'}
                        </p>
                        {provider.name === bestProvider && (
                          <Badge variant="default" className="text-xs">Best Rate Today</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Quick action to see all providers */}
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = '/compare'}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Compare All Providers
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