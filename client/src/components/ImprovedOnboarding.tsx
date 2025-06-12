import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OnboardingStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

const publicSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to SabiSend',
    content: 'Compare real-time rates from 15+ money transfer providers across major corridors like GBP-NGN, USD-GHS, EUR-KES to find the best deals.',
    position: 'bottom',
    action: 'Let\'s explore the key features'
  },
  {
    id: 'currency-calculator',
    target: '[data-testid="currency-calculator"]',
    title: 'Currency Calculator',
    content: 'Enter your amount and select currencies to see live exchange rates. This calculator shows you exactly how much you\'ll receive.',
    position: 'bottom',
    action: 'Try changing the amount or currencies'
  },
  {
    id: 'compare-rates',
    target: '.compare-button',
    title: 'Compare All Providers',
    content: 'Click here to see detailed rates from all 15+ providers. Compare fees, exchange rates, and transfer speeds side by side.',
    position: 'top',
    action: 'Click to see all provider comparisons'
  },
  {
    id: 'explore-features',
    target: '[data-testid="features-section"]',
    title: 'Explore More Features',
    content: 'Scroll down to discover rate alerts, trend analysis, and AI-powered insights to help you time your transfers perfectly.',
    position: 'top',
    action: 'Scroll down to see more features'
  }
];

const authenticatedSteps: OnboardingStep[] = [
  {
    id: 'dashboard-welcome',
    target: '.personalized-dashboard',
    title: 'Your Personal Dashboard',
    content: 'Welcome to your customized hub! Here you can track your preferred providers, set rate alerts, and analyze performance for your chosen currency pairs.',
    position: 'bottom',
    action: 'Explore your personalized features'
  },
  {
    id: 'preferred-providers',
    target: '.preferred-providers-section',
    title: 'Your Preferred Providers',
    content: 'These are your favorite providers based on your selections. See how they perform against the market best rates.',
    position: 'bottom',
    action: 'Review your provider performance'
  },
  {
    id: 'quick-compare',
    target: '.compare-all-button',
    title: 'Quick Provider Comparison',
    content: 'Instantly compare all 15+ providers to see if you can get better rates than your preferred ones.',
    position: 'top',
    action: 'Click to compare all options'
  },
  {
    id: 'rate-alerts',
    target: '[data-testid="rate-alerts-tab"]',
    title: 'Set Rate Alerts',
    content: 'Get email notifications when rates hit your target. Perfect for timing your transfers when rates are favorable.',
    position: 'bottom',
    action: 'Click Rate Alerts tab to set up notifications'
  }
];

interface ImprovedOnboardingProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  isAuthenticated?: boolean;
}

export const ImprovedOnboarding: React.FC<ImprovedOnboardingProps> = ({
  isVisible,
  onComplete,
  onSkip,
  isAuthenticated = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  
  const steps = isAuthenticated ? authenticatedSteps : publicSteps;
  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (!isVisible || !currentStepData) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStepData.target);
      if (!targetElement) {
        console.warn(`Onboarding target not found: ${currentStepData.target}`);
        // Use fallback position for center screen
        setTooltipPosition({ 
          top: window.innerHeight / 2 - 100, 
          left: window.innerWidth / 2 - 160 
        });
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const tooltipWidth = 320;
      const tooltipHeight = 220;

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

      // Keep tooltip within viewport with better boundaries
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (left < 20) left = 20;
      if (left + tooltipWidth > viewportWidth - 20) left = viewportWidth - tooltipWidth - 20;
      if (top < 20) top = 20;
      if (top + tooltipHeight > scrollTop + viewportHeight - 20) {
        top = scrollTop + viewportHeight - tooltipHeight - 20;
      }

      setTooltipPosition({ top, left });

      // Scroll element into view smoothly
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });

      // Add highlight with delay
      setTimeout(() => {
        targetElement.classList.add('onboarding-highlight');
      }, 600);
    };

    // Clean up previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    const timer = setTimeout(updatePosition, 300);
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [currentStep, isVisible, currentStepData]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
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
          left: tooltipPosition.left
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
              {steps.map((_, index) => (
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
                {currentStep === steps.length - 1 ? (
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
              <span>Step {currentStep + 1} of {steps.length}</span>
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
export const useImprovedOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('sabisend-onboarding-completed');
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
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