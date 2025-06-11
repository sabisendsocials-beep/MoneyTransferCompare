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
        
        {/* Rate Prediction */}
        {prediction && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-blue-600" />
                7-Day Rate Forecast
              </h3>
              <Badge variant={prediction.trend === 'upward' ? 'default' : prediction.trend === 'downward' ? 'destructive' : 'secondary'}>
                {prediction.momentum} {prediction.trend}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-sm text-gray-600">Predicted Rate</p>
                <p className="text-lg font-semibold text-blue-700">
                  {formatRate(prediction.predictedRate)} {toCurrency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Confidence</p>
                <p className="text-lg font-semibold text-green-600">
                  {(prediction.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{prediction.reasoning}</p>
            </div>
            
            {prediction.recommendedAction === 'send_now' && (
              <div className="mt-3 p-2 bg-green-100 rounded-md">
                <p className="text-sm font-medium text-green-800">💡 Recommendation: Send Now</p>
              </div>
            )}
            
            {prediction.recommendedAction === 'wait' && (
              <div className="mt-3 p-2 bg-blue-100 rounded-md">
                <p className="text-sm font-medium text-blue-800">⏰ Recommendation: Wait for Better Rate</p>
              </div>
            )}
          </div>
        )}

        {/* Optimal Timing */}
        {timing && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border">
            <h3 className="font-semibold flex items-center mb-3">
              <Clock className="mr-2 h-4 w-4 text-green-600" />
              Optimal Transfer Timing
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-sm text-gray-600">Current Value</p>
                <p className="text-lg font-semibold">
                  {formatRate(timing.currentRate * amount)} {toCurrency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Predicted Value</p>
                <p className={`text-lg font-semibold ${timing.potentialSavings > 0 ? 'text-green-600' : timing.potentialSavings < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {formatRate(timing.predictedRate * amount)} {toCurrency}
                </p>
              </div>
            </div>
            
            {Math.abs(timing.potentialSavings) > 1 && (
              <div className={`p-2 rounded-md mb-3 ${timing.potentialSavings > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className={`text-sm font-medium ${timing.potentialSavings > 0 ? 'text-green-800' : 'text-red-800'}`}>
                  {timing.potentialSavings > 0 ? '📈' : '📉'} Potential {timing.potentialSavings > 0 ? 'Gain' : 'Loss'}: {Math.abs(timing.potentialSavings).toFixed(2)} {toCurrency}
                </p>
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