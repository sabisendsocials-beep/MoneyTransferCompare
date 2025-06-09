/**
 * Rate Alert Form Component
 * Allows users to create rate alerts with real-time validation
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bell, TrendingUp, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CURRENCY_OPTIONS = [
  { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { value: 'NGN', label: 'Nigerian Naira (NGN)', symbol: '₦' },
  { value: 'GHS', label: 'Ghanaian Cedi (GHS)', symbol: '₵' },
  { value: 'KES', label: 'Kenyan Shilling (KES)', symbol: 'KSh' },
  { value: 'INR', label: 'Indian Rupee (INR)', symbol: '₹' },
  { value: 'PKR', label: 'Pakistani Rupee (PKR)', symbol: 'Rs' },
];

const alertFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fromCurrency: z.string().min(3, 'Please select a source currency'),
  toCurrency: z.string().min(3, 'Please select a target currency'),
  alertBasis: z.enum(['official', 'best_provider'], {
    required_error: 'Please select a rate basis',
  }),
  triggerType: z.enum(['absolute', 'percentage'], {
    required_error: 'Please select a trigger type',
  }),
  targetValue: z.number().positive('Target value must be positive'),
});

type AlertFormData = z.infer<typeof alertFormSchema>;

interface CurrentRates {
  officialRate: number | null;
  bestProviderRate: number | null;
  bestProviderName: string | null;
}

export function RateAlertForm() {
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      fromCurrency: 'GBP',
      toCurrency: 'NGN',
      alertBasis: 'official',
      triggerType: 'percentage',
    },
  });

  const fromCurrency = form.watch('fromCurrency');
  const toCurrency = form.watch('toCurrency');

  const [currentRates, setCurrentRates] = useState<CurrentRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  // Fetch current rates when currency pair changes
  useEffect(() => {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
      setCurrentRates(null);
      return;
    }

    const fetchRates = async () => {
      setIsLoadingRates(true);
      try {
        const response = await fetch(
          `/api/rate-alerts/current-rates?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCurrentRates(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
      } finally {
        setIsLoadingRates(false);
      }
    };

    const timeoutId = setTimeout(fetchRates, 500);
    return () => clearTimeout(timeoutId);
  }, [fromCurrency, toCurrency]);

  const validateAlert = async (formData: AlertFormData) => {
    try {
      const response = await fetch('/api/rate-alerts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      
      if (data.success && !data.isValid) {
        setValidationError(data.error);
        return false;
      }
      
      setValidationError(null);
      return true;
    } catch (error) {
      console.error('Error validating alert:', error);
      return true; // Allow submission if validation fails
    }
  };

  const onSubmit = async (data: AlertFormData) => {
    setIsCreatingAlert(true);
    setValidationError(null);
    
    try {
      // Validate before submission
      const isValid = await validateAlert(data);
      if (!isValid) {
        setIsCreatingAlert(false);
        return;
      }

      const response = await fetch('/api/rate-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Rate Alert Created',
          description: `You'll receive an email when ${data.fromCurrency}/${data.toCurrency} reaches your target rate.`,
        });
        form.reset();
        setCurrentRates(null);
      } else {
        toast({
          title: 'Alert Creation Failed',
          description: result.error || 'Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to create rate alert. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    return CURRENCY_OPTIONS.find(c => c.value === currency)?.symbol || currency;
  };

  const formatRate = (rate: number | null, currency: string) => {
    if (rate === null) return 'N/A';
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  const calculateTargetRate = () => {
    const { alertBasis, triggerType, targetValue } = form.getValues();
    
    if (!currentRates || !targetValue) return null;
    
    const baseRate = alertBasis === 'official' ? currentRates.officialRate : currentRates.bestProviderRate;
    if (baseRate === null) return null;
    
    if (triggerType === 'absolute') {
      return targetValue;
    } else {
      return baseRate * (1 + targetValue / 100);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Rate Alert
        </CardTitle>
        <CardDescription>
          Get notified when your target exchange rate is reached. One-time email alerts for price movements.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Currency Pair Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Currency</Label>
              <Select
                value={form.watch('fromCurrency')}
                onValueChange={(value) => form.setValue('fromCurrency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Currency</Label>
              <Select
                value={form.watch('toCurrency')}
                onValueChange={(value) => form.setValue('toCurrency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current Rates Display */}
          {isLoadingRates && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Loading current rates...</span>
            </div>
          )}

          {currentRates && !isLoadingRates && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>Current Rates:</strong></p>
                  <p>Official Rate: {formatRate(currentRates.officialRate, form.watch('toCurrency'))}</p>
                  <p>
                    Best Provider Rate: {formatRate(currentRates.bestProviderRate, form.watch('toCurrency'))}
                    {currentRates.bestProviderName && ` (${currentRates.bestProviderName})`}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Alert Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rate Basis</Label>
              <Select
                value={form.watch('alertBasis')}
                onValueChange={(value: 'official' | 'best_provider') => form.setValue('alertBasis', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">Official Base Rate</SelectItem>
                  <SelectItem value="best_provider">Best Provider Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select
                value={form.watch('triggerType')}
                onValueChange={(value: 'absolute' | 'percentage') => form.setValue('triggerType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="absolute">Absolute Value</SelectItem>
                  <SelectItem value="percentage">Percentage Increase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Value Input */}
          <div className="space-y-2">
            <Label htmlFor="targetValue">
              {form.watch('triggerType') === 'absolute' 
                ? `Target Rate (${getCurrencySymbol(form.watch('toCurrency'))})`
                : 'Percentage Increase (%)'}
            </Label>
            <Input
              id="targetValue"
              type="number"
              step={form.watch('triggerType') === 'absolute' ? '0.0001' : '0.1'}
              placeholder={form.watch('triggerType') === 'absolute' ? '2150.00' : '3.0'}
              {...form.register('targetValue', { valueAsNumber: true })}
            />
            {form.formState.errors.targetValue && (
              <p className="text-sm text-red-600">{form.formState.errors.targetValue.message}</p>
            )}
            
            {/* Target Rate Preview */}
            {(() => {
              const targetRate = calculateTargetRate();
              return targetRate && (
                <p className="text-sm text-gray-600">
                  Target rate: {formatRate(targetRate, form.watch('toCurrency'))}
                </p>
              );
            })()}
          </div>

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isCreatingAlert || isLoadingRates}
          >
            {isCreatingAlert ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Alert...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Create Rate Alert
              </>
            )}
          </Button>
        </form>

        {/* Information */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Alerts are checked every hour</li>
                <li>You'll receive one email when your target is reached</li>
                <li>Target must be higher than the current rate</li>
                <li>Create new alerts for continued monitoring</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}