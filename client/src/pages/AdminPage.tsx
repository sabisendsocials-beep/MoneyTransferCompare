import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

// Supported currency pairs
const CURRENCY_PAIRS = [
  { from: "GBP", to: "NGN", label: "British Pound to Nigerian Naira" },
  { from: "EUR", to: "NGN", label: "Euro to Nigerian Naira" },
  { from: "GBP", to: "GHS", label: "British Pound to Ghanaian Cedi" },
  { from: "EUR", to: "GHS", label: "Euro to Ghanaian Cedi" },
];

// Admin page for managing exchange rates
const AdminPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("manual-rates");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Fetch providers
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ["/api/providers"],
  });

  // Mutation for adding manual rates
  const addManualRateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/rates/manual", "POST", data);
    },
    onSuccess: () => {
      // Show success message
      toast({
        title: "Success",
        description: "Manual rate added successfully",
        variant: "default",
      });
      
      // Clear the form
      setRate("");
      setNotes("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/rates"] });
    },
    onError: (error: any) => {
      // Show error message
      toast({
        title: "Error",
        description: `Failed to add manual rate: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedProviderId) {
      toast({
        title: "Validation Error",
        description: "Please select a provider",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCurrencyPair) {
      toast({
        title: "Validation Error",
        description: "Please select a currency pair",
        variant: "destructive",
      });
      return;
    }

    const rateValue = parseFloat(rate);
    if (isNaN(rateValue) || rateValue <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid positive rate",
        variant: "destructive",
      });
      return;
    }

    // Get the currency pair details
    const [fromCurrency, toCurrency] = selectedCurrencyPair.split("-");

    // Submit the manual rate
    addManualRateMutation.mutate({
      providerId: parseInt(selectedProviderId),
      fromCurrency,
      toCurrency,
      rate: rateValue,
      notes,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="manual-rates" onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="manual-rates">Manual Rates</TabsTrigger>
          <TabsTrigger value="rate-sources">Rate Sources</TabsTrigger>
          <TabsTrigger value="scheduled-collection">Scheduled Collection</TabsTrigger>
        </TabsList>
        
        {/* Manual Rates Entry Tab */}
        <TabsContent value="manual-rates">
          <Card>
            <CardHeader>
              <CardTitle>Add Manual Exchange Rate</CardTitle>
              <CardDescription>
                Enter verified exchange rates from official sources. These rates will be given priority over
                scraped rates when comparing transfer options.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={selectedProviderId}
                    onValueChange={setSelectedProviderId}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providersLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading providers...
                        </SelectItem>
                      ) : (
                        providers?.map((provider: any) => (
                          <SelectItem key={provider.id} value={provider.id.toString()}>
                            {provider.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency Pair Selection */}
                <div className="space-y-2">
                  <Label htmlFor="currencyPair">Currency Pair</Label>
                  <Select
                    value={selectedCurrencyPair}
                    onValueChange={setSelectedCurrencyPair}
                  >
                    <SelectTrigger id="currencyPair">
                      <SelectValue placeholder="Select a currency pair" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_PAIRS.map((pair) => (
                        <SelectItem
                          key={`${pair.from}-${pair.to}`}
                          value={`${pair.from}-${pair.to}`}
                        >
                          {pair.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate Input */}
                <div className="space-y-2">
                  <Label htmlFor="rate">Exchange Rate</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g., 2150.78"
                  />
                </div>

                {/* Notes Input */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Source / Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Official rate from provider website as of today"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={addManualRateMutation.isPending}
                >
                  {addManualRateMutation.isPending
                    ? "Adding rate..."
                    : "Add Manual Rate"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-start text-sm text-gray-500">
              <p>
                <strong>Note:</strong> Manual rates will be marked as verified and
                given priority over scraped rates for 24 hours.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Rate Sources Tab */}
        <TabsContent value="rate-sources">
          <Card>
            <CardHeader>
              <CardTitle>Rate Sources</CardTitle>
              <CardDescription>
                View all available rate sources and their priority order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Rate sources are prioritized in the following order when comparing transfer options:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <span className="font-medium">API Rates</span> - Rates obtained directly from provider APIs.
                    Highest priority and considered verified.
                  </li>
                  <li>
                    <span className="font-medium">Manual Rates</span> - Rates manually entered by admin.
                    Second priority and considered verified.
                  </li>
                  <li>
                    <span className="font-medium">Scraped Rates</span> - Rates obtained from web scraping.
                    Lowest priority unless verified.
                  </li>
                </ol>
                <p className="text-sm text-gray-500 mt-4">
                  All rates are considered valid for 24 hours. After that, the next available source
                  will be used.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Scheduled Collection Tab */}
        <TabsContent value="scheduled-collection">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Rate Collection</CardTitle>
              <CardDescription>
                Configure and monitor the automatic rate collection system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Rate collection is scheduled to run automatically 3 times per day:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>6:00 AM - Morning collection</li>
                  <li>2:00 PM - Afternoon collection</li>
                  <li>10:00 PM - Evening collection</li>
                </ul>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-4">
                  <p className="font-medium">Collection Priority:</p>
                  <ol className="list-decimal pl-5 space-y-1 mt-2">
                    <li>Try to get rates from provider APIs when available</li>
                    <li>Fall back to web scraping when APIs are unavailable</li>
                    <li>Use manual rates when other methods fail</li>
                  </ol>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => {
                  toast({
                    title: "Collection Triggered",
                    description: "Manual rate collection has been triggered",
                  });
                }}
              >
                Trigger Manual Collection
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;