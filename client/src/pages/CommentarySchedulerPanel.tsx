import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Play, Trash2, TrendingUp, Clock, Database, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats[]>([]);
  const [recentCommentary, setRecentCommentary] = useState<CommentaryEntry[]>([]);
  const [quotaStats, setQuotaStats] = useState<QuotaStats | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching commentary scheduler data...');
      
      // Fetch scheduler status and cache stats
      const statusResponse = await fetch('/api/commentary-scheduler/status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log('Status response:', statusResponse.status, statusResponse.statusText);
      console.log('Status response headers:', Object.fromEntries(statusResponse.headers.entries()));
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP ${statusResponse.status}: ${statusResponse.statusText}`);
      }
      
      const statusText = await statusResponse.text();
      console.log('Status response text length:', statusText?.length);
      console.log('Status response text preview:', statusText?.substring(0, 500));
      
      let statusData;
      
      if (!statusText || statusText.trim() === '') {
        console.warn('Empty status response, using defaults');
        statusData = { success: false, data: null };
      } else {
        try {
          statusData = JSON.parse(statusText);
          console.log('Parsed status data:', statusData);
        } catch (parseError) {
          console.error('Failed to parse status response:', statusText);
          console.error('Parse error:', parseError);
          statusData = { success: false, data: null, error: 'JSON parse failed' };
        }
      }
      
      if (statusData?.success && statusData?.data) {
        setStatus(statusData.data.scheduler || null);
        setCacheStats(statusData.data.cache?.currencyPairStats || []);
        setRecentCommentary(statusData.data.cache?.recentCommentary || []);
        setTotalEntries(parseInt(statusData.data.cache?.totalEntries) || 0);
      } else {
        console.warn('Status data unsuccessful or missing:', statusData);
        // Set default values
        setStatus(null);
        setCacheStats([]);
        setRecentCommentary([]);
        setTotalEntries(0);
      }
      
      // Fetch quota statistics
      const quotaResponse = await fetch('/api/commentary-scheduler/quota-stats', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log('Quota response:', quotaResponse.status, quotaResponse.statusText);
      console.log('Quota response headers:', Object.fromEntries(quotaResponse.headers.entries()));
      
      if (quotaResponse.ok) {
        const quotaText = await quotaResponse.text();
        console.log('Quota response text length:', quotaText?.length);
        console.log('Quota response text preview:', quotaText?.substring(0, 500));
        
        let quotaData;
        
        if (!quotaText || quotaText.trim() === '') {
          console.warn('Empty quota response, using defaults');
          quotaData = { success: false, data: null };
        } else {
          try {
            quotaData = JSON.parse(quotaText);
            console.log('Parsed quota data:', quotaData);
          } catch (parseError) {
            console.error('Failed to parse quota response:', quotaText);
            console.error('Parse error:', parseError);
            quotaData = { success: false, data: null, error: 'JSON parse failed' };
          }
        }
        
        if (quotaData?.success && quotaData?.data) {
          setQuotaStats(quotaData.data);
        } else {
          console.warn('Quota data unsuccessful or missing:', quotaData);
          setQuotaStats(null);
        }
      }
      
    } catch (error) {
      console.error('Error fetching commentary scheduler data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch scheduler data",
        variant: "destructive",
      });
      
      // Set safe defaults on error
      setStatus(null);
      setCacheStats([]);
      setRecentCommentary([]);
      setTotalEntries(0);
      setQuotaStats(null);
    } finally {
      setLoading(false);
    }
  };

  const triggerGeneration = async () => {
    try {
      setIsGenerating(true);
      
      const response = await fetch('/api/commentary-scheduler/generate', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
        fetchData(); // Refresh data
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to trigger commentary generation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error triggering commentary generation:', error);
      toast({
        title: "Error",
        description: "Failed to trigger commentary generation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const cleanupCache = async () => {
    try {
      setIsCleaning(true);
      
      const response = await fetch('/api/commentary-scheduler/cleanup', {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
        fetchData(); // Refresh data
      } else {
        toast({
          title: "Error",
          description: "Failed to cleanup cache",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
      toast({
        title: "Error",
        description: "Failed to cleanup cache",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading commentary scheduler data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Commentary Scheduler Admin</h1>
          <p className="text-muted-foreground">
            Manage AI commentary caching system and OpenAI quota optimization
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cache">Cache Management</TabsTrigger>
          <TabsTrigger value="quota">Quota Statistics</TabsTrigger>
          <TabsTrigger value="recent">Recent Commentary</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Scheduler Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduler Status
              </CardTitle>
              <CardDescription>
                Commentary generation runs daily at {status?.scheduledTime}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Status</div>
                  <Badge variant={status?.active ? "default" : "secondary"}>
                    {status?.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Last Run</div>
                  <div className="text-sm text-muted-foreground">
                    {status?.lastRunDate || "Never"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Next Scheduled</div>
                  <div className="text-sm text-muted-foreground">
                    {status?.nextScheduledTime ? 
                      new Date(status.nextScheduledTime).toLocaleString() : 
                      "Not scheduled"
                    }
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={triggerGeneration} 
                  disabled={isGenerating}
                  className="mr-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Generate Commentary Now
                </Button>
                <Button 
                  onClick={cleanupCache} 
                  disabled={isCleaning}
                  variant="outline"
                >
                  {isCleaning ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Cleanup Old Cache
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cache Overview */}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Total Cache Entries</div>
                  <div className="text-2xl font-bold">{totalEntries}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Currency Pairs Cached</div>
                  <div className="text-2xl font-bold">{cacheStats.length}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Average per Pair</div>
                  <div className="text-2xl font-bold">
                    {cacheStats.length > 0 ? Math.round(totalEntries / cacheStats.length) : 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics by Currency Pair</CardTitle>
              <CardDescription>
                Commentary entries stored for each currency corridor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cacheStats.map((stat) => (
                  <div key={stat.currencyPair} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{stat.currencyPair}</div>
                      <div className="text-sm text-muted-foreground">
                        Latest: {stat.latestDate}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {stat.count} entries
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quota" className="space-y-6">
          {quotaStats && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    OpenAI Quota Optimization
                  </CardTitle>
                  <CardDescription>
                    Smart caching dramatically reduces OpenAI API usage and costs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium">Today's Generation</div>
                        <div className="text-2xl font-bold">{quotaStats.todayGeneration} commentaries</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Currency Pairs Generated</div>
                        <div className="text-2xl font-bold">{quotaStats.currencyPairsGenerated}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium">Estimated Tokens Used</div>
                        <div className="text-2xl font-bold">{quotaStats.estimatedTokensUsed.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Estimated Cost (USD)</div>
                        <div className="text-2xl font-bold">${quotaStats.estimatedCostUSD}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Optimization Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Quota Usage Reduced by {quotaStats.quotaOptimization.savingsPercent}</strong>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-red-600">Before Optimization</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {quotaStats.quotaOptimization.beforeOptimization}
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-green-600">After Optimization</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {quotaStats.quotaOptimization.afterOptimization}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Commentary Entries</CardTitle>
              <CardDescription>
                Latest AI-generated market insights stored in cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCommentary.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{entry.currency_pair}</Badge>
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm">
                      {entry.commentary}
                    </div>
                  </div>
                ))}
                
                {recentCommentary.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent commentary entries found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}