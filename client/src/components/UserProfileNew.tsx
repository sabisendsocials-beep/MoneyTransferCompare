import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, User, Settings, Bell, Star, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  preferences?: {
    preferredCurrencyPair: string | null;
    preferredProviders: string[];
  };
  timestamp?: number;
}

interface RateAlert {
  id: number;
  email: string;
  from_currency: string;
  to_currency: string;
  target_value: number;
  trigger_type: string;
  alert_basis: string;
  alert_status: string;
  created_at: string;
  current_rate_at_creation?: number;
}

const CURRENCY_PAIRS = [
  'USD-NGN', 'GBP-NGN', 'EUR-NGN',
  'USD-GHS', 'GBP-GHS', 'EUR-GHS', 
  'USD-KES', 'GBP-KES', 'EUR-KES',
  'USD-PKR', 'GBP-PKR', 'EUR-PKR',
  'USD-INR', 'GBP-INR', 'EUR-INR'
];

const PROVIDERS = [
  'WorldRemit', 'Wise', 'Western Union', 'Remitly', 'Taptap Send',
  'Pesa', 'Sendwave', 'Xoom (PayPal)', 'Lemfi', 'MoneyGram',
  'Nala', 'Remit Choice', 'PaySend', 'Profee', 'Afriexapp', 'TransferGo'
];

export default function UserProfileNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [location] = useLocation();
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);

  // Check if user arrived from registration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSetup = urlParams.get('setup') === 'true';
    setIsSetupMode(isSetup);
    
    if (isSetup) {
      // Clear the setup parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location]);

  // Use fresh endpoint to bypass cache
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/user-fresh'],
    retry: false,
  });

  const { data: rateAlerts = [], isLoading: alertsLoading } = useQuery<RateAlert[]>({
    queryKey: ['/api/auth/rate-alerts'],
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  console.log('Fresh user data:', user);
  console.log('Fresh preferences:', user?.preferences);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { preferredCurrencyPair?: string; preferredProviders?: string[] }) => {
      return apiRequest('POST', '/api/auth/preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user-fresh'] });
      queryClient.refetchQueries({ queryKey: ['/api/auth/user-fresh'] });
      
      if (isSetupMode) {
        setSetupCompleted(true);
        toast({
          title: "Great! Your preferences are set",
          description: "You're all set up for a personalised experience. Explore the app to see rates for your preferred currencies.",
        });
      } else {
        toast({
          title: "Success",
          description: "Preferences updated successfully",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  // Delete rate alert mutation using simplified POST endpoint
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest('POST', '/api/delete-alert', { alertId });
    },
    onSuccess: () => {
      // Force complete cache refresh for rate alerts
      queryClient.removeQueries({ queryKey: ['/api/auth/rate-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/rate-alerts'] });
      queryClient.refetchQueries({ queryKey: ['/api/auth/rate-alerts'] });
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
        title: "Provider already added",
        description: "This provider is already in your preferences",
        variant: "destructive",
      });
      return;
    }

    updatePreferencesMutation.mutate({
      preferredCurrencyPair: user?.preferences?.preferredCurrencyPair || undefined,
      preferredProviders: [...currentProviders, selectedProvider]
    });
    setSelectedProvider('');
  };

  const handleRemoveProvider = (providerToRemove: string) => {
    const updatedProviders = (user?.preferences?.preferredProviders || [])
      .filter(provider => provider !== providerToRemove);
    
    updatePreferencesMutation.mutate({
      preferredCurrencyPair: user?.preferences?.preferredCurrencyPair || undefined,
      preferredProviders: updatedProviders
    });
  };

  if (userLoading || alertsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>No user data available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Profile & Preferences</h1>
      </div>

      {/* Welcome message for new users */}
      {isSetupMode && !setupCompleted && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Star className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <strong>Welcome to SabiSend!</strong> Set up your preferences below to get personalised rates and recommendations for your money transfers.
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="text-blue-600 hover:text-blue-700 ml-4"
              >
                Skip for now <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success message when setup is completed */}
      {setupCompleted && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <Star className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <div className="flex items-center justify-between">
              <div>
                <strong>Perfect!</strong> Your preferences are saved. You'll now see personalised rates on your dashboard.
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="text-green-600 hover:text-green-700 ml-4"
              >
                Explore Dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Currency & Provider Preferences
          </CardTitle>
          <CardDescription>
            Set your preferred currency pair and providers for personalised rate comparisons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Currency Pair Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Currency Pair</label>
            <Select
              value={user.preferences?.preferredCurrencyPair || undefined}
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

          {/* Provider Management */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Preferred Providers</label>
            
            {/* Current Providers */}
            {user.preferences?.preferredProviders && user.preferences.preferredProviders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Current providers:</p>
                <div className="flex flex-wrap gap-2">
                  {user.preferences.preferredProviders.map((provider) => (
                    <Badge key={provider} variant="secondary" className="flex items-center gap-1">
                      {provider}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveProvider(provider)}
                        disabled={updatePreferencesMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Provider */}
            <div className="flex gap-2">
              <Select
                value={selectedProvider}
                onValueChange={setSelectedProvider}
                disabled={updatePreferencesMutation.isPending}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a provider to add" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.filter(provider => 
                    !user.preferences?.preferredProviders?.includes(provider)
                  ).map((provider) => (
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
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Alerts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Rate Alerts ({rateAlerts.length})
          </CardTitle>
          <CardDescription>
            Manage your active rate alert notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rateAlerts.length === 0 ? (
            <p className="text-gray-500">No active rate alerts</p>
          ) : (
            <div className="space-y-2">
              {rateAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">
                      {alert.from_currency}/{alert.to_currency}
                    </div>
                    <div className="text-sm text-gray-600">
                      Alert when {alert.alert_basis} rate reaches {alert.target_value}
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(alert.created_at).toLocaleDateString()}
                      {alert.current_rate_at_creation && (
                        <span className="ml-2">
                          (Rate was {alert.current_rate_at_creation} when created)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAlertMutation.mutate(alert.id)}
                    disabled={deleteAlertMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
  );
}