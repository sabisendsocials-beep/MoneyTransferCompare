import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import ComparisonResults from "@/components/ComparisonResults";
import RateTrends from "@/components/RateTrends";
import NewsSection from "@/components/NewsSection";
import FeatureSection from "@/components/FeatureSection";
import { TransferResult } from "@shared/schema";

const Home = () => {
  const [comparisonResults, setComparisonResults] = useState<TransferResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleComparisonResults = (results: TransferResult[]) => {
    setComparisonResults(results);
    setShowResults(true);
  };

  return (
    <div className="min-h-screen">
      {/* New improved Hero Section with integrated calculator */}
      <HeroSection />
      
      {/* Keep comparison results for when redirected from calculator */}
      <ComparisonResults results={comparisonResults} visible={showResults} />
      
      {/* Other sections remain unchanged */}
      <RateTrends />
      <NewsSection />
      <FeatureSection />
    </div>
  );
};

export default Home;
