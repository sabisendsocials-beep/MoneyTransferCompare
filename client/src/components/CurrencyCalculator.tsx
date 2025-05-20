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
      <div className="grid grid-cols-1 gap-5">
        {/* From currency */}
        <div className="bg-white/10 rounded-lg p-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-white/80 font-medium">You Send</label>
            <Select
              value={fromCurrency}
              onValueChange={setFromCurrency}
            >
              <SelectTrigger className="w-[110px] bg-transparent border-0 text-white">
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
              className="bg-transparent border-0 text-3xl font-semibold text-white h-14 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="1,000"
            />
          </div>
        </div>

        {/* Convert button */}
        <div className="flex justify-center -my-3 z-10">
          <Button 
            onClick={calculateRate}
            size="sm" 
            className="rounded-full h-12 w-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 flex items-center justify-center p-0 shadow-lg border-4 border-indigo-900"
          >
            <ArrowRight size={18} />
          </Button>
        </div>

        {/* To currency */}
        <div className="bg-white/10 rounded-lg p-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-white/80 font-medium">They Receive</label>
            <Select
              value={toCurrency}
              onValueChange={setToCurrency}
            >
              <SelectTrigger className="w-[110px] bg-transparent border-0 text-white">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">NGN (₦)</SelectItem>
                <SelectItem value="GHS">GHS (₵)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-semibold text-white">
              {result ? formatNumber(result) : "0.00"}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-emerald-400 hover:text-emerald-300 p-0"
              onClick={calculateRate}
            >
              <RefreshCcw size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Exchange rate info */}
      <div className="mt-4 text-center">
        <p className="text-sm text-white/80">
          Exchange rate: <span className="text-white font-medium">
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