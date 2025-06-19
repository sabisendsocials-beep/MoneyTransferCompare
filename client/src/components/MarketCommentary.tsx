import { useQuery } from "@tanstack/react-query";
import { MessageCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

  if (error || !commentary?.success) {
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

  // Determine trend icon based on commentary content
  const getTrendIcon = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('up') || lowerText.includes('gain') || lowerText.includes('strengthen') || lowerText.includes('high')) {
      return <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />;
    } else if (lowerText.includes('down') || lowerText.includes('dip') || lowerText.includes('weak') || lowerText.includes('low')) {
      return <TrendingDown className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />;
    }
    return <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />;
  };

  const getCardStyle = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('up') || lowerText.includes('gain') || lowerText.includes('strengthen')) {
      return "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200";
    } else if (lowerText.includes('down') || lowerText.includes('dip') || lowerText.includes('weak')) {
      return "bg-gradient-to-r from-red-50 to-rose-50 border-red-200";
    }
    return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200";
  };

  return (
    <Card className={getCardStyle(commentary.data.commentary)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {getTrendIcon(commentary.data.commentary)}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900">Today's Market Insight</h3>
              <span className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded-full">
                {commentary.data.currencyPair}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
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

  if (error || !commentaries?.success) {
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