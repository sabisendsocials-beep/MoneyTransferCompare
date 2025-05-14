import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Find the Best UK to Nigeria Money Transfer
            </h1>
            <p className="text-lg mb-6 text-blue-100">
              Compare rates, fees, and delivery times across multiple providers to get the most out of your money.
            </p>
            <div className="flex space-x-4">
              <Link href="/compare">
                <Button className="bg-white text-primary-600 hover:bg-gray-100">
                  Compare Now
                </Button>
              </Link>
              <Link href="/trends">
                <Button variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <svg
              className="w-full max-w-md"
              viewBox="0 0 600 400"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="50" y="100" width="200" height="150" rx="15" fill="#f0f0f0" />
              <text x="150" y="175" textAnchor="middle" dominantBaseline="middle" fontSize="50" fontWeight="bold" fill="#2563eb">£</text>
              <rect x="350" y="100" width="200" height="150" rx="15" fill="#f0f0f0" />
              <text x="450" y="175" textAnchor="middle" dominantBaseline="middle" fontSize="50" fontWeight="bold" fill="#2563eb">₦</text>
              <path d="M250 175 L350 175" stroke="#f0f0f0" strokeWidth="5" />
              <path d="M275 150 L325 175 L275 200" fill="#f0f0f0" />
              <circle cx="150" cy="310" r="30" fill="#f0f0f0" opacity="0.6" />
              <circle cx="450" cy="310" r="30" fill="#f0f0f0" opacity="0.6" />
              <rect x="120" y="290" width="60" height="40" rx="5" fill="#2563eb" />
              <rect x="420" y="290" width="60" height="40" rx="5" fill="#2563eb" />
              <text x="150" y="315" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="white">GBP</text>
              <text x="450" y="315" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="white">NGN</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
