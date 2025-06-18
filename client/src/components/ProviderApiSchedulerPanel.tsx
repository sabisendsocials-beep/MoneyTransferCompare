import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Clock, Play, RefreshCw, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SchedulerStatus {
  active: boolean;
  lastRunDate: string | null;
  lastRunTimestamp: string | null;
  nextScheduledTime: string;
  scheduledHours: number[];
  completedHoursToday: number[];
  remainingHoursToday: number[];
  totalSuccessfulToday: number;
  totalFailedToday: number;
  dailyResults: Array<{
    hour: number;
    timestamp: string;
    successful: number;
    failed: number;
    details: Array<{
      providerId: number;
      providerName: string;
      success: boolean;
      error?: string;
      ratesCollected?: number;
    }>;
  }>;
}

export default function ProviderApiSchedulerPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [customHours, setCustomHours] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch scheduler status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['/api/admin/provider-api-scheduler/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const status: SchedulerStatus | undefined = statusData?.data;

  // Initialize custom hours input when data loads
  useEffect(() => {
    if (status && !isEditing) {
      setCustomHours(status.scheduledHours.join(', '));
    }
  }, [status, isEditing]);

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (hours: number[]) => {
      return apiRequest('/api/admin/provider-api-scheduler/schedule', {
        method: 'POST',
        body: { hours }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Schedule Updated',
        description: 'Collection schedule has been updated successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/provider-api-scheduler/status'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update schedule',
        variant: 'destructive'
      });
    }
  });

  // Manual trigger mutation
  const triggerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/provider-api-scheduler/trigger', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Collection Triggered',
        description: data.message || 'Manual collection completed successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/provider-api-scheduler/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Collection Failed',
        description: error.message || 'Failed to trigger manual collection',
        variant: 'destructive'
      });
    }
  });

  const handleUpdateSchedule = () => {
    if (!customHours.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter valid hours (0-23)',
        variant: 'destructive'
      });
      return;
    }

    try {
      const hours = customHours
        .split(',')
        .map(h => parseInt(h.trim()))
        .filter(h => !isNaN(h) && h >= 0 && h <= 23);

      if (hours.length === 0) {
        throw new Error('No valid hours provided');
      }

      updateScheduleMutation.mutate(hours);
    } catch (error) {
      toast({
        title: 'Invalid Format',
        description: 'Please enter hours as comma-separated numbers (e.g., 6, 12, 18)',
        variant: 'destructive'
      });
    }
  };

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00 UTC`;
  };

  const formatLastRun = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading scheduler status...</span>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <span>Unable to load scheduler status</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Provider API Scheduler</CardTitle>
              <CardDescription>
                Automatically collect rates from API-enabled providers
              </CardDescription>
            </div>
            {getStatusBadge(status.active)}
          </div>
        </CardHeader>
      </Card>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {status.totalSuccessfulToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {status.totalFailedToday > 0 && (
                <span className="text-red-600">{status.totalFailedToday} failed</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.completedHoursToday.length}/{status.scheduledHours.length}
            </div>
            <p className="text-xs text-muted-foreground">
              collection cycles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {formatLastRun(status.lastRunTimestamp)}
            </div>
            <p className="text-xs text-muted-foreground">
              Next: {formatTime(status.remainingHoursToday[0] || status.scheduledHours[0])}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Collection Schedule
          </CardTitle>
          <CardDescription>
            Configure when the scheduler should collect rates from API providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Schedule (UTC)</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {status.scheduledHours.map(hour => (
                <Badge key={hour} variant="secondary">
                  {formatTime(hour)}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <label className="text-sm font-medium">Update Schedule</label>
            <div className="flex gap-2">
              <Input
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                placeholder="6, 9, 12, 15, 18, 21"
                onFocus={() => setIsEditing(true)}
                className="flex-1"
              />
              <Button 
                onClick={handleUpdateSchedule}
                disabled={updateScheduleMutation.isPending}
                size="sm"
              >
                {updateScheduleMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Update'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter hours (0-23) separated by commas. Example: 6, 12, 18 for 6am, 12pm, 6pm UTC
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manual Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Manual Control
          </CardTitle>
          <CardDescription>
            Trigger collection cycles manually for testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="w-full sm:w-auto"
          >
            {triggerMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Collecting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Trigger Collection Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Today's Results */}
      {status.dailyResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Collection Results</CardTitle>
            <CardDescription>
              Detailed results from each collection cycle today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.dailyResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {formatTime(result.hour)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {result.successful > 0 && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {result.successful} successful
                        </Badge>
                      )}
                      {result.failed > 0 && (
                        <Badge variant="destructive">
                          {result.failed} failed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {result.details.length > 0 && (
                    <div className="space-y-2">
                      {result.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium">{detail.providerName}</span>
                          <div className="flex items-center gap-2">
                            {detail.success ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">
                                  {detail.ratesCollected} rates
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-red-600 text-xs">
                                  {detail.error}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}