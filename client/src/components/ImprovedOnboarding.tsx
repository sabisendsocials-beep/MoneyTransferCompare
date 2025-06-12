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
  const [tooltipPosition, setTooltipPosition] = useState({ top: '50%', left: '50%' });
  
  const steps = publicSteps;
  const currentStepData = steps[currentStep];

  // Function to highlight and position tooltip near target element
  const highlightElement = () => {
    // Remove previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    if (!currentStepData) return;

    const targetElement = document.querySelector(currentStepData.target);
    if (!targetElement) {
      console.warn(`Onboarding target not found: ${currentStepData.target}`);
      setTooltipPosition({ top: '50%', left: '50%' });
      return;
    }

    // Add highlight to target element
    targetElement.classList.add('onboarding-highlight');
    
    // Scroll element into view
    targetElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'center'
    });

    // Calculate tooltip position relative to target
    setTimeout(() => {
      const rect = targetElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = '50%';
      let left = '50%';
      
      // Position tooltip based on target location and step position preference
      switch (currentStepData.position) {
        case 'bottom':
          top = `${Math.min(rect.bottom + 20, viewportHeight - 300)}px`;
          left = `${Math.max(20, Math.min(rect.left + rect.width / 2 - 160, viewportWidth - 340))}px`;
          break;
        case 'top':
          top = `${Math.max(20, rect.top - 280)}px`;
          left = `${Math.max(20, Math.min(rect.left + rect.width / 2 - 160, viewportWidth - 340))}px`;
          break;
        case 'right':
          top = `${Math.max(20, Math.min(rect.top + rect.height / 2 - 140, viewportHeight - 300))}px`;
          left = `${Math.min(rect.right + 20, viewportWidth - 340)}px`;
          break;
        case 'left':
          top = `${Math.max(20, Math.min(rect.top + rect.height / 2 - 140, viewportHeight - 300))}px`;
          left = `${Math.max(20, rect.left - 340)}px`;
          break;
        default:
          // Center position
          top = '50%';
          left = '50%';
      }
      
      setTooltipPosition({ top, left });
    }, 500);
  };

  // Highlight element when step changes
  useEffect(() => {
    if (isVisible && currentStepData) {
      highlightElement();
    }
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
    // Clean up highlights when exiting
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
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

  const isCenter = tooltipPosition.top === '50%' && tooltipPosition.left === '50%';

  return (
    <>
      {/* Dark overlay with cutout effect for highlighted element */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99998]"
        onClick={skipTour}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99998,
          backgroundColor: 'rgba(0, 0, 0, 0.6)'
        }}
      />

      {/* Tooltip positioned near highlighted element */}
      <Card 
        className="fixed w-full max-w-sm md:max-w-md shadow-2xl border-2 border-blue-500 bg-white dark:bg-gray-800 animate-in fade-in duration-300 z-[99999]"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: isCenter ? 'translate(-50%, -50%)' : 'none',
          zIndex: 99999,
          margin: isCenter ? '0' : '16px'
        }}
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
    </>
  );
};

export const useImprovedOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Tour disabled - moving to personalized wizard
    const hasSeenOnboarding = localStorage.getItem('sabisend-onboarding-completed');
    if (!hasSeenOnboarding) {
      // Don't auto-start for now
      console.log('Tour paused - personalized wizard coming soon');
    }
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