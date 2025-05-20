import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowRightLeft, BarChart3, ShieldCheck, Compass, 
  RefreshCw, ArrowRight, CheckCircle2
} from "lucide-react";
import TransferCalculator from "../components/TransferCalculator";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Hero background with gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-purple-950">
        <div className="absolute inset-0 opacity-30" 
          style={{
            backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.15) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.15) 2%, transparent 0%)",
            backgroundSize: "100px 100px"
          }}>
        </div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 L100,0 L100,5 Q50,40 0,5 Z" fill="white" />
            <path d="M0,95 L100,95 L100,100 Q50,60 0,100 Z" fill="white" />
            <path d="M0,30 L100,20 L100,25 Q50,35 0,25 Z" fill="white" opacity="0.5" />
            <path d="M0,65 L100,75 L100,80 Q50,70 0,80 Z" fill="white" opacity="0.5" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-14 pb-12 md:pt-28 md:pb-24 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left content */}
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-1.5 text-white bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Verified rates from trusted providers</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
              Find the <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">best rates</span> for sending money globally
            </h1>
            
            <p className="text-lg text-blue-100 mb-8 max-w-xl">
              Our platform compares exchange rates from 12+ trusted providers in real-time, 
              helping you save on fees and get more value in every international transfer.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-10 md:pr-8">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <p className="font-medium">Real-time rates</p>
                  <p className="text-sm text-blue-200">Updated every 6 hours</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="font-medium">Historical data</p>
                  <p className="text-sm text-blue-200">365-day analysis</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-medium">Verified sources</p>
                  <p className="text-sm text-blue-200">Direct from providers</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Compass size={20} />
                </div>
                <div>
                  <p className="font-medium">Global coverage</p>
                  <p className="text-sm text-blue-200">Multi-country support</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Link href="/compare">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 text-white font-medium">
                  Compare All Providers
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link href="/trends">
                <Button size="lg" variant="outline" className="border-2 border-white/30 text-white bg-white/5 hover:bg-white/10">
                  View Rate Trends
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Right content - Calculator */}
          <div className="lg:w-1/2 w-full">
            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-white/20 shadow-[0_0_45px_rgba(8,107,230,0.15)]">
              <h2 className="text-xl text-white font-semibold mb-6">Quick Rate Comparison</h2>
              
              <TransferCalculator onCompare={() => {}} />
              
              {/* Provider logos */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-200">Trusted Providers</span>
                  <span className="text-xs text-blue-300 flex items-center">
                    <RefreshCw size={12} className="mr-1.5" />
                    Last updated today at 10:00 UTC
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="py-1.5 px-3 rounded-md text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">Western Union</div>
                  <div className="py-1.5 px-3 rounded-md text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">Wise</div>
                  <div className="py-1.5 px-3 rounded-md text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">MoneyGram</div>
                  <div className="py-1.5 px-3 rounded-md text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">Remitly</div>
                  <div className="py-1.5 px-3 rounded-md text-xs text-white/90 font-medium bg-gradient-to-br from-white/10 to-white/5">+8 more</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
