import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowRightLeft, BarChart3, ShieldCheck, Compass, 
  RefreshCw, ArrowRight, CheckCircle2, Globe, Sparkles
} from "lucide-react";
import CurrencyCalculator from "../components/CurrencyCalculator";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Hero background with gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-800">
        <div className="absolute inset-0 opacity-30" 
          style={{
            backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.15) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.15) 2%, transparent 0%)",
            backgroundSize: "100px 100px"
          }}>
        </div>
        {/* Lighter gradient overlay toward the calculator area */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-r from-transparent to-white/10"></div>
        {/* Subtle glow effects */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-emerald-500/10 filter blur-3xl"></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 filter blur-3xl"></div>
      </div>

      {/* Main hero section - more compact for mobile */}
      <div className="max-w-full w-[94%] mx-auto px-2 pt-6 pb-4 md:pt-8 md:pb-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
          {/* Left content - More compact for mobile */}
          <div className="lg:w-3/5">
            <div className="inline-flex items-center gap-1.5 text-white bg-white/10 backdrop-blur-md rounded-full px-3 py-1 text-sm font-medium mb-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Verified rates from trusted providers</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3">
              Find the <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">best rates</span> for sending money globally
            </h1>
            
            <p className="text-base md:text-lg text-blue-100 mb-4 max-w-2xl">
              Our platform compares exchange rates from 12+ trusted providers in real-time, 
              helping you save on fees and get more value in every international transfer.
            </p>
            
            <div className="flex flex-wrap gap-3 mt-2 mb-2">
              <Link href="/compare">
                <Button size="default" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 text-white font-medium shadow-lg hover:scale-105 transition-transform">
                  Compare All Providers
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link href="/trends">
                <Button size="default" variant="outline" className="border-2 border-white/30 text-white bg-white/5 hover:bg-white/10 shadow-md hover:border-white/50 transition-colors">
                  View Rate Trends
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Right content - Calculator (smaller) */}
          <div className="lg:w-2/5 w-full">
            <div className="bg-white/15 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/20 shadow-[0_0_60px_rgba(8,107,230,0.25)] hover:shadow-[0_0_70px_rgba(8,107,230,0.3)] transition-all">
              <h2 className="text-lg text-white font-semibold mb-3 text-center">Quick Calculator</h2>
              
              <CurrencyCalculator />
              
              {/* CTA Button */}
              <div className="mt-4 text-center">
                <Link href="/results">
                  <Button 
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 border-0 text-white font-medium w-full py-2 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all text-base group"
                  >
                    <span className="inline-flex items-center">
                      <span className="mr-1.5 text-yellow-200 group-hover:animate-pulse">✨</span> 
                      Get Best Rate Now
                      <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>
                
                <div className="flex items-center justify-center mt-2 text-xs text-blue-200">
                  <RefreshCw size={12} className="mr-1.5 text-emerald-400" /> 
                  <span>Updated today at <span className="text-emerald-400 font-medium">14:00 UTC</span></span>
                </div>
              </div>
              
              {/* Provider logos */}
              <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2 justify-center">
                <div className="py-1 px-2.5 rounded-full text-xs text-white/90 font-medium bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 cursor-pointer transition-all shadow-sm">Western Union</div>
                <div className="py-1 px-2.5 rounded-full text-xs text-white/90 font-medium bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 cursor-pointer transition-all shadow-sm">Wise</div>
                <div className="py-1 px-2.5 rounded-full text-xs text-white/90 font-medium bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 cursor-pointer transition-all shadow-sm">+10 more</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features section - Moved below hero for better mobile experience */}
      <div className="max-w-full w-[94%] mx-auto px-2 py-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3.5 hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/10 shadow-md hover:shadow-lg">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center shadow-lg">
                <RefreshCw size={22} className="text-white" />
              </div>
              <div className="bg-blue-400/10 rounded-full px-2 py-0.5 text-xs text-blue-200">Updated multiple times daily</div>
            </div>
            <h3 className="font-semibold text-lg text-white mb-1">Real-Time Rates</h3>
            <p className="text-sm text-blue-200">Get the most current exchange rates directly from provider sources</p>
          </div>
          
          <div className="group bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3.5 hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/10 shadow-md hover:shadow-lg">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
                <ShieldCheck size={22} className="text-white" />
              </div>
              <div className="bg-emerald-400/10 rounded-full px-2 py-0.5 text-xs text-emerald-200">12+ verified services</div>
            </div>
            <h3 className="font-semibold text-lg text-white mb-1">Trusted Providers</h3>
            <p className="text-sm text-blue-200">Compare rates from legitimate and verified money transfer services</p>
          </div>
          
          <div className="group bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3.5 hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/10 shadow-md hover:shadow-lg">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-lg">
                <BarChart3 size={22} className="text-white" />
              </div>
              <div className="bg-purple-400/10 rounded-full px-2 py-0.5 text-xs text-purple-200">Full year analysis</div>
            </div>
            <h3 className="font-semibold text-lg text-white mb-1">Rate History & Trends</h3>
            <p className="text-sm text-blue-200">Track historical rate patterns to time your transfers optimally</p>
          </div>
          
          <div className="group bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3.5 hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/10 shadow-md hover:shadow-lg">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                <Globe size={22} className="text-white" />
              </div>
              <div className="bg-amber-400/10 rounded-full px-2 py-0.5 text-xs text-amber-200">Multiple destinations</div>
            </div>
            <h3 className="font-semibold text-lg text-white mb-1">Multi-Currency Support</h3>
            <p className="text-sm text-blue-200">Send money to various countries and currencies worldwide</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
