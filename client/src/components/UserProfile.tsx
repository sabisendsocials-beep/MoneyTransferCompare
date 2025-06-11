import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  preferences?: {
    preferredCurrencyPair?: string;
    preferredProviders?: string[];
  };
}

interface RateAlert {
  id: number;
  userId: string;
  email: string;
  fromCurrency: string;
  toCurrency: string;
  targetRate: number;
  direction: string;
  isActive: boolean;
  createdAt: string;
}

const CURRENCY_PAIRS = [
  'GBP-NGN', 'EUR-NGN', 'USD-NGN',
  'GBP-GHS', 'EUR-GHS', 'USD-GHS',
  'GBP-KES', 'EUR-KES', 'USD-KES',
  'GBP-INR', 'EUR-INR', 'USD-INR',
  'GBP-PKR', 'EUR-PKR', 'USD-PKR'
];

const PROVIDERS = [
  'WorldRemit', 'Wise', 'Western Union', 'Remitly', 'Xoom (PayPal)',
  'Taptap Send', 'Sendwave', 'MoneyGram', 'Pesa', 'Lemfi',
  'Nala', 'Remit Choice', 'TransferGo', 'Profee', 'Afriexapp'
];

export default function UserProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Fetch user data with preferences
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/user', Date.now()], // Force cache invalidation
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch rate alerts
  const { data: rateAlerts = [], isLoading: alertsLoading } = useQuery<RateAlert[]>({
    queryKey: ['/api/auth/rate-alerts'],
    retry: false,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { preferredCurrencyPair?: string; preferredProviders?: string[] }) => {
      return apiRequest('POST', '/api/auth/preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  // Delete rate alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest('DELETE', `/api/auth/rate-alerts/${alertId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/rate-alerts'] });
      toast({
        title: "Success",
        description: "Rate alert deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rate alert",
        variant: "destructive",
      });
    },
  });

  const handleCurrencyPairChange = (value: string) => {
    updatePreferencesMutation.mutate({
      preferredCurrencyPair: value,
      preferredProviders: user?.preferences?.preferredProviders || []
    });
  };

  const handleAddProvider = () => {
    if (!selectedProvider) return;
    
    const currentProviders = user?.preferences?.preferredProviders || [];
    if (currentProviders.includes(selectedProvider)) {
      toast({
        title: "Already added",
        description: "This provider is already in your preferences",
        variant: "destructive",
      });
      return;
    }

    updatePreferencesMutation.mutate({
      preferredCurrencyPair: user?.preferences?.preferredCurrencyPair,
      preferredProviders: [...currentProviders, selectedProvider]
    });
    setSelectedProvider('');
  };

  const handleRemoveProvider = (provider: string) => {
    const currentProviders = user?.preferences?.preferredProviders || [];
    updatePreferencesMutation.mutate({
      preferredCurrencyPair: user?.preferences?.preferredCurrencyPair,
      preferredProviders: currentProviders.filter(p => p !== provider)
    });
  };

  if (userLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600">Please log in to view your profile</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-gray-600">Manage your preferences and rate alerts</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your basic account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-lg">{user.email}</p>
              </div>
              {(user.firstName || user.lastName) && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-lg">{user.firstName} {user.lastName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Set your preferred currency pair and providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Currency Pair Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Currency Pair</label>
                <Select
                  value={user.preferences?.preferredCurrencyPair || ''}
                  onValueChange={handleCurrencyPairChange}
                  disabled={updatePreferencesMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a currency pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_PAIRS.map((pair) => (
                      <SelectItem key={pair} value={pair}>
                        {pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Providers */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Preferred Providers</label>
                
                {/* Current providers */}
                <div className="flex flex-wrap gap-2">
                  {user.preferences?.preferredProviders?.length ? (
                    user.preferences.preferredProviders.map((provider) => (
                      <Badge key={provider} variant="secondary" className="flex items-center gap-1">
                        {provider}
                        <button
                          onClick={() => handleRemoveProvider(provider)}
                          className="ml-1 hover:text-red-600"
                          disabled={updatePreferencesMutation.isPending}
                        >
                          <X size={12} />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No preferred providers selected</p>
                  )}
                </div>

                {/* Add new provider */}
                <div className="flex gap-2">
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select provider to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.filter(p => !(user.preferences?.preferredProviders || []).includes(p)).map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddProvider}
                    disabled={!selectedProvider || updatePreferencesMutation.isPending}
                    size="sm"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rate Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Alerts</CardTitle>
            <CardDescription>Your active rate alert notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : rateAlerts.length > 0 ? (
              <div className="space-y-3">
                {rateAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {alert.fromCurrency} → {alert.toCurrency}
                      </div>
                      <div className="text-sm text-gray-600">
                        Target: {alert.targetRate} ({alert.direction === 'above' ? '≥' : '≤'})
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAlertMutation.mutate(alert.id)}
                      disabled={deleteAlertMutation.isPending}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">
                No rate alerts configured. Create one from the comparison page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}