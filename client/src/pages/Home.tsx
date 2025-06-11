import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import HeroSection from "@/components/HeroSection";
import ComparisonResults from "@/components/ComparisonResults";
import RateAlertModule from "@/components/RateAlertModule";
import RateTrends from "@/components/RateTrends";
import NewsSection from "@/components/NewsSection";
import FeatureSection from "@/components/FeatureSection";
import FeatureCards from "@/components/FeatureCards";
import CountryNavigationSection from "@/components/CountryNavigationSection";
import { PersonalizedHome } from "@/components/PersonalizedHome";
import { TransferResult } from "@shared/schema";
import { SEO, createFinancialServiceSchema, createWebsiteSchema } from "@/components/SEO";

const Home = () => {
  const [comparisonResults, setComparisonResults] = useState<TransferResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Check authentication status
  const { data: authStatus } = useQuery({
    queryKey: ['/api/auth/status'],
    retry: false,
  });

  // Get fresh user data for personalized experience
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user-fresh'],
    enabled: !!(authStatus as any)?.user,
    retry: false,
  });

  const handleComparisonResults = (results: TransferResult[]) => {
    setComparisonResults(results);
    setShowResults(true);
  };

  // SEO structured data
  const financialServiceSchema = createFinancialServiceSchema();
  const websiteSchema = createWebsiteSchema();
  
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [financialServiceSchema, websiteSchema]
  };

  // Show personalized dashboard for authenticated users
  if ((authStatus as any)?.user && userData) {
    return (
      <div className="min-h-screen">
        <SEO
          title="SabiSend Dashboard - Your Personal Exchange Rate Hub"
          description="Your personalized money transfer dashboard with preferred providers, rate alerts, and real-time exchange rates."
          keywords="personal dashboard, exchange rates, money transfer, rate alerts"
          canonicalUrl="https://sabisend.com"
          structuredData={structuredData}
        />
        <div className="container mx-auto px-4 py-6">
          <PersonalizedHome user={userData as any} />
        </div>
      </div>
    );
  }

  // Show public home page for non-authenticated users
  return (
    <div className="min-h-screen">
      <SEO
        title="SabiSend - Compare Best Money Transfer Rates to Nigeria & Ghana | Save Money on Remittances"
        description="Compare live exchange rates from 15+ money transfer providers. Send money to Nigeria and Ghana with the best rates. Save up to £50 per transfer with SabiSend."
        keywords="money transfer, send money to Nigeria, GBP to NGN, remittance rates, transfer money Ghana, best exchange rates, international money transfer, UK to Nigeria, UK to Ghana"
        canonicalUrl="https://sabisend.com"
        structuredData={structuredData}
      />
      {/* New improved Hero Section with integrated calculator */}
      <HeroSection />
      
      {/* Keep comparison results for when redirected from calculator */}
      <ComparisonResults results={comparisonResults} visible={showResults} />

      {/* Rate Alert Module - positioned between calculator and exchange rates */}
      <RateAlertModule />

      {/* Other sections remain unchanged */}
      <RateTrends />
      
      {/* Feature Cards - positioned just before News section */}
      <FeatureCards />
      
      <NewsSection />
      <CountryNavigationSection />
      <FeatureSection />
    </div>
  );
};

export default Home;
