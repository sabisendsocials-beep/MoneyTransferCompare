import { useState } from "react";
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

const CurrencyCalculator = () => {
  const [amount, setAmount] = useState<string>("1000");
  const [fromCurrency, setFromCurrency] = useState<string>("GBP");
  const [toCurrency, setToCurrency] = useState<string>("NGN");
  const [result, setResult] = useState<number | null>(null);

  // Sample current exchange rates (would come from API in real implementation)
  const exchangeRates = {
    "GBP-NGN": 2166.87,
    "GBP-GHS": 16.85,
    "EUR-NGN": 1354.45,
    "EUR-GHS": 14.37,
    "USD-NGN": 1456.78,
    "USD-GHS": 15.40
  };

  const calculateRate = () => {
    const key = `${fromCurrency}-${toCurrency}`;
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
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-white/80">You send</label>
            <Select
              value={fromCurrency}
              onValueChange={setFromCurrency}
            >
              <SelectTrigger className="w-[100px] bg-transparent border-0 text-white">
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
              className="bg-transparent border-0 text-2xl font-semibold text-white h-12 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="1,000"
            />
          </div>
        </div>

        {/* Convert button */}
        <div className="flex justify-center -my-2 z-10">
          <Button 
            onClick={calculateRate}
            size="sm" 
            className="rounded-full h-10 w-10 bg-[#0fbbce] hover:bg-[#0fbbce]/80 flex items-center justify-center p-0 shadow-lg border-4 border-[#1a365d]"
          >
            <ArrowRight size={16} />
          </Button>
        </div>

        {/* To currency */}
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-white/80">They receive</label>
            <Select
              value={toCurrency}
              onValueChange={setToCurrency}
            >
              <SelectTrigger className="w-[100px] bg-transparent border-0 text-white">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">NGN (₦)</SelectItem>
                <SelectItem value="GHS">GHS (₵)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold text-white">
              {result ? formatNumber(result) : "0.00"}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#0fbbce] hover:text-[#0fbbce]/80 p-0"
              onClick={calculateRate}
            >
              <RefreshCcw size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Exchange rate info */}
      <div className="mt-4 text-center">
        <p className="text-sm text-white/60">
          Exchange rate: <span className="text-white/90 font-medium">
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