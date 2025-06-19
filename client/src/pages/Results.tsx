import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import axios from "axios";
import EnhancedComparisonResults from "@/components/EnhancedComparisonResults";
import { TransferResult, transferResultSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2 } from "lucide-react";

// Default values for comparison
const defaultAmount = 100;
const defaultFromCurrency = "GBP";
const defaultToCurrency = "NGN";

const Results = () => {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<TransferResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferParams, setTransferParams] = useState({
    amount: defaultAmount,
    fromCurrency: defaultFromCurrency,
    toCurrency: defaultToCurrency
  });

  // Currency symbol mapping
  const getCurrencySymbol = (currencyCode: string): string => {
    const symbols: { [key: string]: string } = {
      'GBP': '£',
      'EUR': '€',
      'USD': '$',
      'NGN': '₦',
      'KES': 'KSh',
      'GHS': '₵',
      'INR': '₹',
      'PKR': '₨'
    };
    return symbols[currencyCode] || currencyCode;
  };
  
  useEffect(() => {
    // Get URL parameters from calculator FIRST
    const urlParams = new URLSearchParams(window.location.search);
    console.log('Raw URL search:', window.location.search);
    console.log('All URL params:', Object.fromEntries(urlParams.entries()));
    
    const amountParam = urlParams.get('amount');
    console.log('Amount param from URL:', amountParam);
    
    const amount = amountParam ? parseFloat(amountParam) : defaultAmount;
    // Support both parameter formats for compatibility
    const fromCurrency = urlParams.get('fromCurrency') || urlParams.get('from') || defaultFromCurrency;
    const toCurrency = urlParams.get('toCurrency') || urlParams.get('to') || defaultToCurrency;
    
    // Store parameters for display IMMEDIATELY
    setTransferParams({ amount, fromCurrency, toCurrency });
    
    console.log('URL Parameters:', { amount, fromCurrency, toCurrency });
    console.log('Full URL:', window.location.href);
    
    // Fetch real comparison results with explicit parameter values
    const fetchResults = async (amountValue: number, fromValue: string, toValue: string) => {
      try {
        setLoading(true);
        
        // Use the API to get real provider data with the exact URL parameters
        console.log('Making API call with explicit values:', { 
          amount: amountValue, 
          fromCurrency: fromValue, 
          toCurrency: toValue 
        });
        const response = await axios.post('/api/compare', {
          amount: amountValue,
          fromCurrency: fromValue,
          toCurrency: toValue,
          type: "send"
        });
        
        // Parse and validate the response data
        const validatedData = z.array(transferResultSchema).parse(response.data);
        
        // Sort providers by received amount (best rate first)
        const sortedResults = validatedData.sort((a, b) => b.receivedAmount - a.receivedAmount);
        
        setResults(sortedResults);
        setError(null);
      } catch (err) {
        console.error("Error fetching comparison results:", err);
        setError("Unable to fetch provider comparison data. Please try again later.");
        
        // If API call fails, use a small set of default providers for demo purposes
        setResults([
          {
            providerId: 1,
            providerName: "Wise",
            providerLogo: "https://static.comparetransfer.com/logos/wise.png",
            exchangeRate: 2166.87,
            fee: 3.95,
            transferTime: "1-2 days",
            totalCost: 103.95,
            receivedAmount: 216687,
            sendAmount: 100,
            rateSource: "api",
            lastUpdated: new Date().toISOString(),
            rating: 4.7
          },
          {
            providerId: 2,
            providerName: "Western Union",
            providerLogo: "https://static.comparetransfer.com/logos/western-union.png",
            exchangeRate: 2145.33,
            fee: 2.90,
            transferTime: "Minutes",
            totalCost: 102.90,
            receivedAmount: 214533,
            sendAmount: 100,
            rateSource: "scraping",
            lastUpdated: new Date().toISOString(),
            rating: 4.2
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    // Call fetchResults with the actual parameter values
    fetchResults(amount, fromCurrency, toCurrency);
  }, []);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Best Money Transfer Options</h1>
      <p className="mb-8 text-gray-600">
        Comparing the best rates for sending <strong>{getCurrencySymbol(transferParams.fromCurrency)}{transferParams.amount.toFixed(2)}</strong> to <strong>{transferParams.toCurrency}</strong>
      </p>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-gray-600">Finding the best rates for you...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => setLocation("/")}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to calculator
          </button>
        </div>
      ) : (
        <>
          {/* Show comparison results */}
          <EnhancedComparisonResults 
            results={results} 
            visible={true} 
            fromCurrency={transferParams.fromCurrency}
            toCurrency={transferParams.toCurrency}
            amount={transferParams.amount}
          />
          
          {/* Back button */}
          <div className="mt-8 text-center">
            <button 
              onClick={() => setLocation("/")}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to calculator
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Results;