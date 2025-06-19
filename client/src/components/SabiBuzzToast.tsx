import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SabiBuzzToastProps {
  fromCurrency?: string;
  toCurrency?: string;
  className?: string;
}

interface CommentaryResponse {
  success: boolean;
  data: {
    currencyPair: string;
    commentary: string;
    timestamp: string;
  };
}

export function SabiBuzzToast({ fromCurrency = "GBP", toCurrency = "NGN", className = "" }: SabiBuzzToastProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user previously dismissed this toast
  useEffect(() => {
    const dismissed = localStorage.getItem('sabiBuzzToastDismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // Re-show toast after 24 hours
      if (now.getTime() - dismissedDate.getTime() < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }
  }, []);

  const { data: commentary, isLoading } = useQuery<CommentaryResponse>({
    queryKey: [`/api/commentary/${fromCurrency}/${toCurrency}`],
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    refetchOnWindowFocus: false,
    enabled: !isDismissed,
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('sabiBuzzToastDismissed', new Date().toISOString());
  };

  if (isDismissed || isLoading) {
    return null;
  }

  if (!commentary?.success || !commentary.data) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4 ${className}`}>
      <Alert className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-purple-200 shadow-lg">
        <div className="flex items-start space-x-3">
          <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-semibold text-purple-900">Sabi Buzz</span>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                {commentary.data.currencyPair}
              </span>
            </div>
            <AlertDescription className="text-sm text-purple-800 leading-relaxed pr-8">
              {commentary.data.commentary}
            </AlertDescription>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-purple-400 hover:text-purple-600 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Alert>
    </div>
  );
}

export default SabiBuzzToast;