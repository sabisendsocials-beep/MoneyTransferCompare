import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/Spinner";
import { format } from "date-fns";
import { ProviderManagement } from "@/components/ProviderManagement";
import ScraperStatusPanel from "@/components/ScraperStatusPanel";
import ProviderApiSchedulerPanel from "@/components/ProviderApiSchedulerPanel";
import DailyIncrementSchedulerPanel from "@/components/DailyIncrementSchedulerPanel";
import CommentarySchedulerPanel from "@/pages/CommentarySchedulerPanelNew";

// LatestRatesTable component to display the latest rates for each provider
const LatestRatesTable = () => {
  const { data: rates, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/rates/latest'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Mutation for verifying a rate
  const verifyRateMutation = useMutation({
    mutationFn: async ({ rateId, verified, fromCurrency, toCurrency }: { rateId: number, verified: boolean, fromCurrency: string, toCurrency: string }) => {
      console.log(`Verifying rate ID ${rateId} as ${verified ? 'verified' : 'unverified'}`);
      
      // Use the new API endpoint for verification
      const response = await fetch('/api/verify-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          providerId: rateId,
          verified: verified,
          fromCurrency: fromCurrency,
          toCurrency: toCurrency
        })
      });
      
      if (!response.ok) {
        // Check content type to properly handle different response formats
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(`Verification failed: ${errorData.message || 'Unknown error'}`);
        } else {
          // Handle non-JSON responses
          const text = await response.text();
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return { success: true };
      }
    },
    onSuccess: () => {
      toast({
        title: "Verification status updated",
        description: "The rate verification status has been updated",
      });
      refetch(); // Refresh the rates data
    },
    onError: (error) => {
      toast({
        title: "Error updating verification",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner className="w-8 h-8" />
        <span className="ml-2">Loading latest rates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTitle>Error loading rates</AlertTitle>
        <AlertDescription>
          Unable to fetch the latest rates. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Group rates by provider
  const ratesByProvider: Record<string, any[]> = {};
  if (rates && Array.isArray(rates) && rates.length > 0) {
    rates.forEach((rate: any) => {
      if (!ratesByProvider[rate.providerName]) {
        ratesByProvider[rate.providerName] = [];
      }
      ratesByProvider[rate.providerName].push(rate);
    });
  }

  const formatSourceBadge = (source: string | null | undefined) => {
    if (!source) return null;
    
    let color = "bg-gray-200 text-gray-700";
    let label = "Unknown";
    
    if (source.toUpperCase() === "API") {
      color = "bg-emerald-100 text-emerald-700";
      label = "API";
    } else if (source.toUpperCase() === "MANUAL") {
      color = "bg-blue-100 text-blue-700";
      label = "Manual";
    } else if (source.toUpperCase() === "SCRAPER" || source.toUpperCase() === "SCREENSHOT") {
      color = "bg-amber-100 text-amber-700";
      label = "Web";
    }
    
    return (
      <Badge className={`${color} border-0`}>{label}</Badge>
    );
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy HH:mm");
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Latest Provider Rates</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Currency Pair</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(ratesByProvider).length > 0 ? (
              Object.entries(ratesByProvider).map(([providerName, providerRates]) => (
                providerRates.map((rate, index) => (
                  <TableRow key={`${providerName}-${index}`}>
                    <TableCell className="font-medium">{providerName}</TableCell>
                    <TableCell>{rate.fromCurrency} → {rate.toCurrency}</TableCell>
                    <TableCell>{rate.rate ? rate.rate.toFixed(4) : "N/A"}</TableCell>
                    <TableCell>{formatSourceBadge(rate.source)}</TableCell>
                    <TableCell>{formatDate(rate.lastUpdated || rate.timestamp)}</TableCell>
                    <TableCell>
                      {rate.verified ? (
                        <Badge className="bg-green-100 text-green-800 border-0">Verified</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 border-0">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {rate.verified ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                          onClick={() => verifyRateMutation.mutate({ 
                            rateId: rate.providerId, 
                            verified: false,
                            fromCurrency: rate.fromCurrency,
                            toCurrency: rate.toCurrency 
                          })}
                          disabled={verifyRateMutation.isPending}
                        >
                          Unverify
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                          onClick={() => verifyRateMutation.mutate({ 
                            rateId: rate.providerId, 
                            verified: true,
                            fromCurrency: rate.fromCurrency,
                            toCurrency: rate.toCurrency 
                          })}
                          disabled={verifyRateMutation.isPending}
                        >
                          Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No rates available. Try collecting rates first.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Currency options
const currencies = [
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "NGN", label: "Nigerian Naira (NGN)" },
  { value: "GHS", label: "Ghanaian Cedi (GHS)" },
  { value: "KES", label: "Kenyan Shilling (KES)" },
  { value: "INR", label: "Indian Rupee (INR)" },
  { value: "PKR", label: "Pakistani Rupee (PKR)" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("manual-entry");
  
  // Form state
  const [providerId, setProviderId] = useState("");
  const [fromCurrency, setFromCurrency] = useState("GBP");
  const [toCurrency, setToCurrency] = useState("NGN");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [collecting, setCollecting] = useState(false);
  
  // Filter state for manual rates
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedFromCurrency, setSelectedFromCurrency] = useState("all");
  const [selectedToCurrency, setSelectedToCurrency] = useState("all");
  
  // Get providers for the dropdown
  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ["/api/providers"],
    enabled: true,
  });
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!providerId) {
      toast({ title: "Provider is required", variant: "destructive" });
      return;
    }
    
    if (!fromCurrency) {
      toast({ title: "From currency is required", variant: "destructive" });
      return;
    }
    
    if (!toCurrency) {
      toast({ title: "To currency is required", variant: "destructive" });
      return;
    }
    
    if (!rate || isNaN(parseFloat(rate)) || parseFloat(rate) <= 0) {
      toast({ title: "Rate must be a positive number", variant: "destructive" });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Use direct fetch instead of apiRequest to avoid the endpoint.startsWith error
      const response = await fetch('/api/rates/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: parseInt(providerId),
          fromCurrency,
          toCurrency,
          rate: parseFloat(rate),
          notes
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Success message
      toast({
        title: "Rate added successfully",
        description: "The manual rate has been added to the database",
      });
      
      // Reset form
      setProviderId("");
      setRate("");
      setNotes("");
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compare"] });
      // Also refresh scraper status
      queryClient.invalidateQueries({ queryKey: ["scraper-status"] });
    } catch (error) {
      toast({
        title: "Error adding rate",
        description: error instanceof Error ? error.message : "Failed to add rate",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Trigger rate collection
  const triggerCollection = async () => {
    setCollecting(true);
    
    try {
      // Use direct fetch instead of apiRequest to avoid the error
      const response = await fetch('/api/rates/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      toast({
        title: "Rate collection started",
        description: "The system is collecting rates from all sources. This may take a few minutes.",
      });
    } catch (error) {
      toast({
        title: "Error starting collection",
        description: error instanceof Error ? error.message : "Failed to start rate collection",
        variant: "destructive",
      });
    } finally {
      setCollecting(false);
      
      // Refresh all data after collection is finished
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/rates"] });
        queryClient.invalidateQueries({ queryKey: ["/api/compare"] });
        // Also refresh scraper status panel
        queryClient.invalidateQueries({ queryKey: ["scraper-status"] });
      }, 1000); // Small delay to allow server processing
    }
  };
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="manual-entry" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="manual-entry">Manual Rate Entry</TabsTrigger>
          <TabsTrigger value="manual-rates">Manual Providers</TabsTrigger>
          <TabsTrigger value="collection">Data Collection</TabsTrigger>
          <TabsTrigger value="api-scheduler">API Scheduler</TabsTrigger>
          <TabsTrigger value="base-rate-scheduler">Base Rate Scheduler</TabsTrigger>
          <TabsTrigger value="commentary-scheduler">Commentary Scheduler</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="providers">Provider Management</TabsTrigger>
          <TabsTrigger value="scraper-status">Scraper Status</TabsTrigger>
          <TabsTrigger value="system-settings">System Settings</TabsTrigger>
        </TabsList>
        
        {/* Manual Entry Tab */}
        <TabsContent value="manual-entry">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Add Manual Exchange Rate</CardTitle>
              <CardDescription>
                Enter verified exchange rates from provider websites or customer service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Select
                    value={providerId}
                    onValueChange={setProviderId}
                    disabled={loadingProviders || submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(providers) ? providers.map((provider: any) => (
                        <SelectItem key={provider.id} value={provider.id.toString()}>
                          {provider.name}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Currency</label>
                    <Select
                      value={fromCurrency}
                      onValueChange={setFromCurrency}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Currency</label>
                    <Select
                      value={toCurrency}
                      onValueChange={setToCurrency}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Exchange Rate</label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="Enter rate (e.g., 1583.45)"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the exact rate as shown on the provider's website
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source Notes</label>
                  <Textarea
                    placeholder="Enter source information (e.g., URL, customer service call reference)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="text-sm text-muted-foreground">
                    Document where this rate was obtained for verification
                  </p>
                </div>
                
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding Rate..." : "Add Rate"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Manual Providers Tab */}
        <TabsContent value="manual-rates">
          <Card>
            <CardHeader>
              <CardTitle>Manual Provider Rates</CardTitle>
              <CardDescription>
                Update rates for providers that require manual entry. Use filters to focus on specific providers or currency pairs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter Controls */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                <h4 className="text-sm font-medium mb-3">Filters</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Provider</label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="All providers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Providers</SelectItem>
                        {Array.isArray(providers) ? providers
                          .filter((provider: any) => provider.preferred_collection === 'MANUAL')
                          .map((provider: any) => (
                            <SelectItem key={provider.id} value={provider.id.toString()}>
                              {provider.name}
                            </SelectItem>
                          )) : null}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Currency</label>
                    <Select value={selectedFromCurrency} onValueChange={setSelectedFromCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="All currencies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Currencies</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Currency</label>
                    <Select value={selectedToCurrency} onValueChange={setSelectedToCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="All currencies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Currencies</SelectItem>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                        <SelectItem value="GHS">GHS (₵)</SelectItem>
                        <SelectItem value="KES">KES (KSh)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="PKR">PKR (₨)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedProvider("all");
                      setSelectedFromCurrency("all");
                      setSelectedToCurrency("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {Array.isArray(providers) && providers
                      .filter((provider: any) => provider.preferred_collection === 'MANUAL')
                      .filter((provider: any) => selectedProvider === "all" || provider.id.toString() === selectedProvider)
                      .length} provider(s) shown
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Filter and display providers */}
                {providers && Array.isArray(providers) && providers
                  .filter((provider: any) => provider.preferred_collection === 'MANUAL')
                  .filter((provider: any) => selectedProvider === "all" || provider.id.toString() === selectedProvider)
                  .map((provider: any) => (
                    <div key={provider.id} className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">{provider.name}</h3>
                      
                      {/* Currency pairs grid */}
                      <div className="space-y-4">
                        {(() => {
                          const allPairs = [
                            { from: 'GBP', to: 'NGN' },
                            { from: 'EUR', to: 'NGN' },
                            { from: 'USD', to: 'NGN' },
                            { from: 'GBP', to: 'GHS' },
                            { from: 'EUR', to: 'GHS' },
                            { from: 'USD', to: 'GHS' },
                            { from: 'GBP', to: 'KES' },
                            { from: 'EUR', to: 'KES' },
                            { from: 'USD', to: 'KES' },
                            { from: 'GBP', to: 'INR' },
                            { from: 'EUR', to: 'INR' },
                            { from: 'USD', to: 'INR' },
                            { from: 'GBP', to: 'PKR' },
                            { from: 'EUR', to: 'PKR' },
                            { from: 'USD', to: 'PKR' }
                          ];
                          
                          const filteredPairs = allPairs
                            .filter(pair => selectedFromCurrency === "all" || pair.from === selectedFromCurrency)
                            .filter(pair => selectedToCurrency === "all" || pair.to === selectedToCurrency);
                          
                          if (filteredPairs.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No currency pairs match your filter criteria.</p>
                                <p className="text-sm mt-1">Try adjusting your filters to see more options.</p>
                              </div>
                            );
                          }
                          
                          return (
                            <>
                              <div className="text-sm text-muted-foreground">
                                Showing {filteredPairs.length} of {allPairs.length} currency pairs
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredPairs.map(pair => (
                                  <div key={`${pair.from}-${pair.to}`} className="border rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">{pair.from} → {pair.to}</span>
                                      <Badge variant="outline">Manual</Badge>
                                    </div>
                                    
                                    <form 
                                      onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target as HTMLFormElement);
                                        const rate = formData.get('rate') as string;
                                        
                                        if (!rate || isNaN(parseFloat(rate))) {
                                          toast({ title: "Please enter a valid rate", variant: "destructive" });
                                          return;
                                        }
                                        
                                        try {
                                          const response = await fetch('/api/rates/manual', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              providerId: provider.id,
                                              fromCurrency: pair.from,
                                              toCurrency: pair.to,
                                              rate: parseFloat(rate),
                                              notes: `Manual entry for ${provider.name} ${pair.from}/${pair.to}`
                                            })
                                          });
                                          
                                          if (response.ok) {
                                            toast({ title: `${provider.name} rate updated successfully` });
                                            (e.target as HTMLFormElement).reset();
                                            queryClient.invalidateQueries({ queryKey: ["/api/rates"] });
                                          } else {
                                            throw new Error('Failed to update rate');
                                          }
                                        } catch (error) {
                                          toast({ 
                                            title: "Error updating rate", 
                                            description: error instanceof Error ? error.message : "Failed to update",
                                            variant: "destructive" 
                                          });
                                        }
                                      }}
                                      className="flex gap-2"
                                    >
                                      <Input
                                        name="rate"
                                        type="number"
                                        step="0.0001"
                                        placeholder="Enter rate"
                                        className="flex-1"
                                      />
                                      <Button type="submit" size="sm">
                                        Update
                                      </Button>
                                    </form>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                
                {!providers || (Array.isArray(providers) && providers.filter((p: any) => p.preferred_collection === 'MANUAL').length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No manual providers found. Configure providers with "MANUAL" collection method in the Provider Management tab.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Data Collection Tab */}
        <TabsContent value="collection">
          <Card>
            <CardHeader>
              <CardTitle>Data Collection Controls</CardTitle>
              <CardDescription>
                Manage the automatic collection of rates from various sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Current Schedule</h3>
                  <p className="text-muted-foreground mb-4">
                    Rates are automatically collected three times daily:
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-secondary p-4 rounded-lg text-center">
                      <p className="font-bold text-xl">6:00 AM</p>
                      <p className="text-muted-foreground">Morning Update</p>
                    </div>
                    <div className="bg-secondary p-4 rounded-lg text-center">
                      <p className="font-bold text-xl">2:00 PM</p>
                      <p className="text-muted-foreground">Afternoon Update</p>
                    </div>
                    <div className="bg-secondary p-4 rounded-lg text-center">
                      <p className="font-bold text-xl">10:00 PM</p>
                      <p className="text-muted-foreground">Evening Update</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Manual Collection</h3>
                  <p className="text-muted-foreground mb-4">
                    Manually trigger rate collection from all data sources
                  </p>
                  <Button 
                    onClick={triggerCollection} 
                    disabled={collecting}
                    variant="default"
                  >
                    {collecting ? "Collecting Rates..." : "Collect Rates Now"}
                  </Button>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-2">Data Source Priority</h3>
                  <p className="text-muted-foreground mb-4">
                    Rate data is used in the following priority order:
                  </p>
                  <ol className="space-y-2">
                    <li className="flex items-center">
                      <Badge className="mr-2 bg-emerald-500">1</Badge>
                      <span><strong>API Data</strong> - Direct from provider APIs (most reliable)</span>
                    </li>
                    <li className="flex items-center">
                      <Badge className="mr-2 bg-blue-500">2</Badge>
                      <span><strong>Manual Entry</strong> - Verified rates entered through this interface</span>
                    </li>
                    <li className="flex items-center">
                      <Badge className="mr-2 bg-amber-500">3</Badge>
                      <span><strong>Web Scrapers</strong> - Automatically collected from provider websites</span>
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Provider API Scheduler Tab */}
        <TabsContent value="api-scheduler">
          <ProviderApiSchedulerPanel />
        </TabsContent>
        
        {/* Base Rate Scheduler Tab */}
        <TabsContent value="base-rate-scheduler">
          <DailyIncrementSchedulerPanel />
        </TabsContent>
        
        {/* Commentary Scheduler Tab */}
        <TabsContent value="commentary-scheduler">
          <CommentarySchedulerPanel />
        </TabsContent>
        
        {/* Data Sources Tab */}
        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Data Source Overview</CardTitle>
              <CardDescription>
                View the distribution of data sources currently being used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTitle>Data Sources Enabled</AlertTitle>
                <AlertDescription>
                  The following data sources are currently being used to collect exchange rates:
                  <ul className="mt-2 list-disc pl-5">
                    <li><strong>APIs:</strong> Wise</li>
                    <li><strong>Web Scrapers:</strong> WorldRemit, Lemfi, Nala, Western Union</li>
                    <li><strong>Manual Entry:</strong> Available through the Admin interface</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Source Prioritisation</h3>
                <p className="text-muted-foreground mb-4">
                  When multiple sources have data for the same currency pair and provider,
                  the system prioritises as follows:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>API data is used first (direct from provider, most accurate)</li>
                  <li>Manually entered data is used second (verified by staff)</li>
                  <li>Web scraped data is used third (automated collection)</li>
                </ol>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Freshness Rules</h3>
                <p className="text-muted-foreground mb-4">
                  All rate data older than 24 hours is considered stale and will not be used
                  in comparisons. The system automatically refreshes data from all sources
                  three times daily to ensure freshness.
                </p>
              </div>
              
              <LatestRatesTable />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Provider Management Tab */}
        <TabsContent value="providers">
          <ProviderManagement />
        </TabsContent>
        
        {/* Scraper Status Tab */}
        <TabsContent value="scraper-status">
          <ScraperStatusPanel />
        </TabsContent>
        
        {/* System Settings Tab */}
        <TabsContent value="system-settings">
          <SystemSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// System Settings Panel Component
const SystemSettingsPanel = () => {
  const [rateFreshness, setRateFreshness] = useState("");
  const [updating, setUpdating] = useState(false);
  
  // Query to fetch current system settings
  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/system-settings"],
  });
  
  // Query to fetch specific rate freshness setting
  const { data: rateFreshnessSetting, isLoading: rateFreshnessLoading } = useQuery({
    queryKey: ["/api/system-settings/max_rate_age_hours"],
  });
  
  // Type-safe access to settings data
  const settingsArray = Array.isArray(settings) ? settings : [];
  const rateSetting = rateFreshnessSetting as any;
  
  // Update rate freshness mutation
  const updateRateFreshness = useMutation({
    mutationFn: async (hours: string) => {
      const response = await fetch('/api/system-settings/max_rate_age_hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: hours,
          description: `Maximum age in hours for exchange rates to be considered fresh (${hours} = ${Math.round(parseInt(hours) / 24)} days)`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update rate freshness setting');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rate freshness updated",
        description: `Rates will now be considered fresh for ${rateFreshness} hours (${Math.round(parseInt(rateFreshness) / 24)} days)`,
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compare"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating setting",
        description: error instanceof Error ? error.message : "Failed to update rate freshness",
        variant: "destructive",
      });
    }
  });
  
  const handleUpdateRateFreshness = async () => {
    if (!rateFreshness || parseInt(rateFreshness) <= 0) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number of hours greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    setUpdating(true);
    try {
      await updateRateFreshness.mutateAsync(rateFreshness);
    } finally {
      setUpdating(false);
    }
  };
  
  // Set initial value when data loads
  useEffect(() => {
    if (rateSetting?.setting_value && !rateFreshness) {
      setRateFreshness(rateSetting.setting_value);
    }
  }, [rateSetting, rateFreshness]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Freshness Configuration</CardTitle>
          <CardDescription>
            Control how long exchange rates remain valid before being considered stale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rateFreshnessLoading ? (
              <div className="flex items-center space-x-2">
                <Spinner />
                <span>Loading current settings...</span>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Current setting: {rateSetting?.setting_value || "Not set"} hours 
                    {rateSetting?.setting_value && (
                      <span className="ml-1">
                        ({Math.round(parseInt(rateSetting.setting_value) / 24)} days)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {rateSetting?.last_updated 
                      ? format(new Date(rateSetting.last_updated), 'PPp')
                      : 'Never'
                    }
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-sm">
                    <Input
                      type="number"
                      placeholder="Hours (e.g., 168 for 7 days)"
                      value={rateFreshness}
                      onChange={(e) => setRateFreshness(e.target.value)}
                      min="1"
                      max="8760"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdateRateFreshness}
                    disabled={updating || !rateFreshness}
                  >
                    {updating ? "Updating..." : "Update"}
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {rateFreshness && parseInt(rateFreshness) > 0 && (
                    <p>
                      Setting to {rateFreshness} hours = {Math.round(parseInt(rateFreshness) / 24)} days
                    </p>
                  )}
                  <p className="mt-2">
                    Common values: 24 hours (1 day), 72 hours (3 days), 168 hours (7 days)
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>All System Settings</CardTitle>
          <CardDescription>
            View and manage all system configuration settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Spinner />
              <span>Loading settings...</span>
            </div>
          ) : error ? (
            <Alert>
              <AlertTitle>Error loading settings</AlertTitle>
              <AlertDescription>
                Failed to load system settings. Please try again.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settingsArray && settingsArray.length > 0 ? (
                  settingsArray.map((setting: any) => (
                    <TableRow key={setting.id}>
                      <TableCell className="font-medium">{setting.setting_key}</TableCell>
                      <TableCell>{setting.setting_value}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {setting.description || "No description"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {setting.last_updated 
                          ? format(new Date(setting.last_updated), 'PPp')
                          : 'Never'
                        }
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No system settings found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};