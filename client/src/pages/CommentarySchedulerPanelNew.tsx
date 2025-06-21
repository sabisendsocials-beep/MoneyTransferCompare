import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Play, Trash2, TrendingUp, Clock, Database, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SchedulerStatus {
  active: boolean;
  lastRunDate: string | null;
  lastRunTimestamp: string | null;
  nextScheduledTime: string;
  scheduledTime: string;
}

interface CacheStats {
  currencyPair: string;
  count: number;
  latestDate: string;
}

interface CommentaryEntry {
  id: number;
  currency_pair: string;
  commentary: string;
  generation_date: string;
  created_at: string;
}

interface QuotaStats {
  todayGeneration: number;
  currencyPairsGenerated: number;
  estimatedTokensUsed: number;
  estimatedCostUSD: string;
  quotaOptimization: {
    beforeOptimization: string;
    afterOptimization: string;
    savingsPercent: string;
  };
}

export default function CommentarySchedulerPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for scheduler status and cache data
  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery({
    queryKey: ['/api/commentary-scheduler/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Query for quota statistics
  const { data: quotaData, isLoading: quotaLoading, error: quotaError } = useQuery({
    queryKey: ['/api/commentary-scheduler/quota-stats'],
    refetchInterval: 30000,
  });

  // Mutation for manual generation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/commentary-scheduler/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Commentary generation triggered successfully",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/commentary-scheduler/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/commentary-scheduler/quota-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger commentary generation",
        variant: "destructive",
      });
    },
  });

  // Mutation for cache cleanup
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/commentary-scheduler/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cache cleanup completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/commentary-scheduler/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cleanup cache",
        variant: "destructive",
      });
    },
  });

  const status: SchedulerStatus | null = (statusData as any)?.data?.scheduler || null;
  const cacheStats: CacheStats[] = (statusData as any)?.data?.cache?.currencyPairStats || [];
  const recentCommentary: CommentaryEntry[] = (statusData as any)?.data?.cache?.recentCommentary || [];
  const totalEntries: number = parseInt((statusData as any)?.data?.cache?.totalEntries) || 0;
  const quotaStats: QuotaStats | null = (quotaData as any)?.data || null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (active: boolean) => {
    return (
      <Badge variant={active ? "default" : "secondary"}>
        {active ? "Active" : "Inactive"}
      </Badge>
    );
  };

  const isLoading = statusLoading || quotaLoading;
  const hasError = statusError || quotaError;

  if (hasError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load commentary scheduler data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Commentary Scheduler</h2>
          <p className="text-muted-foreground mt-2">
            Commentary generation runs daily at 12:00 UTC
          </p>
        </div>
        <Button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/commentary-scheduler/status'] });
            queryClient.invalidateQueries({ queryKey: ['/api/commentary-scheduler/quota-stats'] });
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Scheduler Status</TabsTrigger>
          <TabsTrigger value="cache">Cache Overview</TabsTrigger>
          <TabsTrigger value="optimization">Quota Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduler Status
              </CardTitle>
              <CardDescription>
                Commentary generation runs daily at 12:00 UTC
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <div className="mt-1">
                        {status ? getStatusBadge(status.active) : <Badge variant="secondary">Unknown</Badge>}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Last Run</label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {status ? formatDate(status.lastRunTimestamp) : 'Never'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Next Scheduled</label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {status ? formatDate(status.nextScheduledTime) : 'Unknown'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Scheduled Time</label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {status?.scheduledTime || '12:00 UTC'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {generateMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Generate Commentary Now
                    </Button>
                    <Button
                      onClick={() => cleanupMutation.mutate()}
                      disabled={cleanupMutation.isPending}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {cleanupMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Cleanup Old Cache
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Overview
              </CardTitle>
              <CardDescription>
                Smart caching system generates 3-5 commentary variants per currency pair daily
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{totalEntries}</div>
                      <div className="text-sm text-muted-foreground">Total Cache Entries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{cacheStats.length}</div>
                      <div className="text-sm text-muted-foreground">Currency Pairs Cached</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {cacheStats.length > 0 ? Math.round(totalEntries / cacheStats.length) : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Average per Pair</div>
                    </div>
                  </div>

                  {cacheStats.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Currency Pair Statistics</h4>
                      <div className="space-y-2">
                        {cacheStats.map((stat) => (
                          <div key={stat.currencyPair} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span className="font-medium">{stat.currencyPair}</span>
                            <div className="text-right">
                              <div className="text-sm font-medium">{stat.count} variants</div>
                              <div className="text-xs text-muted-foreground">Latest: {stat.latestDate}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recentCommentary.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Recent Commentary</h4>
                      <div className="space-y-2">
                        {recentCommentary.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-sm">{entry.currency_pair}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{entry.commentary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                OpenAI Quota Optimization
              </CardTitle>
              <CardDescription>
                Smart caching reduces API usage by 95%+ through batch generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : quotaStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Today's Generation</label>
                      <div className="mt-1 text-2xl font-bold">{quotaStats.todayGeneration}</div>
                      <div className="text-xs text-muted-foreground">API calls made today</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Currency Pairs</label>
                      <div className="mt-1 text-2xl font-bold">{quotaStats.currencyPairsGenerated}</div>
                      <div className="text-xs text-muted-foreground">Pairs generated today</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estimated Tokens</label>
                      <div className="mt-1 text-2xl font-bold">{quotaStats.estimatedTokensUsed.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Tokens used today</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estimated Cost</label>
                      <div className="mt-1 text-2xl font-bold">${quotaStats.estimatedCostUSD}</div>
                      <div className="text-xs text-muted-foreground">USD cost today</div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Optimization Results</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Before:</span>
                        <span className="text-green-900">{quotaStats.quotaOptimization.beforeOptimization}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">After:</span>
                        <span className="text-green-900">{quotaStats.quotaOptimization.afterOptimization}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-green-700">Savings:</span>
                        <span className="text-green-900">{quotaStats.quotaOptimization.savingsPercent}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">No quota data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}