import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowRightLeft, BarChart3, ArrowRight, ArrowDownUp, 
  RefreshCw
} from "lucide-react";
import { SimpleCalculator } from "@/components/SimpleCalculator";

const HeroSection = () => {
  return (
    <section className="bg-gray-50">
      {/* Top Hero Section */}
      <div className="w-full bg-gradient-to-br from-blue-900 to-indigo-900 py-12 mb-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Compare UK to Nigeria Money Transfers
          </h1>
          <p className="text-center text-blue-100 max-w-3xl mx-auto">
            Find the best exchange rates, lowest fees, and fastest transfer times for sending money 
            from the UK to Nigeria.
          </p>
        </div>
      </div>

      {/* Calculator Card */}
      <div className="max-w-3xl mx-auto px-4 -mt-20">
        <div className="bg-white rounded-lg border shadow-lg p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Compare International Money Transfers
          </h2>
          <p className="text-gray-600 mb-6">
            Find the best rates and lowest fees across multiple providers
          </p>

          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button className="px-4 py-2 font-medium border-b-2 border-blue-600 text-blue-600">
              You Send
            </button>
            <button className="px-4 py-2 font-medium text-gray-500 hover:text-gray-700">
              They Receive
            </button>
          </div>

          <SimpleCalculator />

          {/* Exchange rate info */}
          <div className="text-xs text-gray-500 mt-2 mb-6">
            1 £ = 1,523 ₦ • Mid-market rate
          </div>

          {/* Compare Providers Button */}
          <div className="mt-4">
            <Link href="/results">
              <Button 
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Compare Providers
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-5xl mx-auto py-8 px-4 mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <RefreshCw className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Real-Time Rates</h3>
            <p className="text-gray-600">Get the most current exchange rates updated multiple times daily</p>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <ArrowDownUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Multiple Currencies</h3>
            <p className="text-gray-600">Compare rates for transfers between various countries and currencies</p>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Historical Data</h3>
            <p className="text-gray-600">Track rate changes over time to find the best timing for your transfers</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
