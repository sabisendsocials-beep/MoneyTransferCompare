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
  
  const steps = isAuthenticated ? authenticatedSteps : publicSteps;
  const currentStepData = steps[currentStep];

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
    setCurrentStep(0);
    onSkip();
  };

  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      skipTour();
    }
  };

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isVisible]);

  if (!isVisible || !currentStepData) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[99999]"
      onClick={skipTour}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)'
      }}
    >
      <Card 
        className="w-full max-w-sm md:max-w-md mx-auto shadow-2xl border-2 border-blue-500 bg-white dark:bg-gray-800 animate-in fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-4 md:p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white pr-2">
              {currentStepData.title}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
              title="Close tour (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {currentStepData.content}
          </p>
          
          {currentStepData.action && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs md:text-sm text-blue-700 dark:text-blue-300">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                <span className="font-medium">Try it:</span>
              </div>
              <span className="ml-4">{currentStepData.action}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
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
                  className="h-8 px-2 md:px-3 text-xs md:text-sm"
                >
                  <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Back
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={nextStep}
                className="h-8 px-2 md:px-3 bg-blue-600 hover:bg-blue-700 text-xs md:text-sm"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Check className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 dark:text-gray-400 gap-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <div className="flex items-center space-x-3">
                <span className="text-gray-400 hidden md:inline">Press Esc to exit</span>
                <button
                  onClick={skipTour}
                  className="hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Skip tour
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const useImprovedOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Force trigger for testing - remove localStorage check temporarily
    const timer = setTimeout(() => {
      console.log('Auto-starting onboarding tour');
      setShowOnboarding(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleStartOnboarding = () => {
      console.log('Manual onboarding triggered');
      setShowOnboarding(true);
    };

    window.addEventListener('start-onboarding', handleStartOnboarding);
    return () => {
      window.removeEventListener('start-onboarding', handleStartOnboarding);
    };
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