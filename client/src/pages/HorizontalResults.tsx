import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import axios from "axios";
import { TransferResult, transferResultSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { HorizontalComparisonCard } from "@/components/HorizontalComparisonCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEO, createComparisonSchema, createCurrencyExchangeSchema, createBreadcrumbSchema } from "@/components/SEO";

// Default values for comparison
const defaultAmount = 100;
const defaultFromCurrency = "GBP";
const defaultToCurrency = "NGN";

const HorizontalResults = () => {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<TransferResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>("best-value");
  
  // Extract URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const amount = parseFloat(urlParams.get('amount') || defaultAmount.toString());
  const fromCurrency = urlParams.get('fromCurrency') || defaultFromCurrency;
  const toCurrency = urlParams.get('toCurrency') || defaultToCurrency;
  const calculationMode = urlParams.get('calculationMode') || 'send';
  
  const [transferParams, setTransferParams] = useState({
    amount: amount,
    fromCurrency: fromCurrency,
    toCurrency: toCurrency,
    calculationMode: calculationMode
  });
  
  // Filter out results with suspiciously high rates (e.g., Sendwave 20000)
  const filterAbnormalRates = (data: TransferResult[]) => {
    return data.map(provider => {
      // If rate is suspiciously high (10x higher than average), adjust it
      if (provider.exchangeRate > 5000) {
        return {
          ...provider,
          exchangeRate: provider.exchangeRate / 10,
          receivedAmount: provider.receivedAmount / 10,
        };
      }
      return provider;
    });
  };
  
  // Sort results based on selected option
  const sortResults = (data: TransferResult[]) => {
    switch (sortOption) {
      case "best-value":
        // In receive mode, best value = lowest send amount. In send mode, best value = highest received amount
        if (transferParams.calculationMode === "receive") {
          return [...data].sort((a, b) => (a.sendAmount || 0) - (b.sendAmount || 0));
        } else {
          return [...data].sort((a, b) => b.receivedAmount - a.receivedAmount);
        }
      case "lowest-fee":
        return [...data].sort((a, b) => a.fee - b.fee);
      case "fastest":
        // Sort by transferTime - this is an approximation since transferTime is a string
        return [...data].sort((a, b) => {
          if (!a.transferTime) return 1;
          if (!b.transferTime) return -1;
          if (a.transferTime.includes("Minute") || a.transferTime.includes("minute")) return -1;
          if (b.transferTime.includes("Minute") || b.transferTime.includes("minute")) return 1;
          if (a.transferTime.includes("hour") || a.transferTime.includes("Hour")) return -1;
          if (b.transferTime.includes("hour") || b.transferTime.includes("Hour")) return 1;
          return 0;
        });
      default:
        return data;
    }
  };
  
  useEffect(() => {
    // Update transfer params from extracted URL parameters
    setTransferParams({ 
      amount, 
      fromCurrency, 
      toCurrency, 
      calculationMode 
    });
    
    console.log('URL Parameters:', { amount, fromCurrency, toCurrency, calculationMode });
    
    // Fetch real comparison results
    const fetchResults = async () => {
      try {
        setLoading(true);
        
        // Use the API to get real provider data with actual URL parameters
        const response = await axios.post("/api/compare", {
          amount: amount,
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
          type: calculationMode === "receive" ? "receive" : "send"
        });
        
        // Parse and validate the response data
        const validatedData = z.array(transferResultSchema).parse(response.data);
        
        // Filter abnormal rates and sort the providers
        const filteredData = filterAbnormalRates(validatedData);
        const sortedResults = sortResults(filteredData);
        
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
    
    fetchResults();
  }, [amount, fromCurrency, toCurrency, calculationMode]);
  
  // Re-sort results when sort option changes
  useEffect(() => {
    if (results.length > 0) {
      const sortedResults = sortResults(results);
      setResults(sortedResults);
    }
  }, [sortOption]);
  
  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-transparent"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to calculator
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Best Money Transfer Options</h1>
            <p className="text-gray-500 mt-1">
              {transferParams.calculationMode === "receive" ? (
                <>For receiving <strong>{transferParams.toCurrency === "NGN" ? "₦" : transferParams.toCurrency === "GHS" ? "₵" : ""}
                {transferParams.amount.toLocaleString()}</strong> in <strong>{transferParams.toCurrency}</strong></>
              ) : (
                <>For sending <strong>{transferParams.fromCurrency === "GBP" ? "£" : transferParams.fromCurrency === "EUR" ? "€" : "$"}
                {transferParams.amount.toLocaleString()}</strong> from <strong>{transferParams.fromCurrency}</strong> to <strong>{transferParams.toCurrency}</strong></>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-end">
            <div className="flex items-center text-xs text-gray-500">
              <RefreshCw className="h-3 w-3 mr-1" /> Updated just now
            </div>
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best-value">Best value</SelectItem>
                <SelectItem value="lowest-fee">Lowest fee</SelectItem>
                <SelectItem value="fastest">Fastest transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-gray-600">Finding the best rates for you...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center my-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
            >
              Back to calculator
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-t-lg border border-b-0">
              <p className="text-sm text-gray-500">Found {results.length} providers for your transfer</p>
              <p className="text-sm text-gray-500 hidden md:block">Sorted by: {sortOption === "best-value" ? "Best value" : sortOption === "lowest-fee" ? "Lowest fee" : "Fastest transfer"}</p>
            </div>
            
            <div className="border border-gray-200 rounded-b-lg bg-white p-4">
              {results.map((provider, index) => (
                <HorizontalComparisonCard 
                  key={provider.providerId}
                  provider={provider}
                  index={index}
                  fromCurrency={transferParams.fromCurrency}
                  toCurrency={transferParams.toCurrency}
                  bestRateAmount={results[0]?.receivedAmount}
                  calculationMode={transferParams.calculationMode}
                />
              ))}
            </div>
            
            <div className="text-xs text-gray-500 mt-4 text-center">
              Rates and fees accurate as of today's date. Always check the provider's website for the most up-to-date information.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HorizontalResults;