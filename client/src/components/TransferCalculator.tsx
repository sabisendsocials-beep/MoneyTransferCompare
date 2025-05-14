import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TransferRequest } from "@shared/schema";
import { useLocation } from "wouter";

type CalculatorProps = {
  onCompare: (results: any) => void;
};

const TransferCalculator = ({ onCompare }: CalculatorProps) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [sendAmount, setSendAmount] = useState<number>(1000);
  const [receiveAmount, setReceiveAmount] = useState<number>(1523000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
    
    // Simulate exchange rate calculation - this will be replaced by real data
    if (!isNaN(value)) {
      setReceiveAmount(Math.round(value * 1523));
    }
  };

  const handleReceiveAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setReceiveAmount(isNaN(value) ? 0 : value);
    
    // Simulate reverse calculation - this will be replaced by real data
    if (!isNaN(value)) {
      setSendAmount(parseFloat((value / 1523).toFixed(2)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const requestData: TransferRequest = {
      amount: activeTab === 'send' ? sendAmount : receiveAmount,
      fromCurrency: 'GBP',
      toCurrency: 'NGN',
      type: activeTab
    };
    
    compareMutation.mutate(requestData);
  };
  
  return (
    <section className="py-12 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
              Compare Money Transfer Options
            </h2>
            
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
                Send Money
              </button>
              <button 
                className={`px-6 py-2 font-medium focus:outline-none ${
                  activeTab === 'receive' 
                    ? 'text-primary border-b-2 border-primary' 
                    : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
                onClick={() => setActiveTab('receive')}
              >
                Receive Money
              </button>
            </div>
            
            {/* Calculator Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount Section */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    You Send
                  </label>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-l-md">
                        <div className="w-6 h-4 mr-2 bg-blue-600 relative overflow-hidden rounded">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-1/3 bg-red-600 absolute top-0"></div>
                            <div className="w-full h-1/3 bg-white absolute top-1/3"></div>
                            <div className="w-full h-1/3 bg-blue-600 absolute top-2/3"></div>
                          </div>
                        </div>
                        <span>GBP</span>
                      </div>
                    </div>
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
                </div>
                
                {/* Recipient Section */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Recipient Gets
                  </label>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-l-md">
                        <div className="w-6 h-4 mr-2 bg-green-600 relative overflow-hidden rounded">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1/3 h-full bg-green-600 absolute left-0"></div>
                            <div className="w-1/3 h-full bg-white absolute left-1/3"></div>
                            <div className="w-1/3 h-full bg-green-600 absolute left-2/3"></div>
                          </div>
                        </div>
                        <span>NGN</span>
                      </div>
                    </div>
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
