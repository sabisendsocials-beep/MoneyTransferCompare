import { useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownUp } from "lucide-react";

export const SimpleCalculator = () => {
  const [amount, setAmount] = useState<string>("1000");
  const [fromCurrency, setFromCurrency] = useState<string>("GBP");
  const [toCurrency, setToCurrency] = useState<string>("NGN");
  const [calculationMode] = useState<"send" | "receive">("send");
  
  // Format input with commas
  const formatInputWithCommas = (value: string): string => {
    const numericValue = value.replace(/[^\d.]/g, '');
    if (numericValue === '') return '';
    
    const parts = numericValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
  };
  
  // Calculate received amount based on rate (1523 NGN per GBP)
  const calculateReceivedAmount = (): string => {
    const rate = 1523; // Example mid-market rate
    const numericAmount = parseFloat(amount.replace(/,/g, ""));
    
    if (!isNaN(numericAmount)) {
      const result = numericAmount * rate;
      return formatInputWithCommas(Math.round(result).toString());
    }
    
    return "0";
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* You Send Section */}
      <div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">You Send</label>
          <div className="flex">
            <div className="w-24">
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="border-r-0 rounded-r-none bg-gray-50">
                  <SelectValue placeholder="GBP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={amount}
              onChange={(e) => {
                const formattedValue = formatInputWithCommas(e.target.value);
                setAmount(formattedValue);
              }}
              className="flex-1 rounded-l-none"
              placeholder="1000"
            />
          </div>
        </div>
      </div>
      
      {/* Recipient Gets Section */}
      <div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Recipient Gets</label>
          <div className="flex">
            <div className="w-24">
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="border-r-0 rounded-r-none bg-gray-50">
                  <SelectValue placeholder="NGN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="GHS">GHS</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={calculateReceivedAmount()}
              readOnly
              className="flex-1 rounded-l-none bg-gray-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};