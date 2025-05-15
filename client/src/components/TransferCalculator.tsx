import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TransferRequest } from "@shared/schema";
import { useLocation } from "wouter";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";

type CalculatorProps = {
  onCompare: (results: any) => void;
};

type Currency = {
  code: string;
  name: string;
  symbol: string;
  flag: React.ReactNode;
};

const TransferCalculator = ({ onCompare }: CalculatorProps) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [sendAmount, setSendAmount] = useState<number>(1000);
  const [receiveAmount, setReceiveAmount] = useState<number>(1523000);
  const [fromCurrency, setFromCurrency] = useState<string>("GBP");
  const [toCurrency, setToCurrency] = useState<string>("NGN");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Currency options
  const sendCurrencies: Currency[] = [
    { 
      code: "GBP", 
      name: "British Pound", 
      symbol: "£",
      flag: (
        <div className="w-6 h-4 mr-2 bg-blue-600 relative overflow-hidden rounded">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1/3 bg-red-600 absolute top-0"></div>
            <div className="w-full h-1/3 bg-white absolute top-1/3"></div>
            <div className="w-full h-1/3 bg-blue-600 absolute top-2/3"></div>
          </div>
        </div>
      )
    },
    { 
      code: "EUR", 
      name: "Euro", 
      symbol: "€",
      flag: (
        <div className="w-6 h-4 mr-2 bg-blue-600 relative overflow-hidden rounded">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center justify-center">
              <div className="text-yellow-400 text-xs">€</div>
            </div>
          </div>
        </div>
      )
    },
    { 
      code: "USD", 
      name: "US Dollar", 
      symbol: "$",
      flag: (
        <div className="w-6 h-4 mr-2 bg-white relative overflow-hidden rounded border border-gray-200">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1/5 bg-red-600 absolute top-0"></div>
            <div className="w-full h-1/5 bg-red-600 absolute top-1/5"></div>
            <div className="w-full h-1/5 bg-white absolute top-2/5"></div>
            <div className="w-full h-1/5 bg-blue-600 absolute top-3/5"></div>
            <div className="w-full h-1/5 bg-blue-600 absolute top-4/5"></div>
          </div>
        </div>
      )
    }
  ];

  const receiveCurrencies: Currency[] = [
    { 
      code: "NGN", 
      name: "Nigerian Naira", 
      symbol: "₦",
      flag: (
        <div className="w-6 h-4 mr-2 bg-green-600 relative overflow-hidden rounded">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/3 h-full bg-green-600 absolute left-0"></div>
            <div className="w-1/3 h-full bg-white absolute left-1/3"></div>
            <div className="w-1/3 h-full bg-green-600 absolute left-2/3"></div>
          </div>
        </div>
      )
    },
    { 
      code: "GHS", 
      name: "Ghanaian Cedi", 
      symbol: "₵",
      flag: (
        <div className="w-6 h-4 mr-2 relative overflow-hidden rounded">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1/3 bg-red-600 absolute top-0"></div>
            <div className="w-full h-1/3 bg-yellow-400 absolute top-1/3"></div>
            <div className="w-full h-1/3 bg-green-600 absolute top-2/3 flex items-center justify-center">
              <div className="w-2 h-2 bg-black absolute"></div>
            </div>
          </div>
        </div>
      )
    },
    { 
      code: "KES", 
      name: "Kenyan Shilling", 
      symbol: "KSh",
      flag: (
        <div className="w-6 h-4 mr-2 bg-white relative overflow-hidden rounded border border-gray-200">
          <div className="absolute inset-0">
            <div className="w-full h-1/3 bg-black absolute top-0"></div>
            <div className="w-full h-1/3 bg-red-600 absolute top-1/3"></div>
            <div className="w-full h-1/3 bg-green-600 absolute top-2/3"></div>
          </div>
        </div>
      )
    }
  ];

  // Get exchange rate based on currency pair
  const getExchangeRate = (from: string, to: string): number => {
    const rates: Record<string, Record<string, number>> = {
      "GBP": { "NGN": 1523, "GHS": 17.8, "KES": 166.5 },
      "EUR": { "NGN": 1298, "GHS": 15.2, "KES": 142.3 },
      "USD": { "NGN": 1178, "GHS": 13.8, "KES": 129.5 }
    };
    
    return rates[from]?.[to] || 1;
  };

  // Update the rate when currencies change
  const currentRate = getExchangeRate(fromCurrency, toCurrency);

  const swapCurrencies = () => {
    // Instead of swapping currencies, toggle between 'send' and 'receive' tabs
    setActiveTab(activeTab === 'send' ? 'receive' : 'send');
    
    // Recalculate the amounts based on the new active tab
    if (activeTab === 'send') {
      // Switching to 'receive' tab
      const newSendAmount = parseFloat((receiveAmount / currentRate).toFixed(2));
      setSendAmount(newSendAmount);
    } else {
      // Switching to 'send' tab
      const newReceiveAmount = Math.round(sendAmount * currentRate);
      setReceiveAmount(newReceiveAmount);
    }
  };

  const compareMutation = useMutation({
    mutationFn: async (data: TransferRequest) => {
      const response = await apiRequest('POST', '/api/compare', data);
      return await response.json();
    },
    onSuccess: (data) => {
      setIsLoading(false);
      onCompare(data);
      
      // Scroll to results
      const resultsSection = document.getElementById('comparison-results');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
      }
    },
    onError: (error: Error) => {
      setIsLoading(false);
      toast({
        title: "Error",
        description: `Failed to compare providers: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleSendAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSendAmount(isNaN(value) ? 0 : value);
    
    // Calculate receive amount based on current exchange rate
    if (!isNaN(value)) {
      setReceiveAmount(Math.round(value * currentRate));
    }
  };

  const handleReceiveAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setReceiveAmount(isNaN(value) ? 0 : value);
    
    // Calculate send amount based on current exchange rate
    if (!isNaN(value)) {
      setSendAmount(parseFloat((value / currentRate).toFixed(2)));
    }
  };

  const handleFromCurrencyChange = (value: string) => {
    setFromCurrency(value);
    // Recalculate receive amount based on new rate
    if (activeTab === 'send') {
      setReceiveAmount(Math.round(sendAmount * getExchangeRate(value, toCurrency)));
    } else {
      setSendAmount(parseFloat((receiveAmount / getExchangeRate(value, toCurrency)).toFixed(2)));
    }
  };

  const handleToCurrencyChange = (value: string) => {
    setToCurrency(value);
    // Recalculate amounts based on new rate
    if (activeTab === 'send') {
      setReceiveAmount(Math.round(sendAmount * getExchangeRate(fromCurrency, value)));
    } else {
      setSendAmount(parseFloat((receiveAmount / getExchangeRate(fromCurrency, value)).toFixed(2)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const requestData: TransferRequest = {
      amount: activeTab === 'send' ? sendAmount : receiveAmount,
      fromCurrency,
      toCurrency,
      type: activeTab
    };
    
    compareMutation.mutate(requestData);
  };

  // Get the current from and to currency objects
  const currentFromCurrency = sendCurrencies.find(c => c.code === fromCurrency) || sendCurrencies[0];
  const currentToCurrency = receiveCurrencies.find(c => c.code === toCurrency) || receiveCurrencies[0];

  // Calculate estimated rate display
  const rateDisplay = `1 ${currentFromCurrency.symbol} = ${currentRate.toLocaleString()} ${currentToCurrency.symbol}`;
  
  return (
    <section className="py-12 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
              Compare International Money Transfers
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
              Find the best rates and lowest fees across multiple providers
            </p>
            
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-600 mb-6">
              <button 
                className={`px-6 py-2 font-medium focus:outline-none ${
                  activeTab === 'send' 
                    ? 'text-primary border-b-2 border-primary' 
                    : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
                onClick={() => setActiveTab('send')}
              >
                You Send
              </button>
              <button 
                className={`px-6 py-2 font-medium focus:outline-none ${
                  activeTab === 'receive' 
                    ? 'text-primary border-b-2 border-primary' 
                    : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
                onClick={() => setActiveTab('receive')}
              >
                They Receive
              </button>
            </div>
            
            {/* Calculator Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Send Section */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    {activeTab === 'send' ? 'You Send' : 'You Need to Send'}
                  </label>
                  <div className="flex flex-col space-y-2">
                    <div className="flex">
                      <Select 
                        value={fromCurrency} 
                        onValueChange={handleFromCurrencyChange}
                      >
                        <SelectTrigger className="w-[130px] rounded-r-none border-r-0">
                          <SelectValue>
                            <div className="flex items-center">
                              {currentFromCurrency.flag}
                              <span>{fromCurrency}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {sendCurrencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              <div className="flex items-center">
                                {currency.flag}
                                <span className="ml-2">{currency.code} - {currency.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={sendAmount}
                        onChange={handleSendAmountChange}
                        min="0"
                        step="0.01"
                        className="flex-1 rounded-l-none"
                        disabled={activeTab === 'receive'}
                      />
                    </div>
                    {activeTab === 'receive' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Amount needed to achieve recipient's requested amount
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Currency Swap Button */}
                <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 transform -translate-x-1/2 z-10 md:relative md:left-auto md:top-auto md:transform-none">
                  <button 
                    type="button"
                    onClick={swapCurrencies}
                    className="bg-white dark:bg-gray-700 rounded-full p-2 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                  </button>
                </div>
                
                {/* Receive Section */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    {activeTab === 'send' ? 'Recipient Gets' : 'They Receive'}
                  </label>
                  <div className="flex flex-col space-y-2">
                    <div className="flex">
                      <Select 
                        value={toCurrency} 
                        onValueChange={handleToCurrencyChange}
                      >
                        <SelectTrigger className="w-[130px] rounded-r-none border-r-0">
                          <SelectValue>
                            <div className="flex items-center">
                              {currentToCurrency.flag}
                              <span>{toCurrency}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {receiveCurrencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              <div className="flex items-center">
                                {currency.flag}
                                <span className="ml-2">{currency.code} - {currency.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={receiveAmount}
                        onChange={handleReceiveAmountChange}
                        min="0"
                        step="1"
                        className="flex-1 rounded-l-none"
                        disabled={activeTab === 'send'}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {rateDisplay} • Mid-market rate
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  type="submit"
                  className="px-6 py-6 bg-primary hover:bg-primary/90 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Comparing..." : "Compare Providers"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransferCalculator;
