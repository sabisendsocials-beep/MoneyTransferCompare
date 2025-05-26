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
import Trends from "@/pages/Trends";
import News from "@/pages/News";
import HowItWorks from "@/pages/HowItWorks";
import ContactUs from "@/pages/ContactUs";
import AdminPage from "@/pages/AdminPage";
import BulkRateManager from "@/pages/BulkRateManager";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NewsletterPopupContainer } from "@/components/NewsletterPopupContainer";
import { ThemeProvider } from "@/components/ThemeProvider";
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
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
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
          <Route path="/bulk-rates" component={BulkRateManager} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <NewsletterPopupContainer />
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
    <ThemeProvider defaultTheme="light" storageKey="transfercompare-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
