import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp } from "lucide-react";
import CurrencyCalculator from "@/components/CurrencyCalculator";
import TopRatesCard from "@/components/TopRatesCard";
import ComparisonResults from "@/components/ComparisonResults";
import RateAlertModule from "@/components/RateAlertModule";
import RateTrends from "@/components/RateTrends";
import EnhancedRateTrends from "@/components/EnhancedRateTrends";
import NewsSection from "@/components/NewsSection";
import FeatureSection from "@/components/FeatureSection";
import FeatureCards from "@/components/FeatureCards";
import CountryNavigationSection from "@/components/CountryNavigationSection";
import { MarketCommentary } from "@/components/MarketCommentary";
import SabiBuzzToast from "@/components/SabiBuzzToast";
import AccountCreationBanner from "@/components/AccountCreationBanner";
import { TransferResult } from "@shared/schema";

const HomepageDraft = () => {
  const [, setLocation] = useLocation();
  const [comparisonResults, setComparisonResults] = useState<TransferResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [calculatorValues, setCalculatorValues] = useState({
    amount: "100",
    fromCurrency: "GBP",
    toCurrency: "NGN",
    calculationMode: "send"
  });

  const handleCalculatorChange = (values: { amount: string; fromCurrency: string; toCurrency: string; calculationMode?: string }) => {
    setCalculatorValues({
      amount: values.amount,
      fromCurrency: values.fromCurrency,
      toCurrency: values.toCurrency,
      calculationMode: values.calculationMode || "send"
    });
  };

  const handleGetBestRate = () => {
    const params = new URLSearchParams({
      amount: calculatorValues.amount.replace(/,/g, ''),
      fromCurrency: calculatorValues.fromCurrency,
      toCurrency: calculatorValues.toCurrency,
      calculationMode: calculatorValues.calculationMode
    });
    setLocation(`/results?${params.toString()}`);
  };

  const handleComparisonResults = (results: TransferResult[]) => {
    setComparisonResults(results);
    setShowResults(true);
  };

  return (
    <div className="min-h-screen">
      <div className="bg-yellow-50 border-b border-yellow-200 py-2">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
            DRAFT PREVIEW
          </Badge>
          <span className="ml-2 text-sm text-gray-600">
            Proposed homepage redesign for review
          </span>
        </div>
      </div>

      <AccountCreationBanner />
      <SabiBuzzToast fromCurrency="GBP" toCurrency="NGN" />

      <section className="relative bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-800 py-4">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30" 
            style={{
              backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.15) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.15) 2%, transparent 0%)",
              backgroundSize: "100px 100px"
            }}>
          </div>
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-emerald-500/10 filter blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 filter blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-8">
            <div className="lg:w-1/2 mb-4 lg:mb-0">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2">
                Find the <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">best rates</span> for sending money globally
              </h1>
              
              <p className="text-base md:text-lg text-blue-100 mb-4">
                SabiSend compares exchange rates from trusted providers in real time so you don't have to, 
                helping you save on fees and get best value in every international transfer.
              </p>
              
              <div className="hidden lg:flex space-x-3">
                <Link href="/compare">
                  <Button size="default" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 text-white font-medium shadow-lg">
                    Compare All Providers
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
                <Link href="/trends">
                  <Button size="default" variant="outline" className="border-2 border-white/30 text-white bg-white/5 hover:bg-white/10">
                    View Rate Trends
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="lg:w-1/2">
              <TopRatesCard 
                className="shadow-xl bg-white border-gray-200" 
                defaultFrom={calculatorValues.fromCurrency} 
                defaultTo={calculatorValues.toCurrency}
                showShareButton={true}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-white p-4 md:p-6 rounded-xl border shadow-lg">
              <h2 className="text-lg font-semibold mb-3 text-center text-gray-900">Quick Calculator</h2>
              
              <div data-testid="currency-calculator">
                <CurrencyCalculator onValuesChange={handleCalculatorChange} />
              </div>
              
              <div className="mt-4 text-center">
                <Button 
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 text-white font-medium w-full shadow-lg group"
                  onClick={handleGetBestRate}
                >
                  <span className="inline-flex items-center">
                    <span className="mr-1.5 text-yellow-200">✨</span> 
                    Get Best Rate Now
                    <ArrowRight size={16} className="ml-2" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sabi Buzz</h2>
          <p className="text-sm text-gray-600">Real insights with personality</p>
        </div>
        <MarketCommentary fromCurrency="GBP" toCurrency="NGN" />
      </div>

      <ComparisonResults results={comparisonResults} visible={showResults} />

      <div className="rate-alert-section">
        <RateAlertModule />
      </div>

      <div className="chart-container">
        <RateTrends />
      </div>

      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Provider Ranking Trends</h2>
            </div>
            <p className="text-gray-600">Track provider movement over time - see who's offering the best rates</p>
          </div>
          <EnhancedRateTrends hideRateTrendChart={true} />
        </div>
      </section>

      <FeatureCards />
      <NewsSection />
      <CountryNavigationSection />
      <FeatureSection />
    </div>
  );
};

export default HomepageDraft;
