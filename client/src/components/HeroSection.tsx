import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-[#1a365d] via-[#2563eb] to-[#1e40af] text-white py-16 shadow-lg relative overflow-hidden">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-repeat opacity-10" style={{ 
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
      }} />
      
      {/* Light effect */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              Find the Best <span className="text-yellow-300">International Money Transfers</span>
            </h1>
            <p className="text-lg mb-8 text-blue-100 max-w-xl">
              Compare rates, fees, and delivery times across multiple providers for transfers between UK, EU, US, Ghana, Nigeria and other countries.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/compare">
                <Button size="lg" className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 font-semibold shadow-lg hover:shadow-xl transition-all">
                  Compare Rates Now
                </Button>
              </Link>
              <Link href="/trends">
                <Button size="lg" variant="outline" className="bg-transparent border-2 border-blue-100 text-white hover:bg-blue-800 hover:border-blue-200 shadow-lg">
                  View Rate Trends
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <svg
              className="w-full max-w-md drop-shadow-2xl"
              viewBox="0 0 600 400"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Main comparison illustration */}
              <rect x="100" y="80" width="160" height="120" rx="15" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
              <text x="180" y="140" textAnchor="middle" dominantBaseline="middle" fontSize="40" fontWeight="bold" fill="#2563eb">£</text>
              
              <rect x="340" y="80" width="160" height="120" rx="15" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
              <text x="420" y="140" textAnchor="middle" dominantBaseline="middle" fontSize="40" fontWeight="bold" fill="#2563eb">₦</text>
              
              <path d="M260 140 L340 140" stroke="#94a3b8" strokeWidth="5" strokeDasharray="10,5" />
              <path d="M285 115 L335 140 L285 165" fill="#94a3b8" />
              
              {/* Multiple currency badges */}
              <g className="currency-badges">
                {/* Row 1 */}
                <rect x="80" y="240" width="60" height="40" rx="5" fill="#2563eb" />
                <text x="110" y="260" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="white" fontWeight="bold">GBP</text>
                
                <rect x="150" y="240" width="60" height="40" rx="5" fill="#3b82f6" />
                <text x="180" y="260" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="white" fontWeight="bold">EUR</text>
                
                <rect x="220" y="240" width="60" height="40" rx="5" fill="#2563eb" />
                <text x="250" y="260" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="white" fontWeight="bold">USD</text>

                {/* Row 2 */}
                <rect x="320" y="240" width="60" height="40" rx="5" fill="#3b82f6" />
                <text x="350" y="260" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="white" fontWeight="bold">NGN</text>
                
                <rect x="390" y="240" width="60" height="40" rx="5" fill="#2563eb" />
                <text x="420" y="260" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="white" fontWeight="bold">GHS</text>
                
                <rect x="460" y="240" width="60" height="40" rx="5" fill="#3b82f6" />
                <text x="490" y="260" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="white" fontWeight="bold">KES</text>
              </g>
              
              {/* Connection arrows */}
              <path d="M180 190 L180 230" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,3" />
              <path d="M420 190 L420 230" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,3" />
              
              {/* Add stars for highlighting */}
              <path d="M300 30 L310 50 L330 55 L315 70 L320 90 L300 80 L280 90 L285 70 L270 55 L290 50 Z" fill="#ffd700" opacity="0.8" />
              <path d="M80 170 L85 180 L95 182 L87 190 L90 200 L80 195 L70 200 L73 190 L65 182 L75 180 Z" fill="#ffd700" opacity="0.6" />
              <path d="M520 170 L525 180 L535 182 L527 190 L530 200 L520 195 L510 200 L513 190 L505 182 L515 180 Z" fill="#ffd700" opacity="0.6" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
