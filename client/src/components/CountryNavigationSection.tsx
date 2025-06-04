import { Link } from 'wouter';
import { Globe, ArrowRight } from 'lucide-react';

const countryPages = [
  { 
    href: '/send-money-to-nigeria', 
    title: 'Send Money to Nigeria', 
    flag: '🇳🇬',
    description: 'Fast and secure transfers to Nigeria with competitive rates',
    currencies: ['GBP to NGN', 'EUR to NGN', 'USD to NGN']
  },
  { 
    href: '/send-money-to-ghana', 
    title: 'Send Money to Ghana', 
    flag: '🇬🇭',
    description: 'Reliable money transfers to Ghana at the best rates',
    currencies: ['GBP to GHS', 'EUR to GHS', 'USD to GHS']
  },
  { 
    href: '/send-money-to-kenya', 
    title: 'Send Money to Kenya', 
    flag: '🇰🇪',
    description: 'Quick transfers to Kenya with transparent pricing',
    currencies: ['GBP to KES', 'EUR to KES', 'USD to KES']
  },
  { 
    href: '/send-money-to-india', 
    title: 'Send Money to India', 
    flag: '🇮🇳',
    description: 'Trusted money transfer service to India',
    currencies: ['GBP to INR', 'EUR to INR', 'USD to INR']
  },
  { 
    href: '/send-money-to-pakistan', 
    title: 'Send Money to Pakistan', 
    flag: '🇵🇰',
    description: 'Secure and affordable transfers to Pakistan',
    currencies: ['GBP to PKR', 'EUR to PKR', 'USD to PKR']
  },
];



export default function CountryNavigationSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Send Money Worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Compare rates and find the best deals for your international money transfers. 
            We support transfers to 5 major destinations across Africa and Asia.
          </p>
        </div>

        {/* Country Pages */}
        <div>
          <div className="flex items-center mb-8">
            <Globe className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-2xl font-bold text-gray-900">Popular Destinations</h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {countryPages.map((country, index) => (
              <Link key={index} href={country.href}>
                <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300 cursor-pointer">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">{country.flag}</span>
                    <h4 className="text-lg font-semibold text-gray-900">{country.title}</h4>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{country.description}</p>
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {country.currencies.map((currency, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                          {currency}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center text-blue-600 font-medium text-sm">
                    <span>View transfer options</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}