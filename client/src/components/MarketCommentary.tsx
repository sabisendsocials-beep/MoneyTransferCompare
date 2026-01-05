import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, Flame, Sparkles, Zap } from 'lucide-react';

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
    metadata?: {
      bestProvider: string;
      bestRate: number;
      rateSpread: number;
      movement: 'up' | 'down' | 'stable';
      changePercent: number;
      providerCount: number;
      dataSource: string;
    };
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
    if (!text || typeof text !== 'string') return <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />;
    const lowerText = text.toLowerCase();
    if (lowerText.includes('leads') || lowerText.includes('better') || lowerText.includes('advantage') || lowerText.includes('competitive')) {
      return <Flame className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />;
    } else if (lowerText.includes('spread') || lowerText.includes('margin') || lowerText.includes('gap')) {
      return <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />;
    } else if (lowerText.includes('volatility') || lowerText.includes('movement') || lowerText.includes('change')) {
      return <Zap className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />;
    }
    return <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />;
  };

  const getCardStyle = (text: string) => {
    if (!text || typeof text !== 'string') return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200";
    const lowerText = text.toLowerCase();
    if (lowerText.includes('leads') || lowerText.includes('better') || lowerText.includes('advantage')) {
      return "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md";
    } else if (lowerText.includes('spread') || lowerText.includes('margin')) {
      return "bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 shadow-md";
    } else if (lowerText.includes('volatility') || lowerText.includes('movement')) {
      return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-md";
    }
    return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200";
  };

  const commentaryText = commentary?.data?.commentary || '';
  const timestamp = commentary?.data?.timestamp || '';
  const metadata = commentary?.data?.metadata;

  return (
    <Card className={`${getCardStyle(commentaryText)} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {getTrendIcon(commentaryText)}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 leading-relaxed">
              {commentaryText || 'Market analysis updating - fresh insights coming soon.'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
              {timestamp && (
                <span>Updated {new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {metadata && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>Based on {metadata.providerCount} providers</span>
                  {metadata.rateSpread > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="font-medium text-gray-600">{metadata.rateSpread.toFixed(1)}% spread</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}