import { useParams, useLocation } from 'wouter';
import { SEO } from '@/components/SEO';
import CurrencyCalculator from '@/components/CurrencyCalculator';
import { Link } from 'wouter';

interface CountryConfig {
  name: string;
  currency: string;
  corridors: Array<{
    from: string;
    fromCurrency: string;
    path: string;
    description: string;
  }>;
  banks: string[];
  deliveryMethods: string[];
  regulations: string;
}

const countryConfigs: Record<string, CountryConfig> = {
  nigeria: {
    name: 'Nigeria',
    currency: 'NGN',
    corridors: [
      {
        from: 'UK',
        fromCurrency: 'GBP',
        path: '/gbp-to-ngn',
        description: 'Send British Pounds to Nigerian Naira'
      },
      {
        from: 'Europe',
        fromCurrency: 'EUR',
        path: '/eur-to-ngn',
        description: 'Send Euros to Nigerian Naira'
      }
    ],
    banks: ['GTBank', 'Zenith Bank', 'UBA', 'First Bank', 'Access Bank', 'Fidelity Bank', 'Sterling Bank'],
    deliveryMethods: ['Bank transfer', 'Mobile money (Opay, PalmPay)', 'Cash pickup'],
    regulations: 'Central Bank of Nigeria (CBN)'
  },
  ghana: {
    name: 'Ghana',
    currency: 'GHS',
    corridors: [
      {
        from: 'UK',
        fromCurrency: 'GBP',
        path: '/gbp-to-ghs',
        description: 'Send British Pounds to Ghanaian Cedis'
      },
      {
        from: 'Europe',
        fromCurrency: 'EUR',
        path: '/eur-to-ghs',
        description: 'Send Euros to Ghanaian Cedis'
      }
    ],
    banks: ['GCB Bank', 'Ecobank Ghana', 'Standard Chartered', 'Absa Bank Ghana', 'Fidelity Bank Ghana'],
    deliveryMethods: ['Bank transfer', 'Mobile money (MTN, Vodafone)', 'Cash pickup'],
    regulations: 'Bank of Ghana (BoG)'
  }
};

export default function CountryPage() {
  const [location] = useLocation();
  
  // Extract country from the URL path
  const getCountryFromPath = (path: string): string | null => {
    if (path.includes('nigeria')) return 'nigeria';
    if (path.includes('ghana')) return 'ghana';
    return null;
  };
  
  const country = getCountryFromPath(location);
  const config = country ? countryConfigs[country] : null;

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Country Not Found</h1>
          <p className="text-gray-600">The requested country page is not available.</p>
        </div>
      </div>
    );
  }

  const { name, currency, corridors, banks, deliveryMethods, regulations } = config;

  const seoTitle = `Send Money to ${name} | Best ${currency} Exchange Rates | SabiSend`;
  const seoDescription = `Compare live exchange rates for sending money to ${name}. Find the cheapest way to transfer money to ${currency} with rates from trusted providers updated every 6 hours.`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "name": `Money Transfer to ${name}`,
    "description": seoDescription,
    "provider": {
      "@type": "Organization",
      "name": "SabiSend"
    },
    "serviceType": "International Money Transfer",
    "areaServed": name,
    "currencyAccepted": currency
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        structuredData={structuredData}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Send Money to {name}
            </h1>
            <p className="text-xl text-green-100 max-w-3xl mx-auto">
              Compare live exchange rates and find the best way to send money to {name}. 
              Trusted providers, competitive rates, secure transfers.
            </p>
          </div>
        </div>
      </section>

      {/* Transfer Corridors */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Choose Your Transfer Route
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {corridors.map((corridor, index) => (
              <Link key={index} href={corridor.path}>
                <div className="bg-gray-50 rounded-lg p-6 hover:bg-blue-50 transition-colors cursor-pointer border border-gray-200 hover:border-blue-300">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {corridor.from} to {name}
                    </h3>
                    <p className="text-gray-600 mb-4">{corridor.description}</p>
                    <div className="inline-flex items-center space-x-2 text-blue-600 font-medium">
                      <span>Compare {corridor.fromCurrency} to {currency} rates</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Country Information */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Supported Banks */}
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Supported Banks in {name}
              </h3>
              <div className="space-y-3">
                {banks.map((bank, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">{bank}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Methods */}
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Delivery Options
              </h3>
              <div className="space-y-4">
                {deliveryMethods.map((method, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-gray-900">{method.split('(')[0]}</h4>
                    {method.includes('(') && (
                      <p className="text-sm text-gray-600 mt-1">
                        {method.split('(')[1]?.replace(')', '')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Regulations & Safety */}
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Regulations & Safety
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Regulatory Authority</h4>
                  <p className="text-gray-600">{regulations}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Transfer Limits</h4>
                  <p className="text-gray-600">
                    Most providers allow transfers up to £8,000 per transaction, 
                    with higher limits for verified customers.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Processing Time</h4>
                  <p className="text-gray-600">
                    Bank transfers: Minutes to 24 hours<br />
                    Cash pickup: Usually instant once processed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Calculator */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Quick Rate Check
          </h2>
          <p className="text-gray-600 mb-8">
            Enter an amount to see current rates for transfers to {name}
          </p>
          
          <div className="max-w-2xl mx-auto">
            <CurrencyCalculator 
              toCurrency={currency}
              redirectPath={`/send-money-to-${country}`}
            />
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Why Choose SabiSend for Transfers to {name}?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Live Exchange Rates</h3>
              <p className="text-gray-600 mb-6">
                Our platform aggregates real-time exchange rates from multiple providers, 
                updated every 6 hours to ensure you always see the most current rates available.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-4">Transparent Comparison</h3>
              <p className="text-gray-600">
                We show you the total cost including fees, so you can make informed decisions. 
                No hidden charges or surprise fees when you complete your transfer.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Regulated Providers</h3>
              <p className="text-gray-600 mb-6">
                All providers on our platform are regulated by relevant financial authorities, 
                ensuring your money is protected throughout the transfer process.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-4">Multiple Options</h3>
              <p className="text-gray-600">
                Choose from bank transfers, mobile money, or cash pickup depending on 
                what works best for your recipient in {name}.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}