import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TooltipStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

const onboardingSteps: TooltipStep[] = [
  {
    id: 'welcome',
    target: '.currency-selector',
    title: 'Welcome to SabiSend!',
    content: 'Start by selecting your currencies and amount. We support 15 major currency corridors.',
    position: 'bottom',
    action: 'Select currencies'
  },
  {
    id: 'compare',
    target: '.compare-button',
    title: 'Compare Providers',
    content: 'Click here to see real-time rates from 15+ money transfer providers and find the best deal.',
    position: 'top',
    action: 'Compare rates'
  },
  {
    id: 'alerts',
    target: '.rate-alert-section',
    title: 'Set Rate Alerts',
    content: 'Get notified via email when exchange rates reach your target. Never miss a good rate again!',
    position: 'left',
    action: 'Create alert'
  },
  {
    id: 'trends',
    target: '.chart-container',
    title: 'Track Rate Trends',
    content: 'View historical rate data and trends to make informed decisions about when to transfer money.',
    position: 'top',
    action: 'View trends'
  },
  {
    id: 'dashboard',
    target: '.personalized-dashboard',
    title: 'Your Personalized Dashboard',
    content: 'Access your rate alerts, transfer history, and personalized insights all in one place.',
    position: 'bottom',
    action: 'Explore dashboard'
  }
];

interface OnboardingTooltipProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  isVisible,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const currentStepData = onboardingSteps[currentStep];

  useEffect(() => {
    if (!isVisible || !currentStepData) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStepData.target);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        let top = 0;
        let left = 0;

        switch (currentStepData.position) {
          case 'top':
            top = rect.top + scrollTop - 100;
            left = rect.left + scrollLeft + rect.width / 2 - 150;
            break;
          case 'bottom':
            top = rect.bottom + scrollTop + 10;
            left = rect.left + scrollLeft + rect.width / 2 - 150;
            break;
          case 'left':
            top = rect.top + scrollTop + rect.height / 2 - 75;
            left = rect.left + scrollLeft - 310;
            break;
          case 'right':
            top = rect.top + scrollTop + rect.height / 2 - 75;
            left = rect.right + scrollLeft + 10;
            break;
        }

        setTooltipPosition({ top, left });

        // Add highlight to target element
        targetElement.classList.add('onboarding-highlight');
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      // Remove highlight from all elements
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
      });
    };
  }, [currentStep, isVisible, currentStepData]);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
    onSkip();
  };

  if (!isVisible || !currentStepData) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
      
      {/* Tooltip */}
      <Card 
        className="fixed z-50 w-80 shadow-xl border-2 border-blue-200"
        style={{ 
          top: tooltipPosition.top, 
          left: Math.max(10, Math.min(tooltipPosition.left, window.innerWidth - 330))
        }}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStepData.title}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {currentStepData.content}
          </p>
          
          {currentStepData.action && (
            <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
              💡 Try it: {currentStepData.action}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep 
                      ? 'bg-blue-600' 
                      : index < currentStep 
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  className="h-8 px-3"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={nextStep}
                className="h-8 px-3"
              >
                {currentStep === onboardingSteps.length - 1 ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Step {currentStep + 1} of {onboardingSteps.length}</span>
              <button
                onClick={skipTour}
                className="hover:text-gray-700 dark:hover:text-gray-300"
              >
                Skip tour
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Hook to manage onboarding state
export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('sabisend-onboarding-completed');
    if (!hasSeenOnboarding) {
      // Delay showing onboarding to allow page to load
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('sabisend-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('sabisend-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    startOnboarding
  };
};