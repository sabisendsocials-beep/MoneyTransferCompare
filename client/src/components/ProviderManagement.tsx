import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, PlusIcon, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { apiRequest } from '@/lib/queryClient';

interface Provider {
  id: number;
  name: string;
  logo: string | null;
  rating: number;
  website_url: string | null;
  scraping_url: string | null;
  scraping_selector: string | null;
  transfer_time: string | null;
  has_fixed_fee: boolean;
  fixed_fee: number;
  percentage_fee: number;
  active: boolean;
  preferred_collection: string;
  has_api: boolean;
  api_url: string | null;
  api_key_required: boolean;
  api_response_path: string | null;
}

interface ProviderFormData {
  name: string;
  logo: string | null;
  rating: number;
  website_url: string;
  scraping_url: string;
  scraping_selector: string;
  transfer_time: string;
  has_fixed_fee: boolean;
  fixed_fee: number;
  percentage_fee: number;
  active: boolean;
  preferred_collection: string;
  has_api: boolean;
  api_url: string;
  api_key_required: boolean;
  api_response_path: string;
  comment?: string; // Optional provider comment to show on results page
}

const defaultProvider: ProviderFormData = {
  name: "",
  logo: null,
  rating: 4.0,
  website_url: "",
  scraping_url: "",
  scraping_selector: "",
  transfer_time: "",
  has_fixed_fee: false,
  fixed_fee: 0,
  percentage_fee: 0,
  active: true,
  preferred_collection: "SCRAPER",
  has_api: false,
  api_url: "",
  api_key_required: false,
  api_response_path: "",
  comment: ""
};

export function ProviderManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderFormData | null>(null);
  const [tab, setTab] = useState("list");
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Fetch all providers
  const { data: providers, isLoading, error } = useQuery({
    queryKey: ['/api/providers'],
    refetchOnWindowFocus: false
  });

  // Initialize providers mutation - Admin only operation
  const initializeProvidersMutation = useMutation({
    mutationFn: async (reset: boolean) => {
      // Generate a unique admin token for this session
      const adminToken = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      const response = await fetch('/api/init-providers', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
          'x-admin-source': 'provider-management-panel'
        },
        body: JSON.stringify({ reset })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/providers'] });
      toast({
        title: "Success",
        description: "Providers initialized successfully.",
      });
      setConfirmResetOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to initialize providers.",
        variant: "destructive",
      });
    }
  });

  // Create provider mutation - Admin only operation
  const createProviderMutation = useMutation({
    mutationFn: async (provider: ProviderFormData) => {
      // Generate a unique admin token for this session
      const adminToken = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      const response = await fetch('/api/provider', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
          'x-admin-source': 'provider-management-panel'
        },
        body: JSON.stringify(provider)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/providers'] });
      toast({
        title: "Success",
        description: "Provider created successfully.",
      });
      setIsDialogOpen(false);
      setEditingProvider(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create provider.",
        variant: "destructive",
      });
    }
  });

  // Update provider mutation - Admin only operation
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, provider }: { id: number, provider: Partial<ProviderFormData> }) => {
      // Generate a unique admin token for this session
      const adminToken = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      const response = await fetch(`/api/provider/${id}`, { 
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
          'x-admin-source': 'provider-management-panel'
        },
        body: JSON.stringify(provider)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/providers'] });
      toast({
        title: "Success",
        description: "Provider updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingProvider(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update provider.",
        variant: "destructive",
      });
    }
  });

  // Delete provider mutation - Admin only operation
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      // Generate a unique admin token for this session
      const adminToken = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      const response = await fetch(`/api/provider/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken,
          'x-admin-source': 'provider-management-panel'
        }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/providers'] });
      toast({
        title: "Success",
        description: "Provider deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete provider.",
        variant: "destructive",
      });
    }
  });

  const handleAddProvider = () => {
    setEditingProvider({ ...defaultProvider });
    setIsDialogOpen(true);
  };

  const handleEditProvider = (provider: Provider) => {
    // Convert API provider to form data format
    const formData: ProviderFormData = {
      name: provider.name,
      logo: provider.logo,
      rating: provider.rating,
      website_url: provider.website_url || "",
      scraping_url: provider.scraping_url || "",
      scraping_selector: provider.scraping_selector || "",
      transfer_time: provider.transfer_time || "",
      has_fixed_fee: provider.has_fixed_fee,
      fixed_fee: provider.fixed_fee,
      percentage_fee: provider.percentage_fee,
      active: provider.active,
      preferred_collection: provider.preferred_collection || "SCRAPER",
      has_api: provider.has_api,
      api_url: provider.api_url || "",
      api_key_required: provider.api_key_required,
      api_response_path: provider.api_response_path || ""
    };
    
    setSelectedProviderId(provider.id);
    setEditingProvider(formData);
    setIsDialogOpen(true);
  };

  const handleDeleteProvider = (id: number) => {
    if (window.confirm("Are you sure you want to delete this provider?")) {
      deleteProviderMutation.mutate(id);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProvider) return;
    
    if (selectedProviderId) {
      // Update existing provider
      updateProviderMutation.mutate({
        id: selectedProviderId,
        provider: editingProvider
      });
    } else {
      // Create new provider
      createProviderMutation.mutate(editingProvider);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingProvider) return;
    
    const { name, value, type } = e.target;
    
    // Handle different input types
    if (type === 'number') {
      setEditingProvider({
        ...editingProvider,
        [name]: parseFloat(value)
      });
    } else if (type === 'checkbox') {
      setEditingProvider({
        ...editingProvider,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else {
      setEditingProvider({
        ...editingProvider,
        [name]: value
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!editingProvider) return;
    
    setEditingProvider({
      ...editingProvider,
      [name]: value
    });
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    if (!editingProvider) return;
    
    setEditingProvider({
      ...editingProvider,
      [name]: checked
    });
  };

  const handleInitializeProviders = (reset: boolean) => {
    if (reset) {
      setConfirmResetOpen(true);
    } else {
      initializeProvidersMutation.mutate(false);
    }
  };

  const confirmReset = () => {
    initializeProvidersMutation.mutate(true);
  };

  const formatCollectionMethod = (method: string) => {
    switch (method) {
      case "API":
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">API</span>;
      case "SCRAPER":
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Scraper</span>;
      case "MANUAL":
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Manual</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{method}</span>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Provider Management</CardTitle>
        <CardDescription>Manage providers for the rate comparison platform</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="list">Provider List</TabsTrigger>
              <TabsTrigger value="initialize">Initialize Providers</TabsTrigger>
            </TabsList>
            
            <Button onClick={handleAddProvider} size="sm" className="ml-auto">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </div>
          
          <TabsContent value="list">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : error ? (
              <div className="text-center p-4 text-red-500">
                Error loading providers. Please try again.
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Collection Method</TableHead>
                      <TableHead>Fees</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers && Array.isArray(providers) && providers.length > 0 ? (
                      providers.map((provider: Provider) => (
                        <TableRow key={provider.id}>
                          <TableCell className="font-medium">{provider.name}</TableCell>
                          <TableCell>{formatCollectionMethod(provider.preferred_collection)}</TableCell>
                          <TableCell>
                            {provider.has_fixed_fee ? (
                              <>Fixed: {provider.fixed_fee?.toFixed(2) || '0.00'}</>
                            ) : (
                              <>%: {provider.percentage_fee?.toFixed(2) || '0.00'}%</>
                            )}
                          </TableCell>
                          <TableCell>{provider.rating?.toFixed(1)} ⭐</TableCell>
                          <TableCell>
                            {provider.active ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-red-600">Inactive</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditProvider(provider)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteProvider(provider.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                          No providers found. Click "Initialize Providers" to add standard providers.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="initialize">
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg border">
                <h3 className="text-lg font-medium mb-2">Initialize Standard Providers</h3>
                <p className="text-gray-600 mb-4">
                  Add the standard set of money transfer providers to the platform. This includes popular
                  services like Wise, Western Union, MoneyGram, and others.
                </p>
                
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => handleInitializeProviders(false)}
                    disabled={initializeProvidersMutation.isPending}
                  >
                    {initializeProvidersMutation.isPending && !confirmResetOpen && (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Missing Providers
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => handleInitializeProviders(true)}
                    disabled={initializeProvidersMutation.isPending}
                  >
                    Reset & Initialize All Providers
                  </Button>
                </div>
              </div>
              
              <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                <h3 className="text-lg font-medium mb-2">How Provider Initialization Works</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li><strong>Add Missing Providers</strong>: Only adds providers that don't already exist in the database</li>
                  <li><strong>Reset & Initialize</strong>: Deletes all existing providers and adds the standard set fresh</li>
                  <li>Wise provider will be configured to use API collection method</li>
                  <li>Other providers will be set up with scraper-based collection</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Provider Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProviderId ? "Edit Provider" : "Add New Provider"}
            </DialogTitle>
            <DialogDescription>
              {selectedProviderId 
                ? "Edit the provider details below" 
                : "Fill in the details for the new provider"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Provider Name</Label>
                <Input 
                  id="name"
                  name="name"
                  value={editingProvider?.name || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input 
                  id="website_url"
                  name="website_url"
                  value={editingProvider?.website_url || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rating">Rating (0-5)</Label>
                <Input 
                  id="rating"
                  name="rating"
                  type="number" 
                  min="0"
                  max="5"
                  step="0.1"
                  value={editingProvider?.rating || 0}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transfer_time">Transfer Time</Label>
                <Input 
                  id="transfer_time"
                  name="transfer_time"
                  value={editingProvider?.transfer_time || ""}
                  onChange={handleInputChange}
                  placeholder="e.g. 1-2 days"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Collection Method</Label>
              <Select
                value={editingProvider?.preferred_collection || "SCRAPER"}
                onValueChange={(value) => handleSelectChange("preferred_collection", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select collection method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="API">API</SelectItem>
                  <SelectItem value="SCRAPER">Web Scraper</SelectItem>
                  <SelectItem value="MANUAL">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {editingProvider?.preferred_collection === "API" ? (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium">API Configuration</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="api_url">API URL</Label>
                    <Input 
                      id="api_url"
                      name="api_url"
                      value={editingProvider?.api_url || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api_response_path">Response Path</Label>
                    <Input 
                      id="api_response_path"
                      name="api_response_path"
                      value={editingProvider?.api_response_path || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. data.rate"
                    />
                  </div>
                  
                  <div className="col-span-2 flex items-center space-x-2">
                    <Checkbox 
                      id="api_key_required"
                      checked={editingProvider?.api_key_required || false}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange("api_key_required", checked as boolean)
                      }
                    />
                    <label
                      htmlFor="api_key_required"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      API Key Required
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium">Scraper Configuration</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="scraping_url">URL to Scrape</Label>
                    <Input 
                      id="scraping_url"
                      name="scraping_url"
                      value={editingProvider?.scraping_url || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="scraping_selector">CSS Selector</Label>
                    <Input 
                      id="scraping_selector"
                      name="scraping_selector"
                      value={editingProvider?.scraping_selector || ""}
                      onChange={handleInputChange}
                      placeholder=".exchange-rate, .rate-value"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="font-medium">Fee Structure</h3>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="has_fixed_fee"
                    checked={editingProvider?.has_fixed_fee || false}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange("has_fixed_fee", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="has_fixed_fee"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Has Fixed Fee
                  </label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fixed_fee">Fixed Fee Amount</Label>
                  <Input 
                    id="fixed_fee"
                    name="fixed_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProvider?.fixed_fee || 0}
                    onChange={handleInputChange}
                    disabled={!editingProvider?.has_fixed_fee}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="percentage_fee">Percentage Fee (%)</Label>
                  <Input 
                    id="percentage_fee"
                    name="percentage_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProvider?.percentage_fee || 0}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Status</h3>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="active"
                    checked={editingProvider?.active || false}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange("active", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="active"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Active Provider
                  </label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input 
                    id="logo"
                    name="logo"
                    value={editingProvider?.logo || ""}
                    onChange={handleInputChange}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="comment">Provider Comment</Label>
                  <Textarea 
                    id="comment"
                    name="comment"
                    value={editingProvider?.comment || ""}
                    onChange={handleInputChange}
                    placeholder="Enter additional information about this provider to display on results page"
                    className="h-20"
                  />
                  <p className="text-sm text-gray-500">This comment will be displayed on the results page when users compare providers</p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createProviderMutation.isPending || updateProviderMutation.isPending}
              >
                {(createProviderMutation.isPending || updateProviderMutation.isPending) && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedProviderId ? "Update Provider" : "Add Provider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Reset Dialog */}
      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reset</DialogTitle>
            <DialogDescription>
              This will delete all existing providers and reinitialize the standard list.
              Any custom providers or modifications will be lost.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 p-4 rounded-md border border-amber-200 text-amber-800 text-sm">
            Warning: This action cannot be undone. All provider data will be reset.
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmResetOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmReset}
              disabled={initializeProvidersMutation.isPending}
            >
              {initializeProvidersMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reset & Initialize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}