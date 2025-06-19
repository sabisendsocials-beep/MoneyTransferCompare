import { useQuery } from "@tanstack/react-query";
import { MessageCircle, TrendingUp, TrendingDown, Zap, Sparkles, Flame } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CommentaryProps {
  fromCurrency?: string;
  toCurrency?: string;
}

interface CommentaryResponse {
  success: boolean;
  data: {
    currencyPair: string;
    commentary: string;
    timestamp: string;
  };
}

export function MarketCommentary({ fromCurrency = "GBP", toCurrency = "NGN" }: CommentaryProps) {
  const { data: commentary, isLoading, error } = useQuery<CommentaryResponse>({
    queryKey: [`/api/commentary/${fromCurrency}/${toCurrency}`],
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !commentary) {
    return (
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <MessageCircle className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Market analysis currently updating - check back for fresh insights on {fromCurrency}/{toCurrency} rates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine trend icon based on commentary content with more entertainment focus
  const getTrendIcon = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('glow-up') || lowerText.includes('flexing') || lowerText.includes('superhero') || lowerText.includes('main character') || lowerText.includes('violence') || lowerText.includes('up') || lowerText.includes('gain')) {
      return <Flame className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />;
    } else if (lowerText.includes('nap') || lowerText.includes('humble') || lowerText.includes('generous') || lowerText.includes('discount') || lowerText.includes('down') || lowerText.includes('dip')) {
      return <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />;
    } else if (lowerText.includes('drama') || lowerText.includes('battle') || lowerText.includes('fighting') || lowerText.includes('boss move') || lowerText.includes('excellence')) {
      return <Zap className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />;
    }
    return <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />;
  };

  const getCardStyle = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('glow-up') || lowerText.includes('flexing') || lowerText.includes('superhero') || lowerText.includes('main character') || lowerText.includes('violence')) {
      return "bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 shadow-md";
    } else if (lowerText.includes('nap') || lowerText.includes('humble') || lowerText.includes('generous') || lowerText.includes('discount')) {
      return "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 shadow-md";
    } else if (lowerText.includes('drama') || lowerText.includes('battle') || lowerText.includes('fighting') || lowerText.includes('boss move')) {
      return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-md";
    }
    return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm";
  };

  return (
    <Card className={getCardStyle(commentary.data.commentary)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {getTrendIcon(commentary.data.commentary)}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900">Market Buzz</h3>
              <span className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded-full font-medium">
                {commentary.data.currencyPair}
              </span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed font-medium">
              {commentary.data.commentary}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Updated {new Date(commentary.data.timestamp).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PopularPairsCommentary() {
  const { data: commentaries, isLoading, error } = useQuery({
    queryKey: ['/api/commentary/popular'],
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gray-50">
            <CardContent className="p-3">
              <div className="flex items-start space-x-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !commentaries) {
    return (
      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription>
          Market insights are updating. Please check back shortly for the latest commentary.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(commentaries.data).map(([pair, commentary]) => (
        <Card key={pair} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-start space-x-3">
              <MessageCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                    {pair}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {commentary as string}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}