import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SearchIcon, DollarSign, Shield } from "lucide-react";

const FeatureSection = () => {
  const features = [
    {
      icon: <SearchIcon className="h-6 w-6 text-primary" />,
      title: "Real-Time Comparisons",
      description: "We compare rates across multiple providers in real-time to ensure you always get the most up-to-date information."
    },
    {
      icon: <DollarSign className="h-6 w-6 text-primary" />,
      title: "Save on Every Transfer",
      description: "Our comparisons help you find the provider with the best rates and lowest fees, saving you money on every transaction."
    },
    {
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: "Secure and Trusted",
      description: "We only compare licensed and regulated money transfer providers to ensure your money is always secure."
    }
  ];

  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-b from-white to-blue-100 dark:from-gray-800 dark:to-gray-950" data-testid="features-section">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute -right-10 -top-10 w-80 h-80 rounded-full bg-blue-300 dark:bg-blue-700 filter blur-3xl"></div>
        <div className="absolute -left-20 top-1/2 w-80 h-80 rounded-full bg-indigo-400 dark:bg-indigo-700 filter blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Why Choose Our Comparison Service
          </h2>
          <p className="text-gray-700 dark:text-gray-300 text-lg">
            We help you find the most cost-effective way to send money internationally
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="feature-card bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white h-16 w-16 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                {feature.icon}
              </div>
              <h3 className="font-bold text-xl mb-4 text-gray-800 dark:text-white text-center">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20 bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-xl border border-gray-100 dark:border-gray-700 max-w-4xl mx-auto relative">
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white h-12 w-12 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-800">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <h3 className="font-bold text-2xl mb-4 text-gray-800 dark:text-white">
            Ready to find the best transfer option?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8 text-lg">
            Compare rates from multiple providers and start saving on your international transfers today.
          </p>
          <Link href="/compare">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-white px-8 py-6 text-lg font-semibold shadow-lg">
              Start Comparing Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
