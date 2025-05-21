import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowRightLeft, BarChart3, ShieldCheck, Compass, 
  RefreshCw, ArrowRight, CheckCircle2, Globe, Sparkles
} from "lucide-react";
import CurrencyCalculator from "../components/CurrencyCalculator";

const HeroSection = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-800 py-6">
        {/* Hero background with gradient effect */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30" 
            style={{
              backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.15) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.15) 2%, transparent 0%)",
              backgroundSize: "100px 100px"
            }}>
          </div>
          {/* Subtle glow effects */}
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-emerald-500/10 filter blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 filter blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-12">
            {/* Left column - main messaging */}
            <div className="lg:w-1/2 mb-8 lg:mb-0">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">SabiSend</span> - Best Rates for Money Transfers
              </h1>
              
              <p className="text-xl text-blue-100 mb-6">
                SabiSend compares exchange rates from trusted providers in real time so you don't have to, 
                helping you save on fees and get best value in every international transfer.
              </p>
              
              {/* Desktop-only buttons */}
              <div className="hidden lg:flex space-x-4">
                <Link href="/compare">
                  <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 text-white font-medium shadow-lg hover:scale-105 transition-transform">
                    Compare All Providers
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                <Link href="/trends">
                  <Button size="lg" variant="outline" className="border-2 border-white/30 text-white bg-white/5 hover:bg-white/10 shadow-md hover:border-white/50 transition-colors">
                    View Rate Trends
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Right column - calculator */}
            <div className="lg:w-1/2">
              <div className="bg-white/15 backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-white/20 shadow-lg">
                <h2 className="text-lg text-white font-semibold mb-3 text-center">Quick Calculator</h2>
                
                <CurrencyCalculator />
                
                {/* CTA Button */}
                <div className="mt-4 text-center">
                  <Link href="/results">
                    <Button 
                      className="bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 border-0 text-white font-medium w-full py-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-lg group"
                    >
                      <span className="inline-flex items-center">
                        <span className="mr-1.5 text-yellow-200 group-hover:animate-pulse">✨</span> 
                        Get Best Rate Now
                        <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </Link>
                  
                  <div className="flex items-center justify-center mt-2 text-sm text-blue-200">
                    <RefreshCw size={14} className="mr-1.5 text-emerald-400" /> 
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
      </section>
      
      {/* Features section - with white background and clear separation */}
      <section className="bg-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl px-4 py-4 hover:shadow-lg transition-all duration-300 border border-blue-100 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center shadow-md">
                  <RefreshCw size={22} className="text-white" />
                </div>
                <div className="bg-blue-500/10 rounded-full px-2 py-0.5 text-xs text-blue-700 font-medium">Updated multiple times daily</div>
              </div>
              <h3 className="font-semibold text-lg text-blue-900 mb-1">Real-Time Rates</h3>
              <p className="text-sm text-blue-700">Get the most current exchange rates directly from provider sources</p>
            </div>
            
            <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-xl px-4 py-4 hover:shadow-lg transition-all duration-300 border border-green-100 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-md">
                  <ShieldCheck size={22} className="text-white" />
                </div>
                <div className="bg-emerald-500/10 rounded-full px-2 py-0.5 text-xs text-emerald-700 font-medium">12+ verified services</div>
              </div>
              <h3 className="font-semibold text-lg text-emerald-900 mb-1">Trusted Providers</h3>
              <p className="text-sm text-emerald-700">Compare rates from legitimate and verified money transfer services</p>
            </div>
            
            <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl px-4 py-4 hover:shadow-lg transition-all duration-300 border border-purple-100 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-md">
                  <BarChart3 size={22} className="text-white" />
                </div>
                <div className="bg-purple-500/10 rounded-full px-2 py-0.5 text-xs text-purple-700 font-medium">Full year analysis</div>
              </div>
              <h3 className="font-semibold text-lg text-purple-900 mb-1">Rate History & Trends</h3>
              <p className="text-sm text-purple-700">Track historical rate patterns to time your transfers optimally</p>
            </div>
            
            <div className="group bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl px-4 py-4 hover:shadow-lg transition-all duration-300 border border-amber-100 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md">
                  <Globe size={22} className="text-white" />
                </div>
                <div className="bg-amber-500/10 rounded-full px-2 py-0.5 text-xs text-amber-700 font-medium">Multiple destinations</div>
              </div>
              <h3 className="font-semibold text-lg text-amber-900 mb-1">Multi-Currency Support</h3>
              <p className="text-sm text-amber-700">Send money to various countries and currencies worldwide</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
