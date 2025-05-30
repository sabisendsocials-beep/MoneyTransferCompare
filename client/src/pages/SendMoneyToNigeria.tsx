import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO, createFinancialServiceSchema, createCurrencyExchangeSchema } from "@/components/SEO";
import { ArrowRight, TrendingUp, Shield, Clock, Smartphone, CreditCard, MapPin } from "lucide-react";

export default function SendMoneyToNigeria() {
  const [, setLocation] = useLocation();
  const [currentRate, setCurrentRate] = useState<number>(2137.34);

  useEffect(() => {
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <SEO
        title="Send Money to Nigeria Online - Compare Best UK Transfer Services 2024"
        description={`Send money to Nigeria safely and cheaply. Compare rates from Wise, Western Union, Remitly & more. Current rate: £1 = ₦${currentRate.toFixed(2)}. Fast, secure transfers from UK to Nigeria.`}
        keywords="send money to Nigeria, money transfer Nigeria, UK to Nigeria transfer, remittance Nigeria, transfer money online Nigeria, best way send money Nigeria"
        canonicalUrl="https://sabisend.com/send-money-to-nigeria"
        structuredData={structuredData}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Send Money to <span className="text-green-600">Nigeria</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Fast, secure, and affordable money transfers from UK to Nigeria. 
            Compare live rates and save up to £50 on every transfer.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="text-left">
                <div className="font-semibold">FCA Regulated</div>
                <div className="text-sm text-gray-500">UK Licensed</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="text-left">
                <div className="font-semibold">Fast Transfers</div>
                <div className="text-sm text-gray-500">Minutes to Hours</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="text-left">
                <div className="font-semibold">Best Rates</div>
                <div className="text-sm text-gray-500">Save Money</div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How to Send Money to Nigeria</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Compare Rates</h3>
              <p className="text-gray-600">
                See live exchange rates from 15+ providers including Wise, Remitly, and Western Union
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Provider</h3>
              <p className="text-gray-600">
                Select the best rate and register with your chosen money transfer service
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Send Money</h3>
              <p className="text-gray-600">
                Transfer arrives in Nigeria within minutes to 1 business day
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Methods */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Ways to Send Money to Nigeria</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Bank Transfer</h3>
                <p className="text-sm text-gray-600">
                  Direct to Nigerian banks: GTBank, Zenith, UBA, First Bank, Access
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Smartphone className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Mobile Money</h3>
                <p className="text-sm text-gray-600">
                  Instant delivery to mobile wallets and bank apps
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Cash Pickup</h3>
                <p className="text-sm text-gray-600">
                  3,000+ Western Union locations across Nigeria
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Smartphone className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Airtime Top-up</h3>
                <p className="text-sm text-gray-600">
                  Send mobile credit to MTN, Airtel, Glo, 9mobile
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-8 text-center text-white mb-16">
          <h2 className="text-3xl font-bold mb-4">Ready to Send Money to Nigeria?</h2>
          <p className="text-xl mb-6">Compare rates now and save money on your transfer</p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100"
            onClick={() => setLocation("/compare?amount=100&from=GBP&to=NGN&mode=send")}
          >
            Compare Rates Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* SEO Content */}
        <div className="prose max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Best Money Transfer Services to Nigeria in 2024</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">Top Providers Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Provider</th>
                    <th className="text-left py-2">Fees</th>
                    <th className="text-left py-2">Speed</th>
                    <th className="text-left py-2">Best For</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Wise</td>
                    <td className="py-2">0.4-0.7%</td>
                    <td className="py-2">1-2 hours</td>
                    <td className="py-2">Best rates, transparency</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Remitly</td>
                    <td className="py-2">£2.99+</td>
                    <td className="py-2">Minutes</td>
                    <td className="py-2">Fast transfers, promotions</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Western Union</td>
                    <td className="py-2">£4.90+</td>
                    <td className="py-2">Minutes</td>
                    <td className="py-2">Cash pickup network</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">WorldRemit</td>
                    <td className="py-2">£2.99+</td>
                    <td className="py-2">Minutes</td>
                    <td className="py-2">Mobile money, airtime</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="text-2xl font-semibold mb-4">Requirements to Send Money to Nigeria</h3>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>UK government-issued photo ID (passport, driving license)</li>
            <li>Proof of address (utility bill, bank statement)</li>
            <li>Nigerian recipient's full name and address</li>
            <li>Bank account details or mobile money number</li>
            <li>Purpose of transfer (family support, business, etc.)</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4">Nigerian Banks We Support</h3>
          <p className="text-gray-700 mb-4">Send directly to all major Nigerian banks including:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            <div className="text-gray-700">• Guaranty Trust Bank (GTBank)</div>
            <div className="text-gray-700">• Zenith Bank</div>
            <div className="text-gray-700">• United Bank for Africa (UBA)</div>
            <div className="text-gray-700">• First Bank of Nigeria</div>
            <div className="text-gray-700">• Access Bank</div>
            <div className="text-gray-700">• Stanbic IBTC Bank</div>
          </div>
        </div>
      </div>
    </div>
  );
}