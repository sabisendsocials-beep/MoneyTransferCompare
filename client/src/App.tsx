import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Compare from "@/pages/Compare";
import Results from "@/pages/Results";
import HorizontalResults from "@/pages/HorizontalResults";
import CleanResults from "@/pages/CleanResults";
import Trends from "@/pages/Trends";
import News from "@/pages/News";
import HowItWorks from "@/pages/HowItWorks";
import ContactUs from "@/pages/ContactUs";
import AdminPage from "@/pages/AdminPage";
import BulkRateManager from "@/pages/BulkRateManager";
import TransferCorridorPage from "@/pages/TransferCorridorPage";
import CountryPage from "@/pages/CountryPage";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import BlogAdmin from "@/pages/BlogAdmin";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CommentarySchedulerPanel from "@/pages/CommentarySchedulerPanel";
import EnhancedTrendsTest from "@/pages/EnhancedTrendsTest";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NewsletterPopupContainer } from "@/components/NewsletterPopupContainer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ImprovedOnboarding, useImprovedOnboarding } from "@/components/ImprovedOnboarding";
import { PersonalizedWizard, usePersonalizedWizard } from "@/components/PersonalizedWizard";
import { AccountPrompt, useAccountPrompt } from "@/components/AccountPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect, useRef } from "react";
import { initGA, trackPageView } from "./lib/analytics";

// Analytics hook to track page views
function useAnalytics() {
  const [location] = useLocation();
  const prevLocationRef = useRef(location);
  
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      trackPageView(location);
      prevLocationRef.current = location;
    }
  }, [location]);
}

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  const { showOnboarding, completeOnboarding, skipOnboarding } = useImprovedOnboarding();
  const { showWizard, closeWizard, startWizard } = usePersonalizedWizard();
  const { showPrompt, closePrompt } = useAccountPrompt();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header onStartWizard={startWizard} />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/compare" component={Compare} />
          <Route path="/results" component={HorizontalResults} />
          <Route path="/trends" component={Trends} />
          <Route path="/news" component={News} />

          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/contact" component={ContactUs} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/commentary-scheduler" component={CommentarySchedulerPanel} />
          
          {/* Test Pages */}
          <Route path="/enhanced-trends-test" component={EnhancedTrendsTest} />
          <Route path="/bulk-rates" component={BulkRateManager} />
          
          {/* Blog Routes */}
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/blog-admin" component={BlogAdmin} />
          
          {/* Authentication */}
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          
          {/* User Profile */}
          <Route path="/profile" component={Profile} />
          
          {/* SEO Landing Pages - Country Pages */}
          <Route path="/send-money-to-nigeria" component={CountryPage} />
          <Route path="/send-money-to-ghana" component={CountryPage} />
          <Route path="/send-money-to-kenya" component={CountryPage} />
          <Route path="/send-money-to-india" component={CountryPage} />
          <Route path="/send-money-to-pakistan" component={CountryPage} />
          
          {/* SEO Landing Pages - All Currency Corridors */}
          {/* GBP Corridors */}
          <Route path="/gbp-to-ngn" component={TransferCorridorPage} />
          <Route path="/gbp-to-ghs" component={TransferCorridorPage} />
          <Route path="/gbp-to-kes" component={TransferCorridorPage} />
          <Route path="/gbp-to-inr" component={TransferCorridorPage} />
          <Route path="/gbp-to-pkr" component={TransferCorridorPage} />
          
          {/* EUR Corridors */}
          <Route path="/eur-to-ngn" component={TransferCorridorPage} />
          <Route path="/eur-to-ghs" component={TransferCorridorPage} />
          <Route path="/eur-to-kes" component={TransferCorridorPage} />
          <Route path="/eur-to-inr" component={TransferCorridorPage} />
          <Route path="/eur-to-pkr" component={TransferCorridorPage} />
          
          {/* USD Corridors */}
          <Route path="/usd-to-ngn" component={TransferCorridorPage} />
          <Route path="/usd-to-ghs" component={TransferCorridorPage} />
          <Route path="/usd-to-kes" component={TransferCorridorPage} />
          <Route path="/usd-to-inr" component={TransferCorridorPage} />
          <Route path="/usd-to-pkr" component={TransferCorridorPage} />

          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <NewsletterPopupContainer />
      <ImprovedOnboarding 
        isVisible={showOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
        isAuthenticated={false}
      />
      
      <PersonalizedWizard 
        isVisible={showWizard}
        onClose={closeWizard}
      />

      <AccountPrompt 
        isVisible={showPrompt}
        onClose={closePrompt}
      />
      

    </div>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Google Analytics is already initialized via the HTML script tag
    // This is just for debugging and to ensure compatibility with our tracking functions
    console.log('Google Analytics verification - Tag ID: G-53RE6BJB46');
    
    // Check if gtag is available (should be from the HTML script)
    if (typeof window !== 'undefined' && typeof window.gtag !== 'function') {
      console.warn('Warning: Google Analytics gtag function not found');
    } else {
      console.log('Google Analytics successfully detected');
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="sabisend-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
