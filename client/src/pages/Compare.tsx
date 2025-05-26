import { useState } from "react";
import { Helmet } from "react-helmet";
import TransferCalculator from "@/components/TransferCalculator";
import ComparisonResults from "@/components/ComparisonResults";
import { TransferResult } from "@shared/schema";

const Compare = () => {
  const [comparisonResults, setComparisonResults] = useState<TransferResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleComparisonResults = (results: TransferResult[]) => {
    setComparisonResults(results);
    setShowResults(true);
  };

  return (
    <>
      <Helmet>
        <title>Compare Money Transfer Options - UK to Nigeria | SabiSend</title>
        <meta 
          name="description" 
          content="Compare the best money transfer options from UK to Nigeria. Find the lowest fees, best exchange rates and fastest delivery times."
        />
      </Helmet>
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4 text-center">Compare UK to Nigeria Money Transfers</h1>
          <p className="text-center text-blue-100 max-w-2xl mx-auto">
            Find the best exchange rates, lowest fees, and fastest transfer times for sending money from the UK to Nigeria.
          </p>
        </div>
      </div>
      
      <TransferCalculator onCompare={handleComparisonResults} />
      <ComparisonResults results={comparisonResults} visible={showResults} />
      
      {!showResults && (
        <div className="py-20 bg-gray-50 dark:bg-gray-900 text-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">How to Compare Money Transfers</h2>
              <ol className="space-y-6 text-left">
                <li className="flex">
                  <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center mr-3 text-white font-bold">1</span>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Enter your transfer amount</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Choose whether you want to specify how much you'll send or how much you want the recipient to receive.
                    </p>
                  </div>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center mr-3 text-white font-bold">2</span>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Compare providers</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      We'll show you a list of providers with their exchange rates, fees, and total costs.
                    </p>
                  </div>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center mr-3 text-white font-bold">3</span>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Choose the best option</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Select the provider that offers the best value for your needs and complete your transfer.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Compare;
