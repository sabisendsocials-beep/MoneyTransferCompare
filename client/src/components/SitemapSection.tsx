import { Link } from 'wouter';
import { Globe, ArrowRight, TrendingUp } from 'lucide-react';

const currencyCorridors = [
  // GBP Corridors
  { path: '/gbp-to-ngn', title: 'GBP to NGN', description: 'British Pound to Nigerian Naira' },
  { path: '/gbp-to-ghs', title: 'GBP to GHS', description: 'British Pound to Ghanaian Cedi' },
  { path: '/gbp-to-kes', title: 'GBP to KES', description: 'British Pound to Kenyan Shilling' },
  { path: '/gbp-to-inr', title: 'GBP to INR', description: 'British Pound to Indian Rupee' },
  { path: '/gbp-to-pkr', title: 'GBP to PKR', description: 'British Pound to Pakistani Rupee' },
  
  // EUR Corridors
  { path: '/eur-to-ngn', title: 'EUR to NGN', description: 'Euro to Nigerian Naira' },
  { path: '/eur-to-ghs', title: 'EUR to GHS', description: 'Euro to Ghanaian Cedi' },
  { path: '/eur-to-kes', title: 'EUR to KES', description: 'Euro to Kenyan Shilling' },
  { path: '/eur-to-inr', title: 'EUR to INR', description: 'Euro to Indian Rupee' },
  { path: '/eur-to-pkr', title: 'EUR to PKR', description: 'Euro to Pakistani Rupee' },
  
  // USD Corridors
  { path: '/usd-to-ngn', title: 'USD to NGN', description: 'US Dollar to Nigerian Naira' },
  { path: '/usd-to-ghs', title: 'USD to GHS', description: 'US Dollar to Ghanaian Cedi' },
  { path: '/usd-to-kes', title: 'USD to KES', description: 'US Dollar to Kenyan Shilling' },
  { path: '/usd-to-inr', title: 'USD to INR', description: 'US Dollar to Indian Rupee' },
  { path: '/usd-to-pkr', title: 'USD to PKR', description: 'US Dollar to Pakistani Rupee' },
];

const countryPages = [
  { path: '/send-money-to-nigeria', title: 'Send Money to Nigeria', description: 'Transfer money to Nigeria with best rates' },
  { path: '/send-money-to-ghana', title: 'Send Money to Ghana', description: 'Transfer money to Ghana with best rates' },
  { path: '/send-money-to-kenya', title: 'Send Money to Kenya', description: 'Transfer money to Kenya with best rates' },
  { path: '/send-money-to-india', title: 'Send Money to India', description: 'Transfer money to India with best rates' },
  { path: '/send-money-to-pakistan', title: 'Send Money to Pakistan', description: 'Transfer money to Pakistan with best rates' },
];

export default function SitemapSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Explore All Transfer Routes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Compare live exchange rates across 15 currency corridors to 5 destinations. 
            Find the best rates for your specific transfer route.
          </p>
        </div>

        {/* Country Pages */}
        <div className="mb-16">
          <div className="flex items-center mb-8">
            <Globe className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-2xl font-bold text-gray-900">Send Money by Destination</h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {countryPages.map((country, index) => (
              <Link key={index} href={country.path}>
                <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300 cursor-pointer">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{country.title}</h4>
                  <p className="text-gray-600 text-sm mb-4">{country.description}</p>
                  <div className="flex items-center text-blue-600 font-medium text-sm">
                    <span>View transfer options</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Currency Corridors */}
        <div>
          <div className="flex items-center mb-8">
            <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-2xl font-bold text-gray-900">Currency Exchange Rates</h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currencyCorridors.map((corridor, index) => (
              <Link key={index} href={corridor.path}>
                <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-green-300 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{corridor.title}</h4>
                      <p className="text-gray-600 text-sm">{corridor.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="mt-16 bg-white rounded-xl p-8 shadow-sm border">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Quick Navigation</h3>
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <Link href="/compare">
              <div className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
                <h4 className="font-semibold text-blue-900">Compare Rates</h4>
                <p className="text-sm text-blue-700 mt-1">Compare all providers</p>
              </div>
            </Link>
            
            <Link href="/trends">
              <div className="p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
                <h4 className="font-semibold text-green-900">Rate Trends</h4>
                <p className="text-sm text-green-700 mt-1">Historical rate data</p>
              </div>
            </Link>
            
            <Link href="/news">
              <div className="p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer">
                <h4 className="font-semibold text-purple-900">Market News</h4>
                <p className="text-sm text-purple-700 mt-1">Latest financial news</p>
              </div>
            </Link>
            
            <Link href="/how-it-works">
              <div className="p-4 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer">
                <h4 className="font-semibold text-amber-900">How It Works</h4>
                <p className="text-sm text-amber-700 mt-1">Transfer guide</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}