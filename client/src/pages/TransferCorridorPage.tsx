import { useParams, useLocation } from 'wouter';
import { SEO } from '@/components/SEO';
import HeroSection from '@/components/HeroSection';
import HorizontalResults from './HorizontalResults';
import { useState, useEffect } from 'react';

interface CorridorConfig {
  fromCurrency: string;
  toCurrency: string;
  fromCountry: string;
  toCountry: string;
  banks: string[];
  providers: string[];
  deliveryMethods: string[];
}

const corridorConfigs: Record<string, CorridorConfig> = {
  'gbp-to-ngn': {
    fromCurrency: 'GBP',
    toCurrency: 'NGN',
    fromCountry: 'UK',
    toCountry: 'Nigeria',
    banks: ['GTBank', 'Zenith Bank', 'UBA', 'First Bank', 'Access Bank', 'Fidelity Bank'],
    providers: ['Wise', 'Western Union', 'Remitly', 'WorldRemit'],
    deliveryMethods: ['Bank transfer', 'Mobile money', 'Cash pickup']
  },
  'eur-to-ngn': {
    fromCurrency: 'EUR',
    toCurrency: 'NGN',
    fromCountry: 'Europe',
    toCountry: 'Nigeria',
    banks: ['GTBank', 'Zenith Bank', 'UBA', 'First Bank', 'Access Bank'],
    providers: ['Wise', 'Western Union', 'Remitly', 'WorldRemit'],
    deliveryMethods: ['Bank transfer', 'Mobile money', 'Cash pickup']
  },
  'gbp-to-ghs': {
    fromCurrency: 'GBP',
    toCurrency: 'GHS',
    fromCountry: 'UK',
    toCountry: 'Ghana',
    banks: ['GCB Bank', 'Ecobank', 'Standard Chartered', 'Absa Bank'],
    providers: ['Wise', 'Western Union', 'Remitly', 'WorldRemit'],
    deliveryMethods: ['Bank transfer', 'Mobile money', 'Cash pickup']
  },
  'eur-to-ghs': {
    fromCurrency: 'EUR',
    toCurrency: 'GHS',
    fromCountry: 'Europe',
    toCountry: 'Ghana',
    banks: ['GCB Bank', 'Ecobank', 'Standard Chartered', 'Absa Bank'],
    providers: ['Wise', 'Western Union', 'Remitly', 'WorldRemit'],
    deliveryMethods: ['Bank transfer', 'Mobile money', 'Cash pickup']
  }
};

export default function TransferCorridorPage() {
  const [location] = useLocation();
  const [showResults, setShowResults] = useState(false);

  // Extract corridor from the URL path
  const getCorridorFromPath = (path: string): string | null => {
    if (path.includes('gbp-to-ngn')) return 'gbp-to-ngn';
    if (path.includes('eur-to-ngn')) return 'eur-to-ngn';
    if (path.includes('gbp-to-ghs')) return 'gbp-to-ghs';
    if (path.includes('eur-to-ghs')) return 'eur-to-ghs';
    return null;
  };

  const corridor = getCorridorFromPath(location);
  const config = corridor ? corridorConfigs[corridor] : null;

  useEffect(() => {
    // Check if we have calculator results to show
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount');
    if (amount) {
      setShowResults(true);
    }
  }, [location]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Corridor Not Found</h1>
          <p className="text-gray-600">The requested transfer corridor is not available.</p>
        </div>
      </div>
    );
  }

  const { fromCurrency, toCurrency, fromCountry, toCountry, banks, providers, deliveryMethods } = config;

  const seoTitle = `${fromCurrency} to ${toCurrency} Exchange Rate | Best Money Transfer Rates | SabiSend`;
  const seoDescription = `Compare live ${fromCurrency} to ${toCurrency} exchange rates from top providers. Find the cheapest way to send money from ${fromCountry} to ${toCountry} with rates updated every 6 hours.`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "name": `${fromCountry} to ${toCountry} Money Transfer`,
    "description": seoDescription,
    "provider": {
      "@type": "Organization",
      "name": "SabiSend"
    },
    "serviceType": "Money Transfer",
    "areaServed": [fromCountry, toCountry],
    "currencyAccepted": [fromCurrency, toCurrency]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        structuredData={structuredData}
      />

      {/* Hero Section with Calculator */}
      <HeroSection />

      {/* Results Section */}
      {showResults && (
        <section className="py-8">
          <HorizontalResults />
        </section>
      )}

      {/* Information Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                How to Send {fromCurrency} to {toCurrency}
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Compare Exchange Rates</h3>
                    <p className="text-gray-600">
                      Use our calculator to compare live rates from multiple money transfer providers.
                      Rates are updated every 6 hours to ensure accuracy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-green-600">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Choose Your Provider</h3>
                    <p className="text-gray-600">
                      Select the provider with the best rate and register on their platform.
                      All providers are regulated and secure.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-purple-600">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Complete Your Transfer</h3>
                    <p className="text-gray-600">
                      Send your money and track the transfer. Most transfers arrive within minutes to 24 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Transfer Options in {toCountry}
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Supported Banks</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {banks.map((bank, index) => (
                      <div key={index} className="bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-700">
                        {bank}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Delivery Methods</h3>
                  <div className="space-y-2">
                    {deliveryMethods.map((method, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-gray-700">{method}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Providers</h3>
                  <div className="space-y-2">
                    {providers.map((provider, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-gray-700">{provider}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How long does it take to send money from {fromCountry} to {toCountry}?
              </h3>
              <p className="text-gray-600">
                Transfer times vary by provider and delivery method. Bank transfers typically take 
                minutes to 24 hours, while cash pickup can be instant once the transfer is processed.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What's the best exchange rate for {fromCurrency} to {toCurrency}?
              </h3>
              <p className="text-gray-600">
                Exchange rates change throughout the day. Use our comparison tool above to see 
                live rates from all major providers and find the best deal for your transfer amount.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Are these money transfer services safe?
              </h3>
              <p className="text-gray-600">
                Yes, all providers we compare are regulated by financial authorities and use 
                secure encryption to protect your money and personal information.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What information do I need to send money to {toCountry}?
              </h3>
              <p className="text-gray-600">
                You'll typically need the recipient's full name, address, and bank details or 
                mobile number for mobile money transfers. Some providers may require additional verification.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}