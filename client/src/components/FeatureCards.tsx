import { RefreshCw, ShieldCheck, BarChart3, Globe } from "lucide-react";

const FeatureCards = () => {
  return (
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
  );
};

export default FeatureCards;