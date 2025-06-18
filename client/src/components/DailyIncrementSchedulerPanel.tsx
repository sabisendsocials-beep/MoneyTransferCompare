/**
 * Daily Increment Scheduler Admin Panel
 * Provides monitoring and control for official base rate collection
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Clock, Play, Settings, CheckCircle, XCircle, Calendar, Activity } from 'lucide-react';

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
  dailyResults: DailyCollectionResult[];
}

interface DailyCollectionResult {
  hour: number;
  timestamp: string;
  successful: number;
  failed: number;
  totalProcessed: number;
  details: {
    fromCurrency: string;
    toCurrency: string;
    success: boolean;
    error?: string;
    rateCollected?: number;
  }[];
}

export default function DailyIncrementSchedulerPanel() {
  const [isEditing, setIsEditing] = useState(false);
  const [customHours, setCustomHours] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch scheduler status
  const { data: statusData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/daily-increment-scheduler/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const status: SchedulerStatus | undefined = (statusData as any)?.success ? (statusData as any).data : undefined;

  // Initialize custom hours input when data loads
  useEffect(() => {
    if (status && !isEditing) {
      setCustomHours(status.scheduledHours.join(', '));
    }
  }, [status, isEditing]);

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (hours: number[]) => {
      const response = await fetch('/api/admin/daily-increment-scheduler/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });

      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Schedule Updated",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-increment-scheduler/status'] });
        setIsEditing(false);
      } else {
        throw new Error(data.error || 'Update failed');
      }
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update schedule',
        variant: "destructive",
      });
    },
  });

  // Manual trigger mutation
  const triggerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/daily-increment-scheduler/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to trigger collection');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Manual Collection Completed",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-increment-scheduler/status'] });
      } else {
        throw new Error(data.error || 'Manual trigger failed');
      }
    },
    onError: (error) => {
      toast({
        title: "Manual Trigger Failed",
        description: error instanceof Error ? error.message : 'Failed to trigger collection',
        variant: "destructive",
      });
    },
  });

  const handleSaveSchedule = () => {
    try {
      const hours = customHours
        .split(',')
        .map(h => parseInt(h.trim()))
        .filter(h => !isNaN(h) && h >= 0 && h <= 23);

      if (hours.length === 0) {
        toast({
          title: "Invalid Input",
          description: "Please enter valid hours (0-23) separated by commas",
          variant: "destructive",
        });
        return;
      }

      updateScheduleMutation.mutate(hours);
    } catch (error) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid hours (0-23) separated by commas",
        variant: "destructive",
      });
    }
  };

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00 UTC`;
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Daily Increment Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Daily Increment Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-600">
            Failed to load scheduler status
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Daily Increment Scheduler Status
          </CardTitle>
          <CardDescription>
            Official base rate collection from Alpha Vantage API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={status.active ? "default" : "secondary"}>
                {status.active ? "Active" : "Inactive"}
              </Badge>
              <span className="text-sm text-gray-600">Scheduler Status</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm">
                Next: {formatDateTime(status.nextScheduledTime)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                Last: {status.lastRunTimestamp ? formatDateTime(status.lastRunTimestamp) : 'Never'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Today's Progress */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{status.totalSuccessfulToday}</div>
              <div className="text-sm text-gray-600">Successful Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{status.totalFailedToday}</div>
              <div className="text-sm text-gray-600">Failed Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{status.completedHoursToday.length}</div>
              <div className="text-sm text-gray-600">Completed Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{status.remainingHoursToday.length}</div>
              <div className="text-sm text-gray-600">Remaining Hours</div>
            </div>
          </div>

          {/* Manual Trigger */}
          <div className="pt-4">
            <Button 
              onClick={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending}
              className="w-full md:w-auto"
            >
              <Play className="h-4 w-4 mr-2" />
              {triggerMutation.isPending ? 'Triggering...' : 'Manual Trigger Collection'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Collection Schedule
          </CardTitle>
          <CardDescription>
            Configure when daily increment collections should run (UTC hours)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Label>Current Schedule:</Label>
            {status.scheduledHours.map(hour => (
              <Badge key={hour} variant="outline">
                {formatTime(hour)}
              </Badge>
            ))}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="schedule">Hours (0-23, comma separated)</Label>
                <Input
                  id="schedule"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  placeholder="3, 9, 12, 15, 18"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: 3, 9, 12, 15, 18 (for 3am, 9am, 12pm, 3pm, 6pm UTC)
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveSchedule}
                  disabled={updateScheduleMutation.isPending}
                >
                  {updateScheduleMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setCustomHours(status.scheduledHours.join(', '));
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Edit Schedule
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Collection Results */}
      {status.dailyResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Collection Results</CardTitle>
            <CardDescription>
              Detailed results from today's scheduled collections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.dailyResults.slice(-5).reverse().map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {formatTime(result.hour)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {formatDateTime(result.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{result.successful}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{result.failed}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Total: {result.totalProcessed}
                      </span>
                    </div>
                  </div>
                  
                  {result.details.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                      {result.details.slice(0, 6).map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {detail.success ? (
                            <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                          )}
                          <span>{detail.fromCurrency}/{detail.toCurrency}</span>
                          {detail.error && (
                            <span className="text-xs text-red-600 truncate">
                              - {detail.error}
                            </span>
                          )}
                        </div>
                      ))}
                      {result.details.length > 6 && (
                        <div className="text-xs text-gray-500">
                          +{result.details.length - 6} more pairs
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remaining Hours Today */}
      {status.remainingHoursToday.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Remaining Collections Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {status.remainingHoursToday.map(hour => (
                <Badge key={hour} variant="secondary">
                  {formatTime(hour)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}