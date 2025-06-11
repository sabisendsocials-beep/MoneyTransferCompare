import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Settings, Bell, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCY_PAIRS = [
  "GBP-NGN", "GBP-GHS", "GBP-KES", "GBP-INR", "GBP-PKR",
  "EUR-NGN", "EUR-GHS", "EUR-KES", "EUR-INR", "EUR-PKR",
  "USD-NGN", "USD-GHS", "USD-KES", "USD-INR", "USD-PKR"
];

const PROVIDERS = [
  "Wise", "WorldRemit", "Remitly", "Western Union", "MoneyGram",
  "Sendwave", "Taptap Send", "Xoom (PayPal)", "Lemfi", "Nala",
  "Afriexapp", "Pesa", "Profee", "TransferGo", "Remit Choice"
];

const UserProfile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [newCurrencyPair, setNewCurrencyPair] = useState("");
  const [newProvider, setNewProvider] = useState("");

  // Fetch user profile data  
  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
    retry: false,
  });



  // Fetch user rate alerts
  const { data: rateAlertsData, isLoading: alertsLoading, error: alertsError } = useQuery({
    queryKey: ["/api/auth/rate-alerts"],
    enabled: !!user,
    retry: false,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: { preferredCurrencyPairs: string[], preferredProviders: string[] }) => {
      return apiRequest("POST", "/api/auth/preferences", preferences);
    },
    onSuccess: () => {
      // Force cache invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Preferences updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  // Cancel rate alert mutation
  const cancelAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest("DELETE", `/api/auth/rate-alerts/${alertId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/rate-alerts"] });
      toast({
        title: "Alert cancelled",
        description: "Rate alert has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel alert",
        variant: "destructive",
      });
    },
  });

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Please log in to view your profile.</p>
          <Button className="mt-4" onClick={() => window.location.href = "/login"}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (profileLoading || alertsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (profileError || alertsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-600">Error loading profile data. Please try refreshing the page.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  const preferences = (profileData as any)?.preferences || { preferredCurrencyPair: null, preferredProviders: [] };
  const alerts = Array.isArray(rateAlertsData) ? rateAlertsData : [];

  // Debug what we're actually receiving
  console.log('=== FRONTEND DEBUG ===');
  console.log('Profile data received:', profileData);
  console.log('Preferences object:', preferences);
  console.log('Currency pair:', preferences.preferredCurrencyPair);
  console.log('Providers:', preferences.preferredProviders);
  console.log('=== END FRONTEND DEBUG ===');

  const setCurrencyPair = () => {
    if (!newCurrencyPair) return;
    
    updatePreferencesMutation.mutate({
      preferredCurrencyPair: newCurrencyPair,
      preferredProviders: preferences.preferredProviders
    });
    setNewCurrencyPair("");
  };

  const removeCurrencyPair = () => {
    updatePreferencesMutation.mutate({
      preferredCurrencyPair: null,
      preferredProviders: preferences.preferredProviders
    });
  };

  const addProvider = () => {
    if (!newProvider || preferences.preferredProviders.includes(newProvider)) return;
    
    const updatedProviders = [...preferences.preferredProviders, newProvider].slice(0, 3);
    updatePreferencesMutation.mutate({
      preferredCurrencyPairs: preferences.preferredCurrencyPairs,
      preferredProviders: updatedProviders
    });
    setNewProvider("");
  };

  const removeProvider = (provider: string) => {
    const updatedProviders = preferences.preferredProviders.filter((p: string) => p !== provider);
    updatePreferencesMutation.mutate({
      preferredCurrencyPairs: preferences.preferredCurrencyPairs,
      preferredProviders: updatedProviders
    });
  };

  const formatCurrencyPair = (pair: string) => {
    const [from, to] = pair.split('-');
    return `${from} → ${to}`;
  };

  const formatAlertDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* User Info Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Settings className="h-6 w-6" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {user.profileImageUrl && (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-gray-600">{user.email}</p>
              </div>
              <div className="ml-auto">
                <Button variant="outline" onClick={() => window.location.href = "/api/logout"}>
                  Log Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferred Currency Pairs */}
        <Card>
          <CardHeader>
            <CardTitle>Preferred Currency Pairs (Max 3)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {preferences.preferredCurrencyPairs.map((pair: string) => (
                <Badge key={pair} variant="secondary" className="flex items-center gap-2">
                  {formatCurrencyPair(pair)}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeCurrencyPair(pair)}
                  />
                </Badge>
              ))}
            </div>
            
            {preferences.preferredCurrencyPairs.length < 3 && (
              <div className="flex gap-2">
                <Select value={newCurrencyPair} onValueChange={setNewCurrencyPair}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select currency pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_PAIRS
                      .filter(pair => !preferences.preferredCurrencyPairs.includes(pair))
                      .map(pair => (
                        <SelectItem key={pair} value={pair}>
                          {formatCurrencyPair(pair)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={addCurrencyPair} disabled={!newCurrencyPair}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferred Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Preferred Providers (Max 3)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {preferences.preferredProviders.map((provider: string) => (
                <Badge key={provider} variant="secondary" className="flex items-center gap-2">
                  {provider}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeProvider(provider)}
                  />
                </Badge>
              ))}
            </div>
            
            {preferences.preferredProviders.length < 3 && (
              <div className="flex gap-2">
                <Select value={newProvider} onValueChange={setNewProvider}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS
                      .filter(provider => !preferences.preferredProviders.includes(provider))
                      .map(provider => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={addProvider} disabled={!newProvider}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rate Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Bell className="h-6 w-6" />
              Your Rate Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <p className="text-gray-500">Loading alerts...</p>
            ) : alerts.length === 0 ? (
              <p className="text-gray-500">No active rate alerts. Create one from the rate alert section on the homepage.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {alert.from_currency} → {alert.to_currency}
                      </div>
                      <div className="text-sm text-gray-600">
                        Alert when {alert.alert_basis} rate {alert.trigger_type === 'absolute' ? 'reaches' : 'changes by'} {alert.target_value}
                        {alert.trigger_type === 'percentage' ? '%' : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {formatAlertDate(alert.created_at)} • Status: {alert.alert_status}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelAlertMutation.mutate(alert.id)}
                      disabled={cancelAlertMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;