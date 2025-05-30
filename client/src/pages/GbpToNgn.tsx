import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CurrencyCalculator from "@/components/CurrencyCalculator";
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
        title="Send Money to Nigeria - Best UK to Nigeria Transfer Rates | Compare Pound to Naira"
        description={`Send money from UK to Nigeria with the best rates. Compare 15+ providers including Wise, Remitly, Western Union. Current rate: £1 = ₦${currentRate.toFixed(2)}. Save up to £50 per transfer.`}
        keywords="send money to Nigeria, UK to Nigeria money transfer, pound to naira rate, money transfer Nigeria, remittance to Nigeria, transfer money Nigeria, best rates Nigeria, GBP NGN exchange rate"
        canonicalUrl="https://sabisend.com/send-money-to-nigeria"
        structuredData={structuredData}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Send Money to <span className="text-blue-600">Nigeria</span> - Best UK Transfer Rates
          </h1>
          <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
            Compare money transfer rates from UK to Nigeria. Find the cheapest way to send pounds to naira 
            with trusted providers like Wise, Remitly, and Western Union.
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
          <h2 className="text-3xl font-bold mb-6">How to Send Money from UK to Nigeria</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">Compare Money Transfer Services</h3>
              <p className="text-gray-600">
                Different providers offer varying exchange rates and fees. Comparing rates ensures 
                your family in Nigeria receives more naira for your pounds, potentially saving you £50+ per transfer.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-3">Fast and Secure Transfers</h3>
              <p className="text-gray-600">
                Most transfers arrive within minutes to 1 business day. All providers are 
                FCA-regulated in the UK, ensuring your money is protected during the transfer process.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-semibold mb-4">Best Money Transfer Apps and Services to Nigeria</h3>
          <p className="text-gray-600 mb-4">
            These are the most popular ways to send money from the UK to Nigeria, each with unique benefits:
          </p>
          
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-8">
            <li><strong>Wise (formerly TransferWise):</strong> Real exchange rate with transparent fees, usually 0.4-0.7%</li>
            <li><strong>Remitly:</strong> Fast transfers with promotional rates for new customers</li>
            <li><strong>Western Union:</strong> Cash pickup at 3,000+ locations across Nigeria</li>
            <li><strong>WorldRemit:</strong> Mobile money transfers and airtime top-ups</li>
            <li><strong>Sendwave:</strong> Zero fees on first transfers, good for small amounts</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4">What You Need to Send Money to Nigeria</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-8">
            <li>Valid UK ID (passport or driving license)</li>
            <li>Nigerian recipient's full name and address</li>
            <li>Bank account details or mobile money number</li>
            <li>Reason for sending money (required by UK regulations)</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4">Delivery Options in Nigeria</h3>
          <p className="text-gray-600 mb-4">Choose how your recipient receives the money:</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Bank Transfer:</strong> Direct to Nigerian bank accounts (GTBank, Zenith, UBA, etc.)</li>
            <li><strong>Mobile Money:</strong> Instant delivery to mobile wallets</li>
            <li><strong>Cash Pickup:</strong> Available at Western Union and MoneyGram locations</li>
            <li><strong>Airtime Top-up:</strong> Send mobile credit directly to Nigerian phone numbers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}