import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { 
  ArrowRight, 
  TrendingUp, 
  Crown, 
  Lightbulb, 
  Bell, 
  Target,
  Sparkles,
  MessageCircle
} from "lucide-react";
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
import { PersonalizedDashboard } from "@/components/PersonalizedDashboard";
import { MarketCommentary } from "@/components/MarketCommentary";
import AccountCreationBanner from "@/components/AccountCreationBanner";
import { TransferResult } from "@shared/schema";
import { SEO, createFinancialServiceSchema, createWebsiteSchema } from "@/components/SEO";

interface ProviderRotation {
  currentBest: string;
  historicalLeader: string;
  recommendation: string;
  timePattern?: string;
}

interface AlertSuggestion {
  targetRate: number;
  percentageAboveCurrent: number;
  reasoning: string;
}

interface PowerInsightData {
  alertSuggestion: AlertSuggestion;
  currentMarket: {
    bestProviderRate: number;
    bestProvider: string;
  };
}

const Home = () => {
  const [, setLocation] = useLocation();
  const [comparisonResults, setComparisonResults] = useState<TransferResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [calculatorValues, setCalculatorValues] = useState({
    amount: "100",
    fromCurrency: "GBP",
    toCurrency: "NGN",
    calculationMode: "send"
  });

  const { data: authStatus } = useQuery({
    queryKey: ['/api/auth/status'],
    retry: false,
  });

  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user-fresh'],
    enabled: !!(authStatus as any)?.user,
    retry: false,
  });

  const { data: providerRotation } = useQuery<ProviderRotation>({
    queryKey: ['/api/ai/provider-rotation', calculatorValues.fromCurrency, calculatorValues.toCurrency],
    queryFn: async () => {
      const response = await fetch(`/api/ai/provider-rotation?fromCurrency=${calculatorValues.fromCurrency}&toCurrency=${calculatorValues.toCurrency}`);
      if (!response.ok) throw new Error('Failed to fetch provider rotation');
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: powerInsight } = useQuery<PowerInsightData>({
    queryKey: ['/api/ai/power-insight', calculatorValues.fromCurrency, calculatorValues.toCurrency, 500],
    queryFn: async () => {
      const response = await fetch(`/api/ai/power-insight?fromCurrency=${calculatorValues.fromCurrency}&toCurrency=${calculatorValues.toCurrency}&amount=500`);
      if (!response.ok) throw new Error('Failed to fetch power insight');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
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

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
  };

  const financialServiceSchema = createFinancialServiceSchema();
  const websiteSchema = createWebsiteSchema();
  
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [financialServiceSchema, websiteSchema]
  };

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
          <PersonalizedDashboard user={userData as any} className="personalized-dashboard" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="SabiSend - Compare Best Money Transfer Rates to Nigeria & Ghana | Save Money on Remittances"
        description="Compare live exchange rates from 15+ money transfer providers. Send money to Nigeria and Ghana with the best rates. Save up to £50 per transfer with SabiSend."
        keywords="money transfer, send money to Nigeria, GBP to NGN, remittance rates, transfer money Ghana, best exchange rates, international money transfer, UK to Nigeria, UK to Ghana"
        canonicalUrl="https://sabisend.com"
        structuredData={structuredData}
      />
      
      <AccountCreationBanner />

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

      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:space-x-8">
            <div className="lg:w-1/2 space-y-4 order-2 lg:order-1 mt-6 lg:mt-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-primary px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-white" />
                    <h3 className="font-medium text-white text-sm">Sabi Buzz</h3>
                    <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-0 text-xs">
                      Live
                    </Badge>
                  </div>
                  <p className="text-white/70 text-xs mt-0.5">Real insights with personality</p>
                </div>
                <div className="p-4">
                  <MarketCommentary 
                    fromCurrency={calculatorValues.fromCurrency} 
                    toCurrency={calculatorValues.toCurrency} 
                  />
                </div>
              </div>

              {providerRotation && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-primary px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-white" />
                      <h3 className="font-medium text-white text-sm">Market Intelligence</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1.5">Current Market Leader</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary hover:bg-primary text-white text-xs">
                            {providerRotation.currentBest}
                          </Badge>
                          <span className="text-xs text-emerald-600 font-medium">Active</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1.5">Historical Performance</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-primary text-primary text-xs">
                            {providerRotation.historicalLeader}
                          </Badge>
                          <span className="text-xs text-primary font-medium">Consistent</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2 text-sm text-gray-700 bg-primary/5 rounded-lg p-3">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs">{providerRotation.recommendation}</p>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-3 italic">
                      This intelligence complements your existing provider comparisons.
                    </p>
                  </div>
                </div>
              )}

              {powerInsight?.alertSuggestion && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-primary px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-white" />
                      <h3 className="font-medium text-white text-sm">Smart Alert Suggestion</h3>
                      <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-0 text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          Set alert at {formatRate(powerInsight.alertSuggestion.targetRate)} {calculatorValues.toCurrency}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {powerInsight.alertSuggestion.reasoning}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                      data-testid="btn-create-smart-alert"
                      onClick={() => {
                        const alertSection = document.getElementById('rate-alert-section');
                        if (alertSection) {
                          alertSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Create Alert
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:w-1/2 order-1 lg:order-2">
              <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-800 p-5 md:p-6 rounded-xl shadow-xl lg:sticky lg:top-4">
                <h2 className="text-lg font-semibold mb-4 text-center text-white">Quick Calculator</h2>
                
                <div data-testid="currency-calculator">
                  <CurrencyCalculator onValuesChange={handleCalculatorChange} />
                </div>
                
                <div className="mt-5 text-center">
                  <Button 
                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 text-white font-medium w-full shadow-lg group py-3"
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
        </div>
      </section>

      <ComparisonResults results={comparisonResults} visible={showResults} />

      <div id="rate-alert-section" className="rate-alert-section">
        <RateAlertModule />
      </div>

      <div className="chart-container">
        <RateTrends />
      </div>

      <section className="py-8 bg-white">
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

export default Home;
