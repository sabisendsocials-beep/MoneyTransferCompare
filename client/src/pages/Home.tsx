import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import TransferCalculator from "@/components/TransferCalculator";
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
    <>
      <HeroSection />
      <TransferCalculator onCompare={handleComparisonResults} />
      <ComparisonResults results={comparisonResults} visible={showResults} />
      <RateTrends />
      <NewsSection />
      <FeatureSection />
    </>
  );
};

export default Home;
