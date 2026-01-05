import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Clock, 
  Brain, 
  AlertCircle, 
  Target,
  Lightbulb,
  Zap,
  Bell,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Crown,
  BarChart3
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProviderRotation {
  currentBest: string;
  historicalLeader: string;
  recommendation: string;
  timePattern?: string;
}

interface RateForecastProps {
  fromCurrency: string;
  toCurrency: string;
  amount?: number;
  onCreateAlert?: (targetRate: number) => void;
}

interface PowerInsightData {
  currencyPair: string;
  timestamp: string;
  currentMarket: {
    baseRate: number;
    bestProviderRate: number;
    bestProvider: string;
    providerSpread: number;
    providerCount: number;
  };
  anomalies: {
    isBestIn30Days: boolean;
    isWorstIn30Days: boolean;
    isHighSpread: boolean;
    insight: string;
  };
  forecast: {
    sevenDay: {
      predictedRate: number;
      changePercent: number;
      confidence: number;
      direction: 'up' | 'down' | 'stable';
    };
    thirtyDay: {
      predictedRate: number;
      changePercent: number;
      confidence: number;
      direction: 'up' | 'down' | 'stable';
    };
  };
  recommendation: {
    action: 'send_now' | 'wait' | 'set_alert';
    reasoning: string;
    urgency: 'high' | 'medium' | 'low';
    potentialImpact: string;
  };
  alertSuggestion: {
    targetRate: number;
    percentageAboveCurrent: number;
    reasoning: string;
  };
}

export function RateForecast({ fromCurrency, toCurrency, amount = 500, onCreateAlert }: RateForecastProps) {
  const { data: insight, isLoading, error } = useQuery<PowerInsightData>({
    queryKey: ['/api/ai/power-insight', fromCurrency, toCurrency, amount],
    queryFn: async () => {
      const response = await fetch(`/api/ai/power-insight?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&amount=${amount}`);
      if (!response.ok) throw new Error('Failed to fetch power insight');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: providerRotation } = useQuery<ProviderRotation>({
    queryKey: ['/api/ai/provider-rotation', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await fetch(`/api/ai/provider-rotation?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`);
      if (!response.ok) throw new Error('Failed to fetch provider rotation');
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
  };

  const DirectionIcon = ({ direction }: { direction: 'up' | 'down' | 'stable' }) => {
    if (direction === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (direction === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const ConfidenceBar = ({ confidence }: { confidence: number }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${
            confidence > 0.7 ? 'bg-green-500' : 
            confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-400'
          }`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600">{(confidence * 100).toFixed(0)}%</span>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            Rate Forecast & Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !insight) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            Rate Forecast & Timing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Forecast data requires sufficient historical rates. Check back soon.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentMarket, anomalies, forecast, recommendation, alertSuggestion } = insight;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white pb-4">
        <CardTitle className="flex items-center text-white">
          <Brain className="mr-2 h-5 w-5" />
          Rate Forecast & Timing
          <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
            <Zap className="mr-1 h-3 w-3" />
            AI Powered
          </Badge>
        </CardTitle>
        <p className="text-blue-100 text-sm mt-1">
          Based on {currentMarket.providerCount} providers • {fromCurrency}/{toCurrency}
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        {anomalies.insight && (anomalies.isBestIn30Days || anomalies.isWorstIn30Days || anomalies.isHighSpread) && (
          <Alert className={`rounded-none border-x-0 border-t-0 ${
            anomalies.isBestIn30Days ? 'bg-green-50 border-green-200' : 
            anomalies.isWorstIn30Days ? 'bg-amber-50 border-amber-200' : 
            'bg-purple-50 border-purple-200'
          }`}>
            <Sparkles className={`h-4 w-4 ${
              anomalies.isBestIn30Days ? 'text-green-600' : 
              anomalies.isWorstIn30Days ? 'text-amber-600' : 
              'text-purple-600'
            }`} />
            <AlertDescription className="font-medium">
              {anomalies.insight}
            </AlertDescription>
          </Alert>
        )}

        <div className="p-4 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">7-Day Forecast</span>
                <DirectionIcon direction={forecast.sevenDay.direction} />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatRate(forecast.sevenDay.predictedRate)}
              </p>
              <p className={`text-sm font-medium ${
                forecast.sevenDay.direction === 'up' ? 'text-green-600' : 
                forecast.sevenDay.direction === 'down' ? 'text-red-600' : 
                'text-gray-500'
              }`}>
                {forecast.sevenDay.changePercent > 0 ? '+' : ''}{forecast.sevenDay.changePercent.toFixed(1)}% predicted
              </p>
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Confidence</p>
                <ConfidenceBar confidence={forecast.sevenDay.confidence} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">30-Day Forecast</span>
                <DirectionIcon direction={forecast.thirtyDay.direction} />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatRate(forecast.thirtyDay.predictedRate)}
              </p>
              <p className={`text-sm font-medium ${
                forecast.thirtyDay.direction === 'up' ? 'text-green-600' : 
                forecast.thirtyDay.direction === 'down' ? 'text-red-600' : 
                'text-gray-500'
              }`}>
                {forecast.thirtyDay.changePercent > 0 ? '+' : ''}{forecast.thirtyDay.changePercent.toFixed(1)}% predicted
              </p>
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Confidence</p>
                <ConfidenceBar confidence={forecast.thirtyDay.confidence} />
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-l-4 ${
            recommendation.action === 'send_now' ? 'bg-green-50 border-green-500' :
            recommendation.action === 'wait' ? 'bg-blue-50 border-blue-500' :
            'bg-amber-50 border-amber-500'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                recommendation.action === 'send_now' ? 'bg-green-100' :
                recommendation.action === 'wait' ? 'bg-blue-100' :
                'bg-amber-100'
              }`}>
                {recommendation.action === 'send_now' && <Zap className="h-5 w-5 text-green-600" />}
                {recommendation.action === 'wait' && <Clock className="h-5 w-5 text-blue-600" />}
                {recommendation.action === 'set_alert' && <Bell className="h-5 w-5 text-amber-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-semibold ${
                    recommendation.action === 'send_now' ? 'text-green-800' :
                    recommendation.action === 'wait' ? 'text-blue-800' :
                    'text-amber-800'
                  }`}>
                    {recommendation.action === 'send_now' && 'Send Now'}
                    {recommendation.action === 'wait' && 'Consider Waiting'}
                    {recommendation.action === 'set_alert' && 'Set an Alert'}
                  </h4>
                  <Badge variant={
                    recommendation.urgency === 'high' ? 'destructive' :
                    recommendation.urgency === 'medium' ? 'default' :
                    'secondary'
                  } className="text-xs">
                    {recommendation.urgency} urgency
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-2">{recommendation.reasoning}</p>
                <p className="text-xs text-gray-500">{recommendation.potentialImpact}</p>
              </div>
            </div>
          </div>

          {onCreateAlert && (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Set Alert at {formatRate(alertSuggestion.targetRate)}</p>
                    <p className="text-sm text-gray-600">{alertSuggestion.reasoning}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => onCreateAlert(alertSuggestion.targetRate)}
                  className="flex items-center gap-1"
                  data-testid="btn-set-recommended-alert"
                >
                  <Bell className="h-4 w-4" />
                  Set Alert
                </Button>
              </div>
            </div>
          )}

          {providerRotation && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-100">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-rose-600" />
                <h4 className="font-semibold text-gray-900">Market Intelligence</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Market Leader</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-rose-600">
                      {providerRotation.currentBest}
                    </Badge>
                    <span className="text-xs text-green-600 font-medium">Active</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Historical Performance</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-blue-300 text-blue-700">
                      {providerRotation.historicalLeader}
                    </Badge>
                    <span className="text-xs text-blue-600 font-medium">Consistent</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 text-sm text-gray-700 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p>{providerRotation.recommendation}</p>
              </div>
              
              <p className="text-xs text-gray-500 italic">
                This intelligence complements your existing provider comparisons without overriding current rates or fees.
              </p>
              
              {providerRotation.timePattern && (
                <div className="mt-3 pt-3 border-t border-rose-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Market Insight</p>
                      <p className="text-xs text-gray-600">Provider performance varies by timing and market conditions. Monitor multiple providers for optimal opportunities.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              <span>AI analyses up to 2 years of data for seasonal patterns</span>
            </div>
            <span>Updated {new Date(insight.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
