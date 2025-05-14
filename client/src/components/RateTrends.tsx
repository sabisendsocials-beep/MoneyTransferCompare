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
import { ArrowUp, ArrowDown, BarChart2, AlertTriangle } from "lucide-react";

const RateTrends = () => {
  const [targetRate, setTargetRate] = useState<string>("");
  const { toast } = useToast();

  const { data: trends, isLoading: trendsLoading } = useQuery<RateTrend[]>({
    queryKey: ["/api/rate-trends?from=GBP&to=NGN&days=30"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<RateStats>({
    queryKey: ["/api/rate-stats?from=GBP&to=NGN"],
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
      description: `We'll notify you when the rate reaches ${rate} NGN`,
    });
    setTargetRate("");
  };

  const isLoading = trendsLoading || statsLoading;

  return (
    <section className="py-12 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          GBP to NGN Exchange Rate Trends
        </h2>

        <div className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden p-6">
          <div className="flex flex-col md:flex-row items-start mb-6 space-y-4 md:space-y-0">
            <div className="w-full md:w-2/3 pr-0 md:pr-8">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : !trends || trends.length === 0 ? (
                <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No trend data available</p>
                  </div>
                </div>
              ) : (
                <div className="h-80 rounded-lg overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
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
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => value.toFixed(0)}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(2)} NGN`, "Exchange Rate"]}
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
                        name="GBP to NGN"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-100">Rate Highlights</h3>
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
                      30-day high: 1 GBP = {stats.thirtyDayHigh.toLocaleString()} NGN ({stats.thirtyDayHighDate})
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center mt-0.5 mr-2">
                      <ArrowDown className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      30-day low: 1 GBP = {stats.thirtyDayLow.toLocaleString()} NGN ({stats.thirtyDayLowDate})
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mt-0.5 mr-2">
                      <span className="text-primary text-xs font-bold">=</span>
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      30-day average: 1 GBP = {stats.thirtyDayAverage.toLocaleString()} NGN
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5 mr-2">
                      <BarChart2 className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Trend: {stats.oneMonthChange > 0 ? 'Upward' : stats.oneMonthChange < 0 ? 'Downward' : 'Stable'} trend ({stats.oneMonthChange}% over 30 days)
                    </span>
                  </li>
                </ul>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <h4 className="font-medium text-sm mb-2 text-gray-800 dark:text-gray-200">Set Rate Alert</h4>
                <div className="flex">
                  <Input
                    type="number"
                    placeholder="Target rate (NGN)"
                    value={targetRate}
                    onChange={(e) => setTargetRate(e.target.value)}
                    className="flex-1 rounded-r-none"
                  />
                  <Button
                    className="rounded-l-none"
                    onClick={handleRateAlert}
                  >
                    Alert Me
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
            <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-100">Historical Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))
              ) : !stats ? (
                <p className="text-gray-500 col-span-3">Historical performance data not available</p>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">1 Month Change</h4>
                    <div className="flex items-center">
                      <span className={`text-lg font-semibold ${stats.oneMonthChange > 0 ? 'text-green-500' : stats.oneMonthChange < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {stats.oneMonthChange > 0 ? '+' : ''}{stats.oneMonthChange}%
                      </span>
                      {stats.oneMonthChange > 0 ? (
                        <ArrowUp className="ml-2 h-4 w-4 text-green-500" />
                      ) : stats.oneMonthChange < 0 ? (
                        <ArrowDown className="ml-2 h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">3 Month Change</h4>
                    <div className="flex items-center">
                      <span className={`text-lg font-semibold ${stats.threeMonthChange > 0 ? 'text-green-500' : stats.threeMonthChange < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {stats.threeMonthChange > 0 ? '+' : ''}{stats.threeMonthChange}%
                      </span>
                      {stats.threeMonthChange > 0 ? (
                        <ArrowUp className="ml-2 h-4 w-4 text-green-500" />
                      ) : stats.threeMonthChange < 0 ? (
                        <ArrowDown className="ml-2 h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">1 Year Change</h4>
                    <div className="flex items-center">
                      <span className={`text-lg font-semibold ${stats.oneYearChange > 0 ? 'text-green-500' : stats.oneYearChange < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {stats.oneYearChange > 0 ? '+' : ''}{stats.oneYearChange}%
                      </span>
                      {stats.oneYearChange > 0 ? (
                        <ArrowUp className="ml-2 h-4 w-4 text-green-500" />
                      ) : stats.oneYearChange < 0 ? (
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
