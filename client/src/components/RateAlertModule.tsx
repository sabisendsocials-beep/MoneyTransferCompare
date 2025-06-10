import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Bell, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type CurrencyPair = {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromSymbol: string;
  toSymbol: string;
};

const currencyPairs: CurrencyPair[] = [
  { from: "GBP", to: "NGN", fromName: "British Pound", toName: "Nigerian Naira", fromSymbol: "£", toSymbol: "₦" },
  { from: "EUR", to: "NGN", fromName: "Euro", toName: "Nigerian Naira", fromSymbol: "€", toSymbol: "₦" },
  { from: "USD", to: "NGN", fromName: "US Dollar", toName: "Nigerian Naira", fromSymbol: "$", toSymbol: "₦" },
  { from: "GBP", to: "GHS", fromName: "British Pound", toName: "Ghanaian Cedi", fromSymbol: "£", toSymbol: "₵" },
  { from: "EUR", to: "GHS", fromName: "Euro", toName: "Ghanaian Cedi", fromSymbol: "€", toSymbol: "₵" },
  { from: "USD", to: "GHS", fromName: "US Dollar", toName: "Ghanaian Cedi", fromSymbol: "$", toSymbol: "₵" },
  { from: "GBP", to: "KES", fromName: "British Pound", toName: "Kenyan Shilling", fromSymbol: "£", toSymbol: "KSh" },
  { from: "EUR", to: "KES", fromName: "Euro", toName: "Kenyan Shilling", fromSymbol: "€", toSymbol: "KSh" },
  { from: "USD", to: "KES", fromName: "US Dollar", toName: "Kenyan Shilling", fromSymbol: "$", toSymbol: "KSh" },
  { from: "GBP", to: "INR", fromName: "British Pound", toName: "Indian Rupee", fromSymbol: "£", toSymbol: "₹" },
  { from: "EUR", to: "INR", fromName: "Euro", toName: "Indian Rupee", fromSymbol: "€", toSymbol: "₹" },
  { from: "USD", to: "INR", fromName: "US Dollar", toName: "Indian Rupee", fromSymbol: "$", toSymbol: "₹" },
  { from: "GBP", to: "PKR", fromName: "British Pound", toName: "Pakistani Rupee", fromSymbol: "£", toSymbol: "₨" },
  { from: "EUR", to: "PKR", fromName: "Euro", toName: "Pakistani Rupee", fromSymbol: "€", toSymbol: "₨" },
  { from: "USD", to: "PKR", fromName: "US Dollar", toName: "Pakistani Rupee", fromSymbol: "$", toSymbol: "₨" },
];

const RateAlertModule = () => {
  const [selectedPair, setSelectedPair] = useState<string>("GBP-NGN");
  const [alertEmail, setAlertEmail] = useState("");
  const [targetRate, setTargetRate] = useState("");
  const [alertBasis, setAlertBasis] = useState<'official' | 'best_provider'>('best_provider');
  const [showCurrentRates, setShowCurrentRates] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currencyPair = currencyPairs.find(pair => `${pair.from}-${pair.to}` === selectedPair) || currencyPairs[0];

  // Fetch current rates for the selected pair
  const { data: currentRates, error: currentRatesError } = useQuery({
    queryKey: ['/api/rate-alerts/current-rates', selectedPair],
    queryFn: async () => {
      try {
        const [from, to] = selectedPair.split('-');
        const url = `/api/rate-alerts/current-rates?fromCurrency=${from.toUpperCase()}&toCurrency=${to.toUpperCase()}`;
        console.log('Fetching current rates from:', url);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Current rates API error:', response.status, errorText);
          return null;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Response is not JSON:', contentType);
          return null;
        }
        
        const data = await response.json();
        console.log('Current rates response:', data);
        
        if (data && data.success && data.data) {
          return data.data;
        }
        
        console.warn('Invalid response structure:', data);
        return null;
      } catch (error) {
        console.error('Error fetching current rates:', error);
        return null;
      }
    },
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
    staleTime: 60 * 1000, // Consider data stale after 1 minute
  });

  // Create rate alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: {
      email: string;
      fromCurrency: string;
      toCurrency: string;
      targetRate: number;
      rateBasis: 'official' | 'best_provider';
    }) => {
      const response = await fetch('/api/rate-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
      });
      if (!response.ok) throw new Error('Failed to create alert');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Alert Created!",
        description: "You'll receive an email when your target rate is reached.",
      });
      setAlertEmail("");
      setTargetRate("");
      // Alert created successfully - form remains visible for additional alerts
      queryClient.invalidateQueries({ queryKey: ['/api/rate-alerts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create alert",
        variant: "destructive",
      });
    },
  });

  const handleCreateAlert = () => {
    if (!alertEmail || !targetRate) {
      toast({
        title: "Missing Information",
        description: "Please provide your email and target rate.",
        variant: "destructive",
      });
      return;
    }

    const currentRate = alertBasis === 'official' 
      ? currentRates?.officialRate 
      : currentRates?.bestProviderRate;

    const targetValue = parseFloat(targetRate);
    
    if (!currentRate) {
      toast({
        title: "Current Rate Unavailable",
        description: "Unable to fetch current rate. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(targetValue) || targetValue <= currentRate) {
      toast({
        title: "Invalid Target Rate",
        description: `Target rate must be higher than current ${alertBasis === 'official' ? 'official' : 'provider'} rate (${currentRate.toLocaleString()}).`,
        variant: "destructive",
      });
      return;
    }

    const [from, to] = selectedPair.split('-');
    createAlertMutation.mutate({
      email: alertEmail,
      fromCurrency: from,
      toCurrency: to,
      targetRate: targetValue,
      rateBasis: alertBasis,
    });
  };

  // Auto-prefill target rate when rates are available
  const handlePrefillRate = (rateType: 'official' | 'best_provider') => {
    if (!currentRates) return;
    
    const rate = rateType === 'official' 
      ? currentRates.officialRate 
      : currentRates.bestProviderRate;
    
    if (rate) {
      // Add 1% to current rate as suggested target
      const suggestedRate = Math.round(rate * 1.01);
      setTargetRate(suggestedRate.toString());
    }
  };

  return (
    <section className="py-12 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Exchange Rate Alerts</h2>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get instant email notifications when exchange rates reach your target. Never miss a great rate again.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-150 p-8 text-blue-800">
              <h3 className="text-2xl font-bold mb-6">Set Up Your Rate Alert</h3>
              
              <div className="space-y-6">
                {/* Currency Pair Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3 text-blue-600">Currency Pair</label>
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger className="bg-gray-100 border-blue-200 text-blue-800 backdrop-blur-sm h-12 text-base font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyPairs.map((pair) => (
                        <SelectItem key={`${pair.from}-${pair.to}`} value={`${pair.from}-${pair.to}`}>
                          {pair.fromSymbol} {pair.from} to {pair.toSymbol} {pair.to}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate Type Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-blue-600">Rate Type</label>
                    <div className="inline-flex bg-gray-100 rounded-lg p-1 text-sm">
                      <button
                        type="button"
                        onClick={() => setAlertBasis('official')}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          alertBasis === 'official'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-gray-600 hover:text-blue-600'
                        }`}
                      >
                        Official
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlertBasis('best_provider')}
                        className={`px-3 py-1 rounded-md font-medium transition-all ${
                          alertBasis === 'best_provider'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-gray-600 hover:text-blue-600'
                        }`}
                      >
                        Best Provider
                      </button>
                    </div>
                  </div>
                  
                  {/* Current Rates Display */}
                  {currentRates && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg border border-blue-200/30 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-blue-600/80 font-medium">
                            {alertBasis === 'official' ? 'Official Rate' : 'Best Provider Rate'}
                          </div>
                          <div className="text-lg font-bold text-blue-700">
                            {(alertBasis === 'official' ? currentRates.officialRate : currentRates.bestProviderRate)?.toLocaleString() || 'N/A'} {currencyPair.toSymbol}
                          </div>
                          {alertBasis === 'best_provider' && currentRates.bestProviderName && (
                            <div className="text-xs text-blue-600/60">{currentRates.bestProviderName}</div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handlePrefillRate(alertBasis)}
                            className="text-xs bg-blue-400 hover:bg-blue-500 text-white px-3 py-1 rounded transition-all"
                          >
                            Use +1%
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium mb-3 text-blue-600">Email Address</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    className="bg-gray-100 border-blue-200 text-blue-800 backdrop-blur-sm h-12 text-base font-medium focus:border-blue-300 focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                {/* Target Rate Input */}
                <div>
                  <label className="block text-sm font-medium mb-3 text-blue-600">
                    Target Rate ({currencyPair.toSymbol})
                  </label>
                  <Input
                    type="number"
                    placeholder={`Target rate (${currencyPair.toSymbol})`}
                    value={targetRate}
                    onChange={(e) => setTargetRate(e.target.value)}
                    className="bg-gray-100 border-blue-200 text-blue-800 backdrop-blur-sm h-12 text-base font-medium focus:border-blue-300 focus:ring-2 focus:ring-blue-300"
                    step="0.01"
                  />
                  <p className="text-sm text-blue-600/70 mt-2">
                    Target rate must be higher than current {alertBasis === 'official' ? 'official' : 'provider'} rate.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-200 disabled:cursor-not-allowed mt-6"
                  onClick={handleCreateAlert}
                  disabled={createAlertMutation.isPending}
                >
                  {createAlertMutation.isPending ? (
                    "Creating Alert..."
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Create Alert
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-6 bg-gray-50">
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="flex items-start">
                  <Bell className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">How it works:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• We monitor exchange rates every hour</li>
                      <li>• You'll get an email when your target is reached</li>
                      <li>• One alert per email per currency pair</li>
                      <li>• Alerts automatically expire after 30 days</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RateAlertModule;