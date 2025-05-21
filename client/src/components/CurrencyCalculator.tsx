import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, RefreshCcw, ArrowDownUp, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type CurrencyCode = "GBP" | "EUR" | "USD" | "NGN" | "GHS";
type RateKey = `${CurrencyCode}-${CurrencyCode}`;
type CalculationMode = "send" | "receive";

const CurrencyCalculator = () => {
  const [amount, setAmount] = useState<string>("100");
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("GBP");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("NGN");
  const [calculationMode, setCalculationMode] = useState<CalculationMode>("send");
  const [result, setResult] = useState<number | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<RateKey, number>>({} as Record<RateKey, number>);
  
  // Fetch the latest exchange rates from the API
  const { data: rateStats, isLoading: isLoadingRates } = useQuery({ 
    queryKey: ['/api/rate-stats'],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useEffect(() => {
    // Update exchange rates when stats are loaded
    if (rateStats) {
      const rates: Record<RateKey, number> = {
        "GBP-NGN": rateStats.currentRate || 2166.87,
        "GBP-GHS": 16.85,
        "EUR-NGN": 1354.45,
        "EUR-GHS": 14.37,
        "USD-NGN": 1456.78,
        "USD-GHS": 15.40
      } as Record<RateKey, number>;
      
      setExchangeRates(rates);
    }
  }, [rateStats]);
  
  // Format input with commas
  const formatInputWithCommas = (value: string): string => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // If empty after cleaning, return empty
    if (numericValue === '') return '';
    
    // Split by decimal point
    const parts = numericValue.split('.');
    
    // Format the integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Return with or without decimal part
    return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
  };
  
  // Type-safe setters for the select components
  const handleSetFromCurrency = (value: string) => {
    setFromCurrency(value as CurrencyCode);
    calculateRate();
  };
  
  const handleSetToCurrency = (value: string) => {
    setToCurrency(value as CurrencyCode);
    calculateRate();
  };

  useEffect(() => {
    // Calculate on initial render
    calculateRate();
  }, []);

  const calculateRate = () => {
    const key = `${fromCurrency}-${toCurrency}` as RateKey;
    const rate = exchangeRates[key];
    
    if (rate) {
      const numericAmount = parseFloat(amount.replace(/,/g, ""));
      if (!isNaN(numericAmount)) {
        if (calculationMode === "send") {
          // When sending, multiply by exchange rate to get received amount
          setResult(numericAmount * rate);
        } else {
          // When receiving, divide by exchange rate to get sent amount
          // For 100,000 NGN with rate of 2166.87, it should be 100,000 / 2166.87 = 46.15
          setResult(numericAmount / rate);
        }
      }
    }
  };

  // Toggle between send and receive calculation modes
  const toggleCalculationMode = () => {
    // Get the current rate based on currency pair
    const key = `${fromCurrency}-${toCurrency}` as RateKey;
    const rate = exchangeRates[key];
    
    if (!rate) return; // Don't proceed if no rate is available
    
    // Get clean numeric amount from input
    const numericAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numericAmount)) return;
    
    // Switch the calculation mode
    const newMode = calculationMode === "send" ? "receive" : "send";
    setCalculationMode(newMode);
    
    // For simple toggle, just swap input and output
    if (calculationMode === "send") {
      // Switching from Send to Receive mode
      if (result !== null) {
        // Use the current calculated result as the new input
        setAmount(formatInputWithCommas(Math.round(result).toString()));
        // The new result should be the original input
        setResult(numericAmount);
      } else {
        // Calculate fresh based on rate: GBP → NGN
        const ngnAmount = numericAmount * rate;
        setAmount(formatInputWithCommas(Math.round(ngnAmount).toString()));
        setResult(numericAmount);
      }
    } else {
      // Switching from Receive to Send mode
      if (result !== null) {
        // Use the current calculated result as the new input
        // For GBP amounts, show with 2 decimal places
        setAmount(formatInputWithCommas(result.toFixed(2)));
        // The new result should be the original input
        setResult(numericAmount);
      } else {
        // Calculate fresh based on rate: NGN → GBP
        const gbpAmount = numericAmount / rate;
        setAmount(formatInputWithCommas(gbpAmount.toFixed(2)));
        setResult(numericAmount);
      }
    }
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Determine which is input and which is output based on mode
  const inputCurrency = calculationMode === "send" ? fromCurrency : toCurrency;
  const outputCurrency = calculationMode === "send" ? toCurrency : fromCurrency;
  const inputLabel = calculationMode === "send" ? "You Send" : "They Receive";
  const outputLabel = calculationMode === "send" ? "They Receive" : "You Send";

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-4">
        {/* Input amount */}
        <div className="bg-white/10 rounded-lg p-4 lg:mx-auto lg:w-3/4 hover:bg-white/15 transition-colors">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-white/90 font-medium">{inputLabel}</label>
            <Select
              value={calculationMode === "send" ? fromCurrency : toCurrency}
              onValueChange={calculationMode === "send" ? handleSetFromCurrency : handleSetToCurrency}
            >
              <SelectTrigger className="w-[100px] bg-transparent border-0 text-white hover:bg-white/10 transition-colors">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {calculationMode === "send" ? (
                  <>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                    <SelectItem value="GHS">GHS (₵)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Input
              value={amount}
              onChange={(e) => {
                // Format with commas and update state
                const formattedValue = formatInputWithCommas(e.target.value);
                setAmount(formattedValue);
                setTimeout(calculateRate, 0);
              }}
              className="bg-transparent border-0 text-4xl font-semibold text-white h-14 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="100"
            />
          </div>
        </div>

        {/* Mode toggle button */}
        <div className="flex justify-center -my-2 z-10">
          <Button 
            onClick={toggleCalculationMode}
            className="rounded-full h-12 w-12 bg-purple-600 hover:bg-purple-500 flex items-center justify-center p-0 shadow-lg border-2 border-indigo-900 hover:scale-110 transition-all"
            title="Switch between Send and Receive calculation modes"
          >
            <ArrowDownUp size={18} />
          </Button>
        </div>

        {/* Output amount */}
        <div className="bg-white/10 rounded-lg p-4 lg:mx-auto lg:w-3/4 hover:bg-white/15 transition-colors">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-white/90 font-medium">{outputLabel}</label>
            <Select
              value={calculationMode === "send" ? toCurrency : fromCurrency}
              onValueChange={calculationMode === "send" ? handleSetToCurrency : handleSetFromCurrency}
            >
              <SelectTrigger className="w-[100px] bg-transparent border-0 text-white hover:bg-white/10 transition-colors">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {calculationMode === "send" ? (
                  <>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                    <SelectItem value="GHS">GHS (₵)</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-white via-emerald-200 to-white/90 bg-clip-text py-1">
              {result ? formatNumber(result) : "0.00"}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-emerald-400 hover:text-emerald-300 p-0 hover:scale-110 transition-transform"
              onClick={calculateRate}
            >
              <RefreshCcw size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Exchange rate info */}
      <div className="mt-4 text-center bg-white/5 py-2 px-3 rounded-lg">
        <p className="text-sm text-white/90">
          Best rate available: <span className="text-emerald-300 font-medium">
            {fromCurrency && toCurrency && exchangeRates[`${fromCurrency}-${toCurrency}`] ? 
              `1 ${fromCurrency} = ${formatNumber(exchangeRates[`${fromCurrency}-${toCurrency}`])} ${toCurrency}` : 
              "Select currencies"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default CurrencyCalculator;