import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowRightLeft, BarChart3, ShieldCheck, Compass, 
  RefreshCw, ArrowRight, CheckCircle2
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
      </div>

      <div className="max-w-full w-[98%] mx-auto px-2 pt-4 pb-6 md:pt-6 md:pb-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-5">
          {/* Left content */}
          <div className="lg:w-[45%]">
            <div className="inline-flex items-center gap-1.5 text-white bg-white/10 backdrop-blur-md rounded-full px-3 py-1 text-sm font-medium mb-2">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Verified rates from trusted providers</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3">
              Find the <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">best rates</span> for sending money globally
            </h1>
            
            <p className="text-base text-blue-100 mb-3 max-w-xl">
              Our platform compares exchange rates from 12+ trusted providers in real-time, 
              helping you save on fees and get more value in every international transfer.
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm">Real-time rates</p>
                  <p className="text-xs text-blue-200">Updated every 6 hours</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm">Historical data</p>
                  <p className="text-xs text-blue-200">365-day analysis</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm">Verified sources</p>
                  <p className="text-xs text-blue-200">Direct from providers</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Compass size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm">Global coverage</p>
                  <p className="text-xs text-blue-200">Multi-country support</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Link href="/compare">
                <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 text-white font-medium h-9 text-sm">
                  Compare All Providers
                  <ArrowRight size={14} className="ml-1.5" />
                </Button>
              </Link>
              <Link href="/trends">
                <Button variant="outline" className="border-2 border-white/30 text-white bg-white/5 hover:bg-white/10 h-9 text-sm">
                  View Rate Trends
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Right content - Calculator */}
          <div className="lg:w-[55%] w-full">
            <div className="bg-white/15 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-[0_0_45px_rgba(8,107,230,0.15)]">
              <h2 className="text-lg text-white font-semibold mb-3 text-center">Quick Rate Calculator</h2>
              
              <CurrencyCalculator />
              
              {/* Combined CTA and provider section for more compact design */}
              <div className="mt-3 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="md:order-2">
                  <Link href="/compare">
                    <Button className="bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 border-0 text-white font-medium px-5 h-9 text-sm">
                      Get Best Rate Now
                      <ArrowRight size={14} className="ml-1.5" />
                    </Button>
                  </Link>
                </div>
                
                <div className="flex items-center md:order-1 text-xs text-blue-200">
                  <RefreshCw size={10} className="mr-1" /> 
                  <span>Updated today at 14:00 UTC</span>
                </div>
              </div>
              
              {/* Provider logos */}
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                <div className="py-0.5 px-2 rounded-full text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">Western Union</div>
                <div className="py-0.5 px-2 rounded-full text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">Wise</div>
                <div className="py-0.5 px-2 rounded-full text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">MoneyGram</div>
                <div className="py-0.5 px-2 rounded-full text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">+9 more</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
