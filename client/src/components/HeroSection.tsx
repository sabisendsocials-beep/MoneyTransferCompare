import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Globe, LineChart, Clock, BadgeCheck, ChevronsUpDown } from "lucide-react";
import TransferCalculator from "../components/TransferCalculator";

const HeroSection = () => {
  return (
    <section className="relative bg-white pt-12 lg:pt-20 pb-0 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-1/2 bg-gradient-to-b from-indigo-50 to-transparent opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-t from-green-50 to-transparent opacity-70"></div>
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#4f46e5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center bg-indigo-50 rounded-full px-3 py-1 text-sm font-medium text-indigo-700 mb-4">
            <BadgeCheck size={14} className="mr-1"/> Verified rates from 12+ providers
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent leading-tight">
            Compare Money Transfer Rates in Seconds
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Get the best exchange rates for your international transfers with real-time 
            data from trusted providers and save on fees.
          </p>
        </div>

        {/* Main calculator card */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform translate-y-0 hover:-translate-y-1 transition-all duration-300">
            {/* Card tabs */}
            <div className="flex border-b border-gray-100">
              <div className="px-6 py-3 border-b-2 border-indigo-600 text-indigo-600 font-medium">Compare Rates</div>
              <div className="px-6 py-3 text-gray-500 font-medium">View Trends</div>
              <div className="px-6 py-3 text-gray-500 font-medium">Provider Details</div>
            </div>
            
            {/* Card content */}
            <div className="p-6">
              <TransferCalculator onCompare={() => {}} />
            </div>

            {/* Card footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-500 flex items-center">
                <Clock size={14} className="mr-1.5" />
                <span>Rates updated every 6 hours</span>
              </div>
              <Link href="/compare">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-sm">
                  Compare All Providers
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-16 mb-16">
          <div className="p-6 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
              <Globe className="text-indigo-600" size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Global Coverage</h3>
            <p className="text-gray-600">Compare transfers between UK, EU, US, Nigeria, Ghana, and more countries worldwide.</p>
          </div>
          
          <div className="p-6 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <LineChart className="text-green-600" size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Historical Trends</h3>
            <p className="text-gray-600">Track exchange rate movements with 365-day historical data to find the best time to send money.</p>
          </div>
          
          <div className="p-6 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <ChevronsUpDown className="text-purple-600" size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Fee Transparency</h3>
            <p className="text-gray-600">See all fees and hidden costs with our comprehensive comparison to maximize your transfer amount.</p>
          </div>
        </div>

        {/* Trusted providers */}
        <div className="text-center mb-16">
          <h3 className="text-gray-400 uppercase text-sm font-medium tracking-wider mb-6">Trusted Providers</h3>
          <div className="flex flex-wrap justify-center gap-6 opacity-60">
            <div className="text-gray-500 font-medium">Western Union</div>
            <div className="text-gray-500 font-medium">Wise</div>
            <div className="text-gray-500 font-medium">MoneyGram</div>
            <div className="text-gray-500 font-medium">Remitly</div>
            <div className="text-gray-500 font-medium">WorldRemit</div>
            <div className="text-gray-500 font-medium">Nala</div>
            <div className="text-gray-500 font-medium">SendWave</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
