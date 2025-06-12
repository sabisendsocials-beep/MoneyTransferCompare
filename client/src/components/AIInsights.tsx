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
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-lg"></div>
            ))}
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

        {/* Smart Alert Suggestion */}
        {smartAlert && onCreateAlert && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border">
            <h3 className="font-semibold flex items-center mb-3">
              <AlertCircle className="mr-2 h-4 w-4 text-amber-600" />
              Smart Alert Recommendation
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-sm text-gray-600">Suggested Threshold</p>
                <p className="text-lg font-semibold text-amber-700">
                  {formatRate(smartAlert.suggestedThreshold)} {toCurrency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Market Position</p>
                <Badge variant={smartAlert.marketPosition === 'above_average' ? 'default' : smartAlert.marketPosition === 'below_average' ? 'destructive' : 'secondary'}>
                  {smartAlert.marketPosition.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">{smartAlert.reasoning}</p>
            
            <Button 
              size="sm" 
              onClick={() => onCreateAlert(smartAlert.suggestedThreshold)}
              className="w-full"
            >
              Set Smart Alert
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Provider Rotation */}
        {providerRotation && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border">
            <h3 className="font-semibold flex items-center mb-3">
              <RotateCcw className="mr-2 h-4 w-4 text-purple-600" />
              Provider Intelligence
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Best:</span>
                <Badge variant="default">{providerRotation.currentBest}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Historical Leader:</span>
                <Badge variant="secondary">{providerRotation.historicalLeader}</Badge>
              </div>
              
              {providerRotation.timePattern && (
                <div className="mt-2 p-2 bg-purple-100 rounded-md">
                  <p className="text-sm text-purple-800">
                    ⏱️ Pattern: {providerRotation.timePattern}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{providerRotation.recommendation}</p>
            </div>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}