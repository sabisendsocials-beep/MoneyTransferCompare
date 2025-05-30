import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import ComparisonResults from "@/components/ComparisonResults";
import RateTrends from "@/components/RateTrends";
import NewsSection from "@/components/NewsSection";
import FeatureSection from "@/components/FeatureSection";
import { TransferResult } from "@shared/schema";
import { SEO, createFinancialServiceSchema, createWebsiteSchema } from "@/components/SEO";

const Home = () => {
  const [comparisonResults, setComparisonResults] = useState<TransferResult[]>([]);
  const [showResults, setShowResults] = useState(false);

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
      
      {/* SEO Content Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Send Money to Nigeria & Ghana - Best UK Transfer Rates
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Compare live exchange rates from trusted providers including Wise, Western Union, 
              Remitly, and WorldRemit. Save money on every transfer from UK to West Africa.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">UK to Nigeria Money Transfer</h3>
              <p className="text-gray-600 mb-4">
                Send GBP to NGN with the best exchange rates. Direct bank transfers to GTBank, 
                Zenith, UBA, First Bank, and all major Nigerian banks.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Live GBP to NGN rates updated every 6 hours</li>
                <li>• Transfers arrive in minutes to 24 hours</li>
                <li>• FCA regulated providers only</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Money Transfer Services</h3>
              <p className="text-gray-600 mb-4">
                Compare fees and rates from 15+ providers. Find the cheapest way to send 
                money with transparent pricing and no hidden charges.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Wise: Best rates with 0.4-0.7% fees</li>
                <li>• Western Union: Extensive cash pickup network</li>
                <li>• Remitly: Fast transfers with promotional rates</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Secure & Fast Transfers</h3>
              <p className="text-gray-600 mb-4">
                All providers are regulated by the UK Financial Conduct Authority. 
                Your money is protected throughout the transfer process.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Bank transfers, mobile money, cash pickup</li>
                <li>• Real-time tracking and notifications</li>
                <li>• 24/7 customer support available</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-sm">
            <h3 className="text-2xl font-bold mb-6">How to Send Money from UK to Nigeria</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-semibold mb-2">Compare Rates</h4>
                <p className="text-gray-600 text-sm">
                  Use our calculator to compare live exchange rates from multiple providers
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-green-600">2</span>
                </div>
                <h4 className="font-semibold mb-2">Choose Provider</h4>
                <p className="text-gray-600 text-sm">
                  Select the best rate and register with your chosen money transfer service
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-purple-600">3</span>
                </div>
                <h4 className="font-semibold mb-2">Send Money</h4>
                <p className="text-gray-600 text-sm">
                  Complete your transfer - money arrives in Nigeria within hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other sections remain unchanged */}
      <RateTrends />
      <NewsSection />
      <FeatureSection />
    </div>
  );
};

export default Home;
