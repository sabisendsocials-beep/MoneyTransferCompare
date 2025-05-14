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
    <section className="py-12 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          Why Choose Our Comparison Service
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-6">
              <div className="bg-primary-100 dark:bg-primary-900/30 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-xl mb-2 text-gray-800 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gray-50 dark:bg-gray-700 rounded-xl p-8 text-center">
          <h3 className="font-semibold text-xl mb-4 text-gray-800 dark:text-white">
            Ready to find the best transfer option?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Compare rates from multiple providers and start saving on your international transfers today.
          </p>
          <Link href="/compare">
            <Button className="bg-primary hover:bg-primary/90 text-white px-6 py-6 text-lg">
              Start Comparing Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
