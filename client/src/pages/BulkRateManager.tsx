import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ManualProvider {
  id: number;
  name: string;
  logo: string;
  update_policy: string;
}

interface ManualRateData {
  providerId: number;
  providerName: string;
  fromCurrency: string;
  toCurrency: string;
  currentRate: number | null;
  lastUpdated: string | null;
  isStale: boolean;
}

interface RateUpdate {
  providerId: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

const CURRENCY_PAIRS = [
  { from: 'GBP', to: 'NGN', label: 'GBP → NGN' },
  { from: 'EUR', to: 'NGN', label: 'EUR → NGN' },
  { from: 'GBP', to: 'GHS', label: 'GBP → GHS' },
  { from: 'EUR', to: 'GHS', label: 'EUR → GHS' }
];

const BulkRateManager = () => {
  const [rateUpdates, setRateUpdates] = useState<Record<string, string>>({});
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch manual providers
  const { data: providers } = useQuery({
    queryKey: ['/api/providers'],
    select: (data: any[]) => data.filter(p => p.update_policy === 'MANUAL')
  });

  // Fetch current rates for manual providers
  const { data: manualRates, isLoading } = useQuery({
    queryKey: ['/api/manual-rates'],
    enabled: !!providers?.length,
  });

  // Process rate data for display
  const rateData: ManualRateData[] = providers?.flatMap(provider => 
    CURRENCY_PAIRS.map(pair => {
      const rateKey = `${provider.id}-${pair.from}-${pair.to}`;
      const existingRate = manualRates?.find((r: any) => 
        r.providerId === provider.id && 
        r.fromCurrency === pair.from && 
        r.toCurrency === pair.to
      );
      
      const lastUpdated = existingRate?.lastUpdated;
      const isStale = lastUpdated ? 
        (Date.now() - new Date(lastUpdated).getTime()) > (24 * 60 * 60 * 1000) : 
        true;

      return {
        providerId: provider.id,
        providerName: provider.name,
        fromCurrency: pair.from,
        toCurrency: pair.to,
        currentRate: existingRate?.rate || null,
        lastUpdated: lastUpdated || null,
        isStale
      };
    })
  ) || [];

  // Update rates mutation
  const updateRatesMutation = useMutation({
    mutationFn: async (updates: RateUpdate[]) => {
      const response = await fetch('/api/bulk-update-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (!response.ok) throw new Error('Failed to update rates');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rates Updated",
        description: `Successfully updated ${selectedUpdates.size} exchange rates`,
      });
      setRateUpdates({});
      setSelectedUpdates(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/manual-rates'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update exchange rates. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleRateChange = (rateKey: string, value: string) => {
    setRateUpdates(prev => ({ ...prev, [rateKey]: value }));
    if (value && !isNaN(parseFloat(value))) {
      setSelectedUpdates(prev => new Set([...prev, rateKey]));
    } else {
      setSelectedUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(rateKey);
        return newSet;
      });
    }
  };

  const handleBulkUpdate = () => {
    const updates: RateUpdate[] = Array.from(selectedUpdates).map(rateKey => {
      const [providerId, fromCurrency, toCurrency] = rateKey.split('-');
      return {
        providerId: parseInt(providerId),
        fromCurrency,
        toCurrency,
        rate: parseFloat(rateUpdates[rateKey])
      };
    }).filter(update => !isNaN(update.rate));

    if (updates.length > 0) {
      updateRatesMutation.mutate(updates);
    }
  };

  const getStatusBadge = (rate: ManualRateData) => {
    if (!rate.currentRate) {
      return <Badge variant="destructive">No Rate</Badge>;
    }
    if (rate.isStale) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Stale</Badge>;
    }
    return <Badge variant="default">Current</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading manual rates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bulk Rate Manager</h1>
        <p className="text-gray-600">
          Update exchange rates for providers set to manual collection. 
          Select the rates you want to update and save them all at once.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{rateData.filter(r => r.isStale || !r.currentRate).length}</p>
                <p className="text-sm text-gray-600">Rates Need Update</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{rateData.filter(r => r.currentRate && !r.isStale).length}</p>
                <p className="text-sm text-gray-600">Current Rates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Save className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{selectedUpdates.size}</p>
                <p className="text-sm text-gray-600">Selected for Update</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Update Controls */}
      {selectedUpdates.size > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-800">Ready to Update</h3>
                <p className="text-sm text-green-600">
                  {selectedUpdates.size} rate{selectedUpdates.size !== 1 ? 's' : ''} selected for update
                </p>
              </div>
              <Button 
                onClick={handleBulkUpdate}
                disabled={updateRatesMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {updateRatesMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update {selectedUpdates.size} Rate{selectedUpdates.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate Management Grid */}
      <div className="space-y-6">
        {providers?.map(provider => (
          <Card key={provider.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <img 
                  src={provider.logo} 
                  alt={provider.name} 
                  className="w-8 h-8 object-contain"
                />
                {provider.name}
                <Badge variant="outline">Manual</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {CURRENCY_PAIRS.map(pair => {
                  const rateInfo = rateData.find(r => 
                    r.providerId === provider.id && 
                    r.fromCurrency === pair.from && 
                    r.toCurrency === pair.to
                  );
                  const rateKey = `${provider.id}-${pair.from}-${pair.to}`;
                  
                  return (
                    <div key={rateKey} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pair.label}</span>
                          {getStatusBadge(rateInfo!)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          Current Rate: <span className="font-mono">
                            {rateInfo?.currentRate ? rateInfo.currentRate.toLocaleString() : 'No rate set'}
                          </span>
                        </div>
                        
                        {rateInfo?.lastUpdated && (
                          <div className="text-sm text-gray-600">
                            Last Updated: {formatDistanceToNow(new Date(rateInfo.lastUpdated), { addSuffix: true })}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Enter new rate"
                            value={rateUpdates[rateKey] || ''}
                            onChange={(e) => handleRateChange(rateKey, e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {providers?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">No providers are currently set to manual rate collection.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkRateManager;