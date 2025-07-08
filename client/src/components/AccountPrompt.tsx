import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, UserPlus, Bell, TrendingUp, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AccountPromptProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AccountPrompt: React.FC<AccountPromptProps> = ({
  isVisible,
  onClose
}) => {
  const handleCreateAccount = () => {
    window.location.href = '/register';
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 z-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Get More Insights
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Create a free account to unlock personalised features and save even more on transfers.
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <Bell className="h-3 w-3 text-green-600" />
            <span>Rate alerts for your preferred currencies</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <TrendingUp className="h-3 w-3 text-blue-600" />
            <span>Personalised trend analysis</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <Star className="h-3 w-3 text-purple-600" />
            <span>Save favourite providers</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleCreateAccount}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
            size="sm"
          >
            Sign Up Free
          </Button>
          <Button
            variant="outline"
            onClick={handleLogin}
            className="flex-1 text-sm"
            size="sm"
          >
            Log In
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const useAccountPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Only show for non-authenticated users
    if (isLoading || isAuthenticated) return;

    const shouldShowPrompt = () => {
      const promptDismissed = localStorage.getItem('sabisend-account-prompt-dismissed');
      const lastShown = localStorage.getItem('sabisend-account-prompt-last-shown');
      
      // Don't show if permanently dismissed
      if (promptDismissed === 'permanent') return false;
      
      // Don't show if shown recently (within 24 hours)
      if (lastShown) {
        const lastShownTime = new Date(lastShown);
        const now = new Date();
        const hoursSinceLastShown = (now.getTime() - lastShownTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastShown < 24) return false;
      }

      const usage = localStorage.getItem('sabisend-usage');
      const userUsage = usage ? JSON.parse(usage) : { visitCount: 0 };

      // Show after user has used the app a bit (3+ visits or compared rates)
      return userUsage.visitCount >= 3 || userUsage.hasComparedRates;
    };

    // Wait 45 seconds before showing prompt
    const timer = setTimeout(() => {
      if (shouldShowPrompt()) {
        setShowPrompt(true);
        localStorage.setItem('sabisend-account-prompt-last-shown', new Date().toISOString());
      }
    }, 45000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  const closePrompt = (permanent = false) => {
    setShowPrompt(false);
    if (permanent) {
      localStorage.setItem('sabisend-account-prompt-dismissed', 'permanent');
    } else {
      localStorage.setItem('sabisend-account-prompt-dismissed', 'temporary');
    }
  };

  return {
    showPrompt,
    closePrompt
  };
};