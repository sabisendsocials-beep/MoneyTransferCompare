import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import ComparisonResults from "@/components/ComparisonResults";
import { TransferResult } from "@shared/schema";

// Sample provider results to display
const sampleResults: TransferResult[] = [
  {
    providerId: 1,
    providerName: "Wise",
    providerLogo: "/images/logos/wise.svg",
    exchangeRate: 2166.87,
    fee: 3.95,
    transferTime: "1-2 days",
    totalCost: 3.95,
    receivedAmount: 216687,
    sendAmount: 100,
    rateSource: "api",
    lastUpdated: new Date().toISOString()
  },
  {
    providerId: 2,
    providerName: "Western Union",
    providerLogo: "/images/logos/western-union.svg",
    exchangeRate: 2145.33,
    fee: 2.90,
    transferTime: "Minutes",
    totalCost: 2.90,
    receivedAmount: 214533,
    sendAmount: 100,
    rateSource: "scraping",
    lastUpdated: new Date().toISOString()
  },
  {
    providerId: 3,
    providerName: "MoneyGram",
    providerLogo: "/images/logos/moneygram.svg",
    exchangeRate: 2140.25,
    fee: 4.99,
    transferTime: "Same day",
    totalCost: 4.99,
    receivedAmount: 214025,
    sendAmount: 100,
    rateSource: "api",
    lastUpdated: new Date().toISOString()
  },
  {
    providerId: 4,
    providerName: "Remitly",
    providerLogo: "/images/logos/remitly.svg",
    exchangeRate: 2155.45,
    fee: 3.99,
    transferTime: "3-5 days",
    totalCost: 3.99,
    receivedAmount: 215545,
    sendAmount: 100,
    rateSource: "scraping",
    lastUpdated: new Date().toISOString()
  }
];

const Results = () => {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<TransferResult[]>([]);
  
  useEffect(() => {
    // In a real application, we would fetch results based on the calculator input
    // For now, we'll use sample data
    setResults(sampleResults);
  }, []);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Best Money Transfer Options</h1>
      <p className="mb-8 text-gray-600">
        Comparing the best rates for sending <strong>£100.00 GBP</strong> to <strong>Nigeria (NGN)</strong>
      </p>
      
      {/* Show comparison results */}
      <ComparisonResults results={results} visible={true} />
      
      {/* Back button */}
      <div className="mt-8 text-center">
        <button 
          onClick={() => setLocation("/")}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to calculator
        </button>
      </div>
    </div>
  );
};

export default Results;