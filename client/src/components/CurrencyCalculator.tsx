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
import { ArrowRight, RefreshCcw } from "lucide-react";

type CurrencyCode = "GBP" | "EUR" | "USD" | "NGN" | "GHS";
type RateKey = `${CurrencyCode}-${CurrencyCode}`;

const CurrencyCalculator = () => {
  const [amount, setAmount] = useState<string>("1000");
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("GBP");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("NGN");
  
  // Type-safe setters for the select components
  const handleSetFromCurrency = (value: string) => {
    setFromCurrency(value as CurrencyCode);
  };
  
  const handleSetToCurrency = (value: string) => {
    setToCurrency(value as CurrencyCode);
  };
  const [result, setResult] = useState<number | null>(null);

  // Sample current exchange rates (would come from API in real implementation)
  const exchangeRates: Record<RateKey, number> = {
    "GBP-NGN": 2166.87,
    "GBP-GHS": 16.85,
    "EUR-NGN": 1354.45,
    "EUR-GHS": 14.37,
    "USD-NGN": 1456.78,
    "USD-GHS": 15.40
  } as Record<RateKey, number>;

  useEffect(() => {
    // Calculate on initial render
    calculateRate();
  }, []);

  const calculateRate = () => {
    const key = `${fromCurrency}-${toCurrency}` as RateKey;
    if (exchangeRates[key]) {
      const numericAmount = parseFloat(amount.replace(/,/g, ""));
      if (!isNaN(numericAmount)) {
        setResult(numericAmount * exchangeRates[key]);
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

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-4">
        {/* From currency */}
        <div className="bg-white/10 rounded-lg p-4 lg:mx-auto lg:w-3/4 hover:bg-white/15 transition-colors">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-white/90 font-medium">You Send</label>
            <Select
              value={fromCurrency}
              onValueChange={handleSetFromCurrency}
            >
              <SelectTrigger className="w-[100px] bg-transparent border-0 text-white hover:bg-white/10 transition-colors">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent border-0 text-3xl font-semibold text-white h-12 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="1,000"
            />
          </div>
        </div>

        {/* Convert button */}
        <div className="flex justify-center -my-2 z-10">
          <Button 
            onClick={calculateRate}
            className="rounded-full h-14 w-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 flex items-center justify-center p-0 shadow-lg border-2 border-indigo-900 hover:scale-110 transition-all"
          >
            <ArrowRight size={20} />
          </Button>
        </div>

        {/* To currency */}
        <div className="bg-white/10 rounded-lg p-4 lg:mx-auto lg:w-3/4 hover:bg-white/15 transition-colors">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-white/90 font-medium">They Receive</label>
            <Select
              value={toCurrency}
              onValueChange={handleSetToCurrency}
            >
              <SelectTrigger className="w-[100px] bg-transparent border-0 text-white hover:bg-white/10 transition-colors">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">NGN (₦)</SelectItem>
                <SelectItem value="GHS">GHS (₵)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-white bg-gradient-to-r from-white to-white/90 bg-clip-text py-1">
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
          Exchange rate: <span className="text-emerald-300 font-medium">
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