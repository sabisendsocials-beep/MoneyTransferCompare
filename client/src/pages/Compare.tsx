import { useState } from "react";
import { Helmet } from "react-helmet";
import CurrencyCalculator from "@/components/CurrencyCalculator";
import ComparisonResults from "@/components/ComparisonResults";
import { TransferResult } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

const Compare = () => {
  const [comparisonResults, setComparisonResults] = useState<TransferResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [calculatorValues, setCalculatorValues] = useState({
    amount: "1000",
    fromCurrency: "GBP",
    toCurrency: "NGN",
    calculationMode: "send"
  });

  const handleComparisonResults = (results: TransferResult[]) => {
    setComparisonResults(results);
    setShowResults(true);
  };

  const handleCalculatorChange = (values: { amount: string; fromCurrency: string; toCurrency: string; calculationMode?: string }) => {
    setCalculatorValues({
      ...values,
      calculationMode: values.calculationMode || "send"
    });
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
          <h1 className="text-3xl font-bold mb-4 text-center">Compare Money Transfer Options</h1>
          <p className="text-center text-blue-100 max-w-2xl mx-auto">
            Find the best exchange rates, lowest fees, and fastest transfer times for your international money transfers.
          </p>
        </div>
      </div>
      
      {/* Calculator Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Transfer Calculator</h2>
            
            <CurrencyCalculator onValuesChange={handleCalculatorChange} />
            
            <div className="mt-6 text-center">
              <Link href={`/results?amount=${calculatorValues.amount.replace(/,/g, '')}&from=${calculatorValues.fromCurrency}&to=${calculatorValues.toCurrency}&mode=${calculatorValues.calculationMode}`}>
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium w-full py-3 shadow-lg hover:shadow-xl transition-all text-lg"
                >
                  Compare All Providers
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
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
