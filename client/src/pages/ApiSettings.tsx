import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LockKeyholeIcon } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';

// Schema for API keys
const apiKeysSchema = z.object({
  wiseApiKey: z.string().optional(),
  worldRemitApiKey: z.string().optional(),
  lemfiApiKey: z.string().optional(),
  westernUnionApiKey: z.string().optional(),
  moneygramApiKey: z.string().optional(),
  nalaApiKey: z.string().optional(),
  sendwaveApiKey: z.string().optional(),
  taptapSendApiKey: z.string().optional()
});

type ApiKeysFormData = z.infer<typeof apiKeysSchema>;

export default function ApiSettings() {
  const { toast } = useToast();
  
  // Initialize form
  const form = useForm<ApiKeysFormData>({
    resolver: zodResolver(apiKeysSchema),
    defaultValues: {
      wiseApiKey: '',
      worldRemitApiKey: '',
      lemfiApiKey: '',
      westernUnionApiKey: '',
      moneygramApiKey: '',
      nalaApiKey: '',
      sendwaveApiKey: '',
      taptapSendApiKey: ''
    }
  });
  
  const onSubmit = async (data: ApiKeysFormData) => {
    try {
      // Save API keys
      await apiRequest('/api/save-api-keys', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      // Show success message
      toast({
        title: 'API Keys Updated',
        description: 'Your API keys have been saved and will be used for real-time exchange rates.',
        variant: 'default'
      });
      
      // Invalidate queries to refresh rates with new API keys
      queryClient.invalidateQueries({ queryKey: ['/api/rates'] });
      
    } catch (error) {
      // Show error message
      toast({
        title: 'Error Saving API Keys',
        description: 'There was a problem saving your API keys. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">API Integration Settings</h1>
        <p className="mb-8 text-muted-foreground">
          Connect directly to money transfer provider APIs to get the most accurate and up-to-date exchange rates.
        </p>
        
        <Tabs defaultValue="api-keys">
          <TabsList className="mb-6">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="integration-info">Integration Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle>Provider API Keys</CardTitle>
                <CardDescription>
                  Enter API keys for the money transfer providers you want to integrate with.
                  Your keys are securely stored and only used to fetch exchange rates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="wiseApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wise API Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter Wise API key" 
                                {...field} 
                                type="password"
                              />
                            </FormControl>
                            <FormDescription>
                              Get this from the Wise Developer Portal
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="worldRemitApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WorldRemit API Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter WorldRemit API key" 
                                {...field} 
                                type="password"
                              />
                            </FormControl>
                            <FormDescription>
                              Available to WorldRemit partners
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lemfiApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lemfi API Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter Lemfi API key" 
                                {...field} 
                                type="password"
                              />
                            </FormControl>
                            <FormDescription>
                              Get this from Lemfi's business portal
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="westernUnionApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Western Union API Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter Western Union API key" 
                                {...field} 
                                type="password"
                              />
                            </FormControl>
                            <FormDescription>
                              Get this from Western Union Business Solutions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="moneygramApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MoneyGram API Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter MoneyGram API key" 
                                {...field} 
                                type="password"
                              />
                            </FormControl>
                            <FormDescription>
                              Available to MoneyGram business partners
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="nalaApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nala API Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter Nala API key" 
                                {...field} 
                                type="password"
                              />
                            </FormControl>
                            <FormDescription>
                              Available for business partners
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="sendwaveApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sendwave API Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter Sendwave API key" 
                                {...field} 
                                type="password"
                              />
                            </FormControl>
                            <FormDescription>
                              Get this from Sendwave business portal
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="taptapSendApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>TapTap Send API Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter TapTap Send API key" 
                                {...field} 
                                type="password"
                              />
                            </FormControl>
                            <FormDescription>
                              Available for business integrations
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full md:w-auto">
                      Save API Keys
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integration-info">
            <Card>
              <CardHeader>
                <CardTitle>API Integration Information</CardTitle>
                <CardDescription>
                  How to get API keys for different money transfer providers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <LockKeyholeIcon className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="font-semibold">Wise (TransferWise)</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Visit the <a href="https://wise.com/gb/business/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Wise API Developer Portal</a> to register for API access. 
                        You'll need to create a developer account and register your application to receive an API key.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <LockKeyholeIcon className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="font-semibold">WorldRemit</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        WorldRemit offers API access to business partners. You'll need to <a href="https://www.worldremit.com/en/business" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">contact their business team</a> to request API access.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <LockKeyholeIcon className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="font-semibold">Western Union</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Western Union offers their <a href="https://business.westernunion.com/en-us/solutions/mass-payments" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Business Solutions API</a> for partners. You'll need to contact their business team for API credentials.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <LockKeyholeIcon className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="font-semibold">MoneyGram</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        MoneyGram provides API access through their <a href="https://www.moneygram.com/mgo/us/en/digital-partners" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">partner program</a>. You'll need to apply for their partner program to get access.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}