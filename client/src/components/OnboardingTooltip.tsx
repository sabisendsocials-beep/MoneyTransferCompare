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

const getOnboardingSteps = (isAuthenticated: boolean): TooltipStep[] => {
  const publicSteps = [
    {
      id: 'currency-selection',
      target: '.currency-selector',
      title: 'Select Your Currency Pair',
      content: 'Choose from 15 major corridors like GBP-NGN, USD-GHS, EUR-KES. This determines which providers and rates you\'ll see.',
      position: 'bottom' as const,
      action: 'Try changing currency pairs'
    },
    {
      id: 'compare-rates',
      target: '.compare-button',
      title: 'Compare All Providers',
      content: 'See real-time rates from 15+ providers. Compare fees, exchange rates, and transfer speeds to find the best deal.',
      position: 'top' as const,
      action: 'Click to see all provider rates'
    },
    {
      id: 'rate-alerts',
      target: '.rate-alert-section',
      title: 'Set Rate Alerts',
      content: 'Get email notifications when rates hit your target. Choose between official bank rates or best provider rates.',
      position: 'left' as const,
      action: 'Create your first rate alert'
    },
    {
      id: 'rate-trends',
      target: '.chart-container',
      title: 'Analyze Rate Trends',
      content: 'View historical performance to time your transfers perfectly. See how rates fluctuate over different periods.',
      position: 'top' as const,
      action: 'Try different time periods'
    }
  ];

  const authenticatedSteps = [
    {
      id: 'dashboard-overview',
      target: '.personalized-dashboard',
      title: 'Your Personal Dashboard',
      content: 'Your customised hub shows preferred providers, active alerts, and rate performance for your chosen currency pairs.',
      position: 'bottom' as const,
      action: 'Explore your dashboard sections'
    },
    {
      id: 'preferred-providers',
      target: '.preferred-providers-section',
      title: 'Your Preferred Providers',
      content: 'These are your selected favorite providers. Compare their rates against the market best to see your potential savings.',
      position: 'left' as const,
      action: 'Review your provider performance'
    },
    {
      id: 'provider-comparison',
      target: '.compare-all-button',
      title: 'Compare All Providers',
      content: 'See how your preferred providers stack up against all 15+ available options. Find better deals instantly.',
      position: 'top' as const,
      action: 'Compare all providers'
    },
    {
      id: 'currency-preferences',
      target: '.currency-pair-selector',
      title: 'Change Currency Pairs',
      content: 'Switch between different currency corridors to see rates for various transfer destinations.',
      position: 'bottom' as const,
      action: 'Try different currency pairs'
    },
    {
      id: 'rate-insights',
      target: '.rate-performance-section',
      title: 'Rate Performance Insights',
      content: 'See daily rate changes, best vs preferred provider comparison, and historical performance data.',
      position: 'right' as const,
      action: 'Explore rate insights'
    }
  ];

  return isAuthenticated ? authenticatedSteps : publicSteps;
};

interface OnboardingTooltipProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  isAuthenticated?: boolean;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  isVisible,
  onComplete,
  onSkip,
  isAuthenticated = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  
  const onboardingSteps = getOnboardingSteps(isAuthenticated);
  const currentStepData = onboardingSteps[currentStep];

  useEffect(() => {
    if (!isVisible || !currentStepData) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStepData.target);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const tooltipWidth = 320;
        const tooltipHeight = 200;

        let top = 0;
        let left = 0;

        switch (currentStepData.position) {
          case 'top':
            top = rect.top + scrollTop - tooltipHeight - 20;
            left = rect.left + scrollLeft + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'bottom':
            top = rect.bottom + scrollTop + 20;
            left = rect.left + scrollLeft + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = rect.top + scrollTop + rect.height / 2 - tooltipHeight / 2;
            left = rect.left + scrollLeft - tooltipWidth - 20;
            break;
          case 'right':
            top = rect.top + scrollTop + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + scrollLeft + 20;
            break;
        }

        // Ensure tooltip stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (left < 10) left = 10;
        if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
        if (top < 10) top = 10;
        if (top + tooltipHeight > scrollTop + viewportHeight - 10) {
          top = scrollTop + viewportHeight - tooltipHeight - 10;
        }

        setTooltipPosition({ top, left });

        // Scroll element into view if needed
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });

        // Add highlight to target element
        setTimeout(() => {
          targetElement.classList.add('onboarding-highlight');
        }, 300);
      }
    };

    // Delay initial positioning to allow for page load
    const timer = setTimeout(updatePosition, 500);
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
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