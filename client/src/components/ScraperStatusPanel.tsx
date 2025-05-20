import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';

type ScraperStatus = {
  id: number;
  name: string;
  lastRun: string | null;
  nextRun: string | null;
  success: boolean;
  message: string;
  canRunNow: boolean;
  timeSinceLastRun: string;
};

type ScraperStatusResponse = {
  success: boolean;
  status: ScraperStatus[];
  minTimeBetweenRuns: string;
  minTimeBetweenRunsMs: number;
};

const ScraperStatusPanel = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Fetch scraper status data
  const { data, isLoading, error } = useQuery<ScraperStatusResponse>({
    queryKey: ['scraper-status', refreshTrigger],
    queryFn: async () => {
      try {
        console.log('Fetching scraper status from /api/scrapers/status');
        const response = await fetch('/api/scrapers/status');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch scraper status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Scraper status data:', data);
        return data;
      } catch (err) {
        console.error('Error fetching scraper status:', err);
        throw err;
      }
    }
  });
  
  // Manual refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Reset timer for a scraper
  const handleResetTimer = async (id: number) => {
    try {
      const response = await fetch(`/api/scrapers/reset-timer/${id}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset timer');
      }
      
      // Refresh the data
      handleRefresh();
    } catch (error) {
      console.error('Error resetting timer:', error);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading scraper status...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load scraper status information. Please try again later.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Scraper Status</span>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          View the status of all scrapers and their last run times.
          {data?.minTimeBetweenRuns && (
            <span className="block mt-1">
              <Clock className="inline-block h-4 w-4 mr-1" />
              Minimum time between runs: <strong>{data.minTimeBetweenRuns}</strong>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Next Available Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.status?.map((scraper) => (
                <TableRow key={scraper.id}>
                  <TableCell className="font-medium">{scraper.name}</TableCell>
                  <TableCell>{formatDate(scraper.lastRun)}</TableCell>
                  <TableCell>
                    {scraper.canRunNow ? (
                      <Badge variant="outline" className="bg-green-50 text-green-800">Ready to run</Badge>
                    ) : (
                      formatDate(scraper.nextRun)
                    )}
                  </TableCell>
                  <TableCell>
                    {scraper.lastRun ? (
                      scraper.success ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-4 w-4 mr-1" /> Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-4 w-4 mr-1" /> Failed
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline">Never run</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">{scraper.message}</TableCell>
                  <TableCell>
                    <Button 
                      onClick={() => handleResetTimer(scraper.id)} 
                      variant="outline"
                      size="sm"
                      disabled={scraper.canRunNow}
                    >
                      Reset Timer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleString()}
      </CardFooter>
    </Card>
  );
};

export default ScraperStatusPanel;