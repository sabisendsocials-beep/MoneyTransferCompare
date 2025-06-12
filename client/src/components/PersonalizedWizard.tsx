import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Bell, 
  Calculator, 
  BarChart3, 
  Users, 
  Star,
  ArrowRight,
  CheckCircle,
  Lightbulb,
  X
} from 'lucide-react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  condition: (user: any, usage: UserUsage) => boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'setup' | 'features' | 'optimization';
  action: {
    type: 'navigate' | 'modal' | 'highlight' | 'interaction';
    target?: string;
    data?: any;
  };
}

interface UserUsage {
  hasComparedRates: boolean;
  hasSetAlerts: boolean;
  hasUsedTrends: boolean;
  preferredCurrencies: string[];
  visitCount: number;
  lastLogin: Date | null;
}

const wizardSteps: WizardStep[] = [
  {
    id: 'currency-setup',
    title: 'Set Your Primary Currency Pair',
    description: 'Get personalized rates for the currencies you use most',
    icon: Calculator,
    condition: (user, usage) => user && (!user.preferences?.preferredCurrencyPair),
    priority: 'high',
    category: 'setup',
    action: { type: 'navigate', target: '/profile' }
  },
  {
    id: 'rate-alerts',
    title: 'Never Miss Great Rates',
    description: 'Set up email alerts when your preferred rates hit target levels',
    icon: Bell,
    condition: (user, usage) => user && !usage.hasSetAlerts && user.preferences?.preferredCurrencyPair,
    priority: 'high',
    category: 'features',
    action: { type: 'highlight', target: '[data-testid="rate-alerts-tab"]' }
  },
  {
    id: 'compare-providers',
    title: 'Find the Best Deals',
    description: 'Compare all 15+ providers to save money on every transfer',
    icon: BarChart3,
    condition: (user, usage) => !usage.hasComparedRates,
    priority: 'medium',
    category: 'features',
    action: { type: 'highlight', target: '.compare-button' }
  },
  {
    id: 'trend-analysis',
    title: 'Time Your Transfers',
    description: 'Use historical data to transfer when rates are most favorable',
    icon: TrendingUp,
    condition: (user, usage) => !usage.hasUsedTrends && usage.hasComparedRates,
    priority: 'medium',
    category: 'optimization',
    action: { type: 'highlight', target: '.rate-trends-chart' }
  },
  {
    id: 'provider-preferences',
    title: 'Choose Your Favorites',
    description: 'Select preferred providers for faster comparisons',
    icon: Star,
    condition: (user, usage) => user && usage.hasComparedRates && (!user.preferences?.preferredProviders?.length),
    priority: 'low',
    category: 'optimization',
    action: { type: 'navigate', target: '/profile' }
  }
];

interface PersonalizedWizardProps {
  isVisible: boolean;
  onClose: () => void;
}

export const PersonalizedWizard: React.FC<PersonalizedWizardProps> = ({
  isVisible,
  onClose
}) => {
  const { user } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [userUsage, setUserUsage] = useState<UserUsage>({
    hasComparedRates: false,
    hasSetAlerts: false,
    hasUsedTrends: false,
    preferredCurrencies: [],
    visitCount: 0,
    lastLogin: null
  });

  // Analyze user usage patterns
  useEffect(() => {
    if (user) {
      const usage = analyzeUserUsage(user);
      setUserUsage(usage);
    }
  }, [user]);

  const analyzeUserUsage = (user: any): UserUsage => {
    // Get usage data from localStorage or API
    const stored = localStorage.getItem('sabisend-usage');
    const baseUsage = stored ? JSON.parse(stored) : {
      hasComparedRates: false,
      hasSetAlerts: false,
      hasUsedTrends: false,
      preferredCurrencies: [],
      visitCount: 0,
      lastLogin: null
    };

    return {
      ...baseUsage,
      preferredCurrencies: user.preferences?.preferredCurrencyPair ? 
        [user.preferences.preferredCurrencyPair] : [],
      visitCount: baseUsage.visitCount + 1,
      lastLogin: new Date()
    };
  };

  // Get relevant steps for current user
  const relevantSteps = wizardSteps.filter(step => 
    step.condition(user, userUsage) && !completedSteps.includes(step.id)
  ).sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const currentStep = relevantSteps[currentStepIndex];
  const progress = relevantSteps.length > 0 ? ((currentStepIndex + 1) / relevantSteps.length) * 100 : 100;

  const handleStepAction = (step: WizardStep) => {
    switch (step.action.type) {
      case 'navigate':
        if (step.action.target) {
          window.location.href = step.action.target;
        }
        break;
      case 'highlight':
        if (step.action.target) {
          const element = document.querySelector(step.action.target);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('wizard-highlight');
            setTimeout(() => element.classList.remove('wizard-highlight'), 3000);
          }
        }
        break;
      case 'modal':
        // Handle modal opening
        break;
      case 'interaction':
        // Handle direct interaction
        break;
    }
    
    markStepCompleted(step.id);
  };

  const markStepCompleted = (stepId: string) => {
    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    
    // Update localStorage
    const currentUsage = { ...userUsage };
    switch (stepId) {
      case 'compare-providers':
        currentUsage.hasComparedRates = true;
        break;
      case 'rate-alerts':
        currentUsage.hasSetAlerts = true;
        break;
      case 'trend-analysis':
        currentUsage.hasUsedTrends = true;
        break;
    }
    localStorage.setItem('sabisend-usage', JSON.stringify(currentUsage));
    
    // Move to next step
    if (currentStepIndex < relevantSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // All steps completed
      setTimeout(onClose, 1000);
    }
  };

  const skipStep = () => {
    if (currentStepIndex < relevantSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  if (!isVisible || !currentStep) return null;

  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-blue-500 bg-white dark:bg-gray-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-lg">Smart Discovery</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="w-full h-2" />
          <p className="text-sm text-gray-500">
            Step {currentStepIndex + 1} of {relevantSteps.length}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {currentStep.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {currentStep.description}
              </p>
              
              <div className="flex items-center space-x-2 mb-3">
                <Badge 
                  variant={currentStep.priority === 'high' ? 'destructive' : 
                          currentStep.priority === 'medium' ? 'default' : 'secondary'}
                >
                  {currentStep.priority} priority
                </Badge>
                <Badge variant="outline">
                  {currentStep.category}
                </Badge>
              </div>
            </div>
          </div>

          {user && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Personalized for you:
              </p>
              <p className="text-sm">
                {user.preferences?.preferredCurrencyPair ? 
                  `Based on your ${user.preferences.preferredCurrencyPair} preference` :
                  'Complete setup for personalized recommendations'
                }
              </p>
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={skipStep}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={() => handleStepAction(currentStep)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const usePersonalizedWizard = () => {
  const [showWizard, setShowWizard] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Smart trigger logic
    const shouldShowWizard = () => {
      const wizardDismissed = localStorage.getItem('sabisend-wizard-dismissed');
      if (wizardDismissed) return false;

      const usage = localStorage.getItem('sabisend-usage');
      const userUsage = usage ? JSON.parse(usage) : { visitCount: 0 };

      // Show wizard for new users or those who haven't completed key actions
      return userUsage.visitCount <= 3 || (!userUsage.hasComparedRates && !userUsage.hasSetAlerts);
    };

    const timer = setTimeout(() => {
      if (shouldShowWizard()) {
        setShowWizard(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user]);

  const closeWizard = () => {
    setShowWizard(false);
    localStorage.setItem('sabisend-wizard-dismissed', 'true');
  };

  const startWizard = () => {
    setShowWizard(true);
  };

  return {
    showWizard,
    closeWizard,
    startWizard
  };
};