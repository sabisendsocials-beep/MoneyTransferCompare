import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Clock, TrendingUp, ShieldCheck, RefreshCw } from "lucide-react";
import CurrencyCalculator from "../components/CurrencyCalculator";

const HeroSection = () => {
  return (
    <section className="bg-[#1a365d] text-white py-12 lg:py-20 relative overflow-hidden">
      {/* Modern geometric background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-b from-[#0fbbce] to-transparent opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-t from-[#22c55e] to-transparent opacity-20"></div>
        <svg width="100%" height="100%" className="absolute inset-0 opacity-10">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Content container */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left content */}
          <div className="lg:w-5/12 mb-8 lg:mb-0">
            <div className="flex items-center mb-4 gap-2">
              <div className="h-1.5 w-12 bg-[#0fbbce] rounded-full"></div>
              <span className="text-[#0fbbce] font-semibold uppercase tracking-wider text-sm">Verified Rates</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Make Smarter <span className="bg-gradient-to-r from-[#22c55e] to-[#0fbbce] bg-clip-text text-transparent">Money Transfers</span>
            </h1>
            <p className="text-lg mb-8 text-blue-100 max-w-xl">
              Compare real-time, verified exchange rates from trusted providers. 
              Save on fees and get more value in every international transfer.
            </p>
            
            {/* Trust indicators */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-start">
                <div className="mr-3 mt-1 bg-[#0fbbce]/10 p-2 rounded-lg">
                  <RefreshCw size={18} className="text-[#0fbbce]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Real-time Rates</h3>
                  <p className="text-sm text-blue-200">Updated every 6 hours</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-1 bg-[#0fbbce]/10 p-2 rounded-lg">
                  <ShieldCheck size={18} className="text-[#0fbbce]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Verified Data</h3>
                  <p className="text-sm text-blue-200">From official sources</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-1 bg-[#0fbbce]/10 p-2 rounded-lg">
                  <TrendingUp size={18} className="text-[#0fbbce]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Historical Trends</h3>
                  <p className="text-sm text-blue-200">365-day analysis</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-1 bg-[#0fbbce]/10 p-2 rounded-lg">
                  <Clock size={18} className="text-[#0fbbce]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Transfer Times</h3>
                  <p className="text-sm text-blue-200">Accurate delivery estimates</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Link href="/compare">
                <Button size="lg" className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium shadow-lg hover:shadow-xl transition-all border-0">
                  Compare Rates Now
                </Button>
              </Link>
              <Link href="/trends">
                <Button size="lg" variant="outline" className="bg-transparent border-2 border-[#0fbbce] text-white hover:bg-[#0fbbce]/10 shadow-lg">
                  View Rate Trends
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Right content - Calculator widget */}
          <div className="lg:w-7/12">
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-2xl">
              <h2 className="text-xl font-semibold mb-4 text-center">Quick Rate Calculator</h2>
              <CurrencyCalculator />
              <div className="mt-4 text-center text-sm text-blue-200">
                <p className="flex items-center justify-center gap-1.5">
                  <RefreshCw size={14} /> 
                  <span>Rates last updated <span className="text-[#0fbbce] font-medium">today at 14:00 UTC</span></span>
                </p>
              </div>
            </div>
            
            {/* Provider badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 opacity-70">
              <div className="py-1.5 px-3 bg-white/5 rounded-full text-xs text-white/80">Western Union</div>
              <div className="py-1.5 px-3 bg-white/5 rounded-full text-xs text-white/80">Wise</div>
              <div className="py-1.5 px-3 bg-white/5 rounded-full text-xs text-white/80">MoneyGram</div>
              <div className="py-1.5 px-3 bg-white/5 rounded-full text-xs text-white/80">Remitly</div>
              <div className="py-1.5 px-3 bg-white/5 rounded-full text-xs text-white/80">WorldRemit</div>
              <div className="py-1.5 px-3 bg-white/5 rounded-full text-xs text-white/80">+ 7 more</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
