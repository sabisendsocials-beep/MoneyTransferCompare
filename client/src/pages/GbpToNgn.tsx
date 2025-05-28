import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyCalculator } from "@/components/CurrencyCalculator";
import { SEO, createFinancialServiceSchema, createCurrencyExchangeSchema } from "@/components/SEO";
import { ArrowRight, TrendingUp, Shield, Clock } from "lucide-react";

export default function GbpToNgn() {
  const [, setLocation] = useLocation();
  const [currentRate, setCurrentRate] = useState<number>(2141.78);

  useEffect(() => {
    // Fetch current GBP to NGN rate
    fetch('/api/rate-stats?from=GBP&to=NGN')
      .then(res => res.json())
      .then(data => {
        if (data.currentRate) {
          setCurrentRate(data.currentRate);
        }
      })
      .catch(console.error);
  }, []);

  const currencySchema = createCurrencyExchangeSchema("GBP", "NGN", currentRate);
  const serviceSchema = createFinancialServiceSchema();
  
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [serviceSchema, currencySchema]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <SEO
        title="GBP to NGN - Best Pound to Naira Exchange Rates | Send Money to Nigeria | SabiSend"
        description={`Compare live GBP to NGN rates from 15+ providers. Current rate: 1 GBP = ${currentRate.toFixed(2)} NGN. Save money on transfers to Nigeria with SabiSend's rate comparison.`}
        keywords="GBP to NGN, Pound to Naira, send money to Nigeria, UK to Nigeria transfer, best GBP NGN rates, money transfer Nigeria"
        canonicalUrl="https://sabisend.com/gbp-to-ngn"
        structuredData={structuredData}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Best <span className="text-blue-600">GBP to NGN</span> Exchange Rates
          </h1>
          <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
            Compare live Pound Sterling to Nigerian Naira rates from 15+ trusted providers. 
            Find the cheapest way to send money from UK to Nigeria.
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-6 inline-block mb-8">
            <div className="flex items-center justify-center gap-4 text-2xl font-bold">
              <span className="text-gray-700">1 GBP =</span>
              <span className="text-green-600">{currentRate.toFixed(2)} NGN</span>
              <div className="flex items-center text-green-500 text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                Live Rate
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Updated every 6 hours</p>
          </div>
        </div>

        {/* Calculator Section */}
        <div className="mb-16">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                Calculate Your Transfer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencyCalculator 
                defaultFromCurrency="GBP"
                defaultToCurrency="NGN"
              />
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Trusted Providers</h3>
              <p className="text-gray-600">
                Compare rates from FCA-regulated providers including Wise, Western Union, Remitly, and more.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Best Rates</h3>
              <p className="text-gray-600">
                Save up to £50 per transfer by finding the provider with the best GBP to NGN exchange rate.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Fast Transfers</h3>
              <p className="text-gray-600">
                Most providers offer same-day or next-day delivery to Nigerian bank accounts.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Popular Amounts Section */}
        <div className="bg-gray-50 rounded-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Popular Transfer Amounts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[100, 200, 500, 1000].map(amount => (
              <Button
                key={amount}
                variant="outline"
                className="h-16 text-lg"
                onClick={() => setLocation(`/compare?amount=${amount}&from=GBP&to=NGN&mode=send`)}
              >
                £{amount}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>

        {/* SEO Content Section */}
        <div className="prose max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Why Compare GBP to NGN Rates?</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">Save Money on Every Transfer</h3>
              <p className="text-gray-600">
                Exchange rates can vary significantly between providers. By comparing rates, 
                you can ensure your recipients in Nigeria get the most Naira for your Pounds.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-3">Transparent Pricing</h3>
              <p className="text-gray-600">
                We show you the real exchange rate and all fees upfront, so you know 
                exactly how much your transfer will cost before you send.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-semibold mb-4">Best Providers for UK to Nigeria Transfers</h3>
          <p className="text-gray-600 mb-4">
            Our platform compares leading money transfer services including Wise (formerly TransferWise), 
            Western Union, Remitly, WorldRemit, and many others. Each provider offers different advantages:
          </p>
          
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Wise:</strong> Often offers mid-market rates with transparent fees</li>
            <li><strong>Remitly:</strong> Competitive rates with fast delivery options</li>
            <li><strong>Western Union:</strong> Extensive cash pickup network in Nigeria</li>
            <li><strong>WorldRemit:</strong> Good for mobile money and bank transfers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}