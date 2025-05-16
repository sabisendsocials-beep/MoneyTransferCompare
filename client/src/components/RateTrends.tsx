import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RateTrend, RateStats } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { 
  ArrowUp, 
  ArrowDown, 
  BarChart2, 
  AlertTriangle, 
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

type PeriodOption = {
  label: string;
  value: string;
  days: number;
};

type CurrencyPair = {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromSymbol: string;
  toSymbol: string;
};

const RateTrends = () => {
  const [targetRate, setTargetRate] = useState<string>("");
  const [periodOption, setPeriodOption] = useState<string>("30");
  const [currencyPair, setCurrencyPair] = useState<CurrencyPair>({
    from: "GBP",
    to: "NGN",
    fromName: "British Pound",
    toName: "Nigerian Naira",
    fromSymbol: "£",
    toSymbol: "₦"
  });
  const { toast } = useToast();

  const periodOptions: PeriodOption[] = [
    { label: "7 days", value: "7", days: 7 },
    { label: "30 days", value: "30", days: 30 },
    { label: "90 days", value: "90", days: 90 },
    { label: "1 year", value: "365", days: 365 },
  ];

  const currencyPairs: CurrencyPair[] = [
    { from: "GBP", to: "NGN", fromName: "British Pound", toName: "Nigerian Naira", fromSymbol: "£", toSymbol: "₦" },
    { from: "EUR", to: "NGN", fromName: "Euro", toName: "Nigerian Naira", fromSymbol: "€", toSymbol: "₦" },
    { from: "GBP", to: "GHS", fromName: "British Pound", toName: "Ghanaian Cedi", fromSymbol: "£", toSymbol: "₵" },
    { from: "EUR", to: "GHS", fromName: "Euro", toName: "Ghanaian Cedi", fromSymbol: "€", toSymbol: "₵" },
  ];

  const selectedPeriod = periodOptions.find(option => option.value === periodOption) || periodOptions[1];

  const { data: trends, isLoading: trendsLoading, error: trendsError } = useQuery<RateTrend[]>({
    queryKey: [`/api/rate-trends?from=${currencyPair.from}&to=${currencyPair.to}&days=${selectedPeriod.days}`],
    retry: 2, // Retry failed requests a couple of times
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<RateStats>({
    queryKey: [`/api/rate-stats?from=${currencyPair.from}&to=${currencyPair.to}`],
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleRateAlert = () => {
    const rate = parseFloat(targetRate);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: "Invalid rate",
        description: "Please enter a valid target rate",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Rate Alert Set",
      description: `We'll notify you when the rate reaches ${rate} ${currencyPair.toSymbol}`,
    });
    setTargetRate("");
  };

  const handlePeriodChange = (value: string) => {
    setPeriodOption(value);
  };

  const handleCurrencyPairChange = (value: string) => {
    const selectedPair = currencyPairs.find(pair => `${pair.from}-${pair.to}` === value);
    if (selectedPair) {
      setCurrencyPair(selectedPair);
    }
  };

  const isLoading = trendsLoading || statsLoading;

  // Format a date for display
  const formatDateString = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <section className="py-12 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Exchange Rate Trends
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Monitor historical exchange rate movements and set alerts for favorable rates
          </p>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden p-6">
          {/* Chart Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Select 
                value={`${currencyPair.from}-${currencyPair.to}`} 
                onValueChange={handleCurrencyPairChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select currencies" />
                </SelectTrigger>
                <SelectContent>
                  {currencyPairs.map((pair) => (
                    <SelectItem key={`${pair.from}-${pair.to}`} value={`${pair.from}-${pair.to}`}>
                      {pair.from} to {pair.to}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {currencyPair.fromName} to {currencyPair.toName}
              </div>
            </div>
            
            <div className="flex space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              {periodOptions.map((option) => (
                <button 
                  key={option.value} 
                  onClick={() => handlePeriodChange(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                    periodOption === option.value 
                      ? "bg-primary text-white" 
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start mb-6 space-y-6 md:space-y-0 md:space-x-6">
            <div className="w-full md:w-2/3">
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : !trends || trends.length === 0 ? (
                <div className="h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No trend data available</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {currencyPair.from} to {currencyPair.to} Rate Chart
                    </h3>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>Past {selectedPeriod.label}</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart
                      data={trends}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return selectedPeriod.days > 30 
                            ? `${d.getDate()}/${d.getMonth() + 1}`
                            : `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => value.toFixed(0)}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `${value.toFixed(2)} ${currencyPair.toSymbol}`, 
                          `Exchange Rate`
                        ]}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          });
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name={`${currencyPair.from} to ${currencyPair.to}`}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="w-full md:w-1/3 flex flex-col space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100">Rate Highlights</h3>
                {isLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                  </div>
                ) : !stats ? (
                  <p className="text-gray-500 dark:text-gray-400">Statistics not available</p>
                ) : (
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5 mr-2">
                        <ArrowUp className="h-3 w-3 text-white" />
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        30-day high: 1 {currencyPair.fromSymbol} = {stats.thirtyDayHigh?.toLocaleString() || 'N/A'} {currencyPair.toSymbol} {stats.thirtyDayHighDate ? `(${formatDateString(stats.thirtyDayHighDate)})` : ''}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center mt-0.5 mr-2">
                        <ArrowDown className="h-3 w-3 text-white" />
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        30-day low: 1 {currencyPair.fromSymbol} = {stats.thirtyDayLow?.toLocaleString() || 'N/A'} {currencyPair.toSymbol} {stats.thirtyDayLowDate ? `(${formatDateString(stats.thirtyDayLowDate)})` : ''}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mt-0.5 mr-2">
                        <span className="text-primary text-xs font-bold">=</span>
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        30-day average: 1 {currencyPair.fromSymbol} = {stats.thirtyDayAverage?.toLocaleString() || 'N/A'} {currencyPair.toSymbol}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5 mr-2">
                        <BarChart2 className="h-3 w-3 text-white" />
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Trend: {(stats.oneMonthChange ?? 0) > 0 ? 'Upward' : (stats.oneMonthChange ?? 0) < 0 ? 'Downward' : 'Stable'} trend ({stats.oneMonthChange ?? 0}% over 30 days)
                      </span>
                    </li>
                  </ul>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h4 className="font-medium text-sm mb-4 text-gray-800 dark:text-gray-200">Set Rate Alert</h4>
                <div className="flex flex-col space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    We'll notify you when the {currencyPair.from} to {currencyPair.to} rate reaches your target.
                  </p>
                  <div className="flex">
                    <Input
                      type="number"
                      placeholder={`Target rate (${currencyPair.toSymbol})`}
                      value={targetRate}
                      onChange={(e) => setTargetRate(e.target.value)}
                      className="flex-1 rounded-r-none"
                    />
                    <Button
                      className="rounded-l-none bg-primary hover:bg-primary/90"
                      onClick={handleRateAlert}
                    >
                      Alert Me
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100">Historical Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))
              ) : !stats ? (
                <p className="text-gray-500 col-span-3">Historical performance data not available</p>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">1 Month Change</h4>
                    <div className="flex items-center">
                      <span className={`text-lg font-semibold ${(stats.oneMonthChange ?? 0) > 0 ? 'text-green-500' : (stats.oneMonthChange ?? 0) < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {(stats.oneMonthChange ?? 0) > 0 ? '+' : ''}{stats.oneMonthChange ?? 0}%
                      </span>
                      {(stats.oneMonthChange ?? 0) > 0 ? (
                        <ArrowUp className="ml-2 h-4 w-4 text-green-500" />
                      ) : (stats.oneMonthChange ?? 0) < 0 ? (
                        <ArrowDown className="ml-2 h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">3 Month Change</h4>
                    <div className="flex items-center">
                      <span className={`text-lg font-semibold ${(stats.threeMonthChange ?? 0) > 0 ? 'text-green-500' : (stats.threeMonthChange ?? 0) < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {(stats.threeMonthChange ?? 0) > 0 ? '+' : ''}{stats.threeMonthChange ?? 0}%
                      </span>
                      {(stats.threeMonthChange ?? 0) > 0 ? (
                        <ArrowUp className="ml-2 h-4 w-4 text-green-500" />
                      ) : (stats.threeMonthChange ?? 0) < 0 ? (
                        <ArrowDown className="ml-2 h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">1 Year Change</h4>
                    <div className="flex items-center">
                      <span className={`text-lg font-semibold ${(stats.oneYearChange ?? 0) > 0 ? 'text-green-500' : (stats.oneYearChange ?? 0) < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {(stats.oneYearChange ?? 0) > 0 ? '+' : ''}{stats.oneYearChange ?? 0}%
                      </span>
                      {(stats.oneYearChange ?? 0) > 0 ? (
                        <ArrowUp className="ml-2 h-4 w-4 text-green-500" />
                      ) : (stats.oneYearChange ?? 0) < 0 ? (
                        <ArrowDown className="ml-2 h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RateTrends;
