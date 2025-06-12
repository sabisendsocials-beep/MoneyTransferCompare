import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Brain, 
  AlertCircle, 
  RotateCcw,
  Target,
  Lightbulb,
  Zap,
  ArrowRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AIInsightsProps {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  onCreateAlert?: (threshold: number) => void;
}

export function AIInsights({ fromCurrency, toCurrency, amount, onCreateAlert }: AIInsightsProps) {
  // Fetch AI predictions
  const { data: prediction, isLoading: predictionLoading } = useQuery({
    queryKey: ['/api/ai/rate-prediction', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai/rate-prediction?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: timing, isLoading: timingLoading } = useQuery({
    queryKey: ['/api/ai/optimal-timing', fromCurrency, toCurrency, amount],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai/optimal-timing?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&amount=${amount}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!amount && !isNaN(amount),
  });

  const { data: smartAlert, isLoading: alertLoading } = useQuery({
    queryKey: ['/api/ai/smart-alert-suggestion', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai/smart-alert-suggestion?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: providerRotation, isLoading: rotationLoading } = useQuery({
    queryKey: ['/api/ai/provider-rotation', fromCurrency, toCurrency],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai/provider-rotation?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
  };

  const isLoading = predictionLoading || timingLoading || alertLoading || rotationLoading;
  const hasAnyData = prediction || timing || smartAlert || providerRotation;
  const hasErrors = !predictionLoading && !timingLoading && !alertLoading && !rotationLoading && !hasAnyData;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-16 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasErrors) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Insights Temporarily Unavailable</h3>
            <p className="text-gray-600 mb-4">
              AI predictions require sufficient historical data. Please check back as more market data becomes available.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Your rate comparison and alert features remain fully functional. AI insights enhance but don't replace core functionality.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="mr-2 h-5 w-5 text-blue-600" />
          AI-Powered Insights
          <Badge variant="secondary" className="ml-2">
            <Zap className="mr-1 h-3 w-3" />
            Smart
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Enhanced Rate Prediction */}
        {prediction && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-blue-600" />
                Advanced Rate Forecast
              </h3>
              <div className="flex items-center space-x-2">
                <Badge variant={prediction.trend === 'upward' ? 'default' : prediction.trend === 'downward' ? 'destructive' : 'secondary'}>
                  {prediction.momentum} {prediction.trend}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  7-day outlook
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-sm text-gray-600">Current Rate</p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatRate(timing?.currentRate || 0)} {toCurrency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Predicted Rate</p>
                <p className={`text-lg font-semibold ${prediction.predictedRate > (timing?.currentRate || 0) ? 'text-green-600' : 'text-red-600'}`}>
                  {formatRate(prediction.predictedRate)} {toCurrency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Confidence Level</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${prediction.confidence > 0.7 ? 'bg-green-500' : prediction.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${prediction.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{(prediction.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Confidence Range Indicator */}
            <div className="mb-3 p-2 bg-white/50 rounded-md">
              <p className="text-xs text-gray-600 mb-1">Prediction Range</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Low: {formatRate(prediction.predictedRate * (1 - (1 - prediction.confidence) * 0.5))} {toCurrency}
                </span>
                <span className="text-gray-500">
                  High: {formatRate(prediction.predictedRate * (1 + (1 - prediction.confidence) * 0.5))} {toCurrency}
                </span>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{prediction.reasoning}</p>
            </div>
            
            {prediction.recommendedAction === 'send_now' && (
              <div className="p-2 bg-green-100 rounded-md border-l-4 border-green-500">
                <p className="text-sm font-medium text-green-800">Optimal Action: Transfer Now</p>
                <p className="text-xs text-green-700 mt-1">Market conditions favor immediate transfers</p>
              </div>
            )}
            
            {prediction.recommendedAction === 'wait' && (
              <div className="p-2 bg-blue-100 rounded-md border-l-4 border-blue-500">
                <p className="text-sm font-medium text-blue-800">Optimal Action: Wait for Better Rates</p>
                <p className="text-xs text-blue-700 mt-1">Expected improvement in coming days</p>
              </div>
            )}

            {prediction.recommendedAction === 'set_alert' && (
              <div className="p-2 bg-amber-100 rounded-md border-l-4 border-amber-500">
                <p className="text-sm font-medium text-amber-800">Optimal Action: Set Rate Alert</p>
                <p className="text-xs text-amber-700 mt-1">Market uncertainty suggests monitoring approach</p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Optimal Timing */}
        {timing && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border">
            <h3 className="font-semibold flex items-center mb-3">
              <Clock className="mr-2 h-4 w-4 text-green-600" />
              Transfer Timing Analysis
            </h3>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Today's Value</p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatRate(timing.currentRate * amount)} {toCurrency}
                </p>
                <p className="text-xs text-gray-500">Current rate</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">7-Day Forecast</p>
                <p className={`text-lg font-semibold ${timing.potentialSavings > 0 ? 'text-green-600' : timing.potentialSavings < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {formatRate(timing.predictedRate * amount)} {toCurrency}
                </p>
                <p className="text-xs text-gray-500">Predicted value</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Confidence</p>
                <p className={`text-lg font-semibold ${timing.confidence > 0.7 ? 'text-green-600' : timing.confidence > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {(timing.confidence * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">Prediction accuracy</p>
              </div>
            </div>

            {/* Visual Impact Indicator */}
            {Math.abs(timing.potentialSavings) > 1 && (
              <div className="mb-4">
                <div className={`p-3 rounded-lg border-l-4 ${timing.potentialSavings > 0 ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${timing.potentialSavings > 0 ? 'text-green-800' : 'text-red-800'}`}>
                      Potential {timing.potentialSavings > 0 ? 'Savings' : 'Loss'}
                    </span>
                    <span className={`text-lg font-bold ${timing.potentialSavings > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {timing.potentialSavings > 0 ? '+' : ''}{timing.potentialSavings.toFixed(2)} {toCurrency}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${timing.potentialSavings > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.abs(timing.potentialSavings / amount * 100) * 10)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {timing.potentialSavings > 0 ? 'Waiting may benefit you' : 'Consider transferring now to avoid losses'}
                  </p>
                </div>
              </div>
            )}

            {/* Days to Wait Recommendation */}
            {timing.daysToWait > 0 && (
              <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Recommended waiting period:</span>
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    {timing.daysToWait} days
                  </Badge>
                </div>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <Target className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{timing.recommendation}</p>
            </div>
          </div>
        )}

        {/* Enhanced Smart Alert Suggestions */}
        {smartAlert && onCreateAlert && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border">
            <h3 className="font-semibold flex items-center mb-3">
              <AlertCircle className="mr-2 h-4 w-4 text-amber-600" />
              Intelligent Alert Suggestions
            </h3>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Current Rate</p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatRate(timing?.currentRate || 0)} {toCurrency}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Suggested Alert</p>
                <p className="text-lg font-semibold text-amber-700">
                  {formatRate(smartAlert.suggestedThreshold)} {toCurrency}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Market Position</p>
                <Badge variant={smartAlert.marketPosition === 'above_average' ? 'default' : smartAlert.marketPosition === 'below_average' ? 'destructive' : 'secondary'}>
                  {smartAlert.marketPosition.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Market Analysis */}
            <div className="mb-4 p-3 bg-white/60 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Market Analysis</span>
                <Badge variant="outline" className="text-xs">
                  {smartAlert.volatilityLevel} volatility
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{smartAlert.reasoning}</p>
            </div>

            {/* Alert Strategy Options */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-2 bg-white/40 rounded">
                <div>
                  <p className="text-sm font-medium">Conservative Alert</p>
                  <p className="text-xs text-gray-600">Small improvement target</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatRate(smartAlert.suggestedThreshold * 1.005)} {toCurrency}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onCreateAlert(smartAlert.suggestedThreshold * 1.005)}
                    className="text-xs h-6 px-2"
                  >
                    Set
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-amber-100/60 rounded border border-amber-200">
                <div>
                  <p className="text-sm font-medium">AI Recommended</p>
                  <p className="text-xs text-gray-600">Optimal balance of risk/reward</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-700">{formatRate(smartAlert.suggestedThreshold)} {toCurrency}</p>
                  <Button 
                    size="sm" 
                    onClick={() => onCreateAlert(smartAlert.suggestedThreshold)}
                    className="text-xs h-6 px-2"
                  >
                    Set Alert
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-white/40 rounded">
                <div>
                  <p className="text-sm font-medium">Aggressive Alert</p>
                  <p className="text-xs text-gray-600">Higher reward, higher risk</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatRate(smartAlert.suggestedThreshold * 1.01)} {toCurrency}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onCreateAlert(smartAlert.suggestedThreshold * 1.01)}
                    className="text-xs h-6 px-2"
                  >
                    Set
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              You maintain full control - these are suggestions based on market analysis
            </div>
          </div>
        )}

        {/* Enhanced Provider Intelligence */}
        {providerRotation && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border">
            <h3 className="font-semibold flex items-center mb-3">
              <RotateCcw className="mr-2 h-4 w-4 text-purple-600" />
              Market Intelligence
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/50 p-3 rounded-md">
                <p className="text-xs text-gray-600 mb-1">Current Market Leader</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="text-xs">{providerRotation.currentBest}</Badge>
                  <span className="text-xs text-green-600">Active</span>
                </div>
              </div>
              
              <div className="bg-white/50 p-3 rounded-md">
                <p className="text-xs text-gray-600 mb-1">Historical Performance</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">{providerRotation.historicalLeader}</Badge>
                  <span className="text-xs text-blue-600">Consistent</span>
                </div>
              </div>
            </div>

            {/* Market Pattern Analysis */}
            {providerRotation.timePattern && (
              <div className="mb-4 p-3 bg-purple-100/60 rounded-md border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">Market Pattern Detected</span>
                  <Badge variant="outline" className="text-xs text-purple-700">
                    Timing Intelligence
                  </Badge>
                </div>
                <p className="text-sm text-purple-700">{providerRotation.timePattern}</p>
              </div>
            )}

            {/* Background Intelligence Note */}
            <div className="mb-3 p-2 bg-white/60 rounded-md border border-gray-200">
              <div className="flex items-start space-x-2">
                <Lightbulb className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 mb-1">{providerRotation.recommendation}</p>
                  <p className="text-xs text-gray-500">
                    This intelligence complements your existing provider comparisons without overriding current rates or fees.
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-md">
              <p className="text-xs font-medium text-indigo-800 mb-1">Market Insight</p>
              <p className="text-xs text-indigo-700">
                Provider performance varies by timing and market conditions. Monitor multiple providers for optimal opportunities.
              </p>
            </div>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}