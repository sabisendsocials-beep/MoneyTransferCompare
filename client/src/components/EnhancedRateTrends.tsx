import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { 
  ArrowUp, 
  ArrowDown, 
  BarChart2, 
  Calendar,
  TrendingUp,
  Building2,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  Trophy,
  Medal,
  Award,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type RateDataSource = {
  id: string;
  label: string;
  type: 'base' | 'provider';
  color: string;
  enabled: boolean;
  providerName?: string;
};

type ChartDataPoint = {
  date: string;
  [key: string]: any; // Dynamic keys for different rate sources
};

const EnhancedRateTrends = () => {
  const [periodOption, setPeriodOption] = useState<string>("30");
  const [currencyPair, setCurrencyPair] = useState<CurrencyPair>({
    from: "GBP",
    to: "NGN",
    fromName: "British Pound",
    toName: "Nigerian Naira",
    fromSymbol: "£",
    toSymbol: "₦"
  });
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [showBaseRates, setShowBaseRates] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Type definitions for league table
  type ProviderRanking = {
    name: string;
    rate: number;
    percentageAboveBase: number;
    amountAboveBase: number;
  };

  type DayLeagueData = {
    date: string;
    baseRate: number;
    topProviders: ProviderRanking[];
  };

  type RankingTrendPoint = {
    date: string;
    [providerName: string]: string | number; // Provider names as keys with ranking positions as values
  };

  // Fetch all available providers
  const { data: allProviders = [] } = useQuery({
    queryKey: ['/api/providers'],
    select: (data) => data || []
  });

  // Get providers that have data for this currency pair from the main providers list
  // Filter to only those that typically have rate data
  const providersWithData = useMemo(() => {
    if (!Array.isArray(allProviders)) return [];
    
    // These are the providers that typically have historical rate data
    const providersWithHistoricalData = [
      'Wise', 'WorldRemit', 'Western Union', 'Paysend', 'Remitly', 
      'Profee', 'Lemfi', 'MoneyGram', 'Nala', 'Sendwave', 
      'Taptap Send', 'TransferGo', 'Afriexapp', 'Remit Choice', 'Pesa'
    ];
    
    return allProviders
      .filter((p: any) => providersWithHistoricalData.includes(p.name))
      .map((p: any) => p.name);
  }, [allProviders]);

  // Reset providers when currency pair changes
  useEffect(() => {
    setSelectedProviders([]);
  }, [currencyPair.from, currencyPair.to]);

  // Initialize with all providers that have data
  useEffect(() => {
    if (Array.isArray(providersWithData) && providersWithData.length > 0 && selectedProviders.length === 0) {
      // Select all providers that have actual data for this currency pair
      setSelectedProviders(providersWithData);
    }
  }, [providersWithData, selectedProviders.length]);

  // Generate colors for providers (expanded for 20+ providers)
  const providerColors = [
    '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', 
    '#7c3aed', '#059669', '#d97706', '#0369a1', '#be123c',
    '#7c2d12', '#365314', '#1e3a8a', '#581c87', '#78350f',
    '#ec4899', '#06b6d4', '#84cc16', '#f59e0b', '#ef4444',
    '#8b5cf6', '#10b981', '#f97316', '#3b82f6', '#f43f5e'
  ];

  const getProviderColor = (providerName: string) => {
    const index = Array.isArray(allProviders) ? allProviders.findIndex((p: any) => p.name === providerName) : -1;
    return index >= 0 ? providerColors[index % providerColors.length] : '#6b7280';
  };

  // Create data sources dynamically based on selections
  const dataSources: RateDataSource[] = [
    ...(showBaseRates ? [{
      id: 'base_rate',
      label: 'Official Base Rate',
      type: 'base' as const,
      color: '#2563eb',
      enabled: true
    }] : []),
    ...selectedProviders.map((providerName) => ({
      id: `provider_${providerName}`,
      label: providerName,
      type: 'provider' as const,
      color: getProviderColor(providerName),
      enabled: true,
      providerName: providerName
    }))
  ];

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const periodOptions: PeriodOption[] = [
    { label: "7 days", value: "7", days: 7 },
    { label: "30 days", value: "30", days: 30 },
    { label: "90 days", value: "90", days: 90 },
    { label: "1 year", value: "365", days: 365 },
  ];

  const currencyPairs: CurrencyPair[] = [
    { from: "GBP", to: "NGN", fromName: "British Pound", toName: "Nigerian Naira", fromSymbol: "£", toSymbol: "₦" },
    { from: "EUR", to: "NGN", fromName: "Euro", toName: "Nigerian Naira", fromSymbol: "€", toSymbol: "₦" },
    { from: "USD", to: "NGN", fromName: "US Dollar", toName: "Nigerian Naira", fromSymbol: "$", toSymbol: "₦" },
    { from: "GBP", to: "GHS", fromName: "British Pound", toName: "Ghanaian Cedi", fromSymbol: "£", toSymbol: "₵" },
    { from: "EUR", to: "GHS", fromName: "Euro", toName: "Ghanaian Cedi", fromSymbol: "€", toSymbol: "₵" },
    { from: "USD", to: "GHS", fromName: "US Dollar", toName: "Ghanaian Cedi", fromSymbol: "$", toSymbol: "₵" },
    { from: "GBP", to: "KES", fromName: "British Pound", toName: "Kenyan Shilling", fromSymbol: "£", toSymbol: "KSh" },
    { from: "EUR", to: "KES", fromName: "Euro", toName: "Kenyan Shilling", fromSymbol: "€", toSymbol: "KSh" },
    { from: "USD", to: "KES", fromName: "US Dollar", toName: "Kenyan Shilling", fromSymbol: "$", toSymbol: "KSh" },
    { from: "GBP", to: "INR", fromName: "British Pound", toName: "Indian Rupee", fromSymbol: "£", toSymbol: "₹" },
    { from: "EUR", to: "INR", fromName: "Euro", toName: "Indian Rupee", fromSymbol: "€", toSymbol: "₹" },
    { from: "USD", to: "INR", fromName: "US Dollar", toName: "Indian Rupee", fromSymbol: "$", toSymbol: "₹" },
    { from: "GBP", to: "PKR", fromName: "British Pound", toName: "Pakistani Rupee", fromSymbol: "£", toSymbol: "₨" },
    { from: "EUR", to: "PKR", fromName: "Euro", toName: "Pakistani Rupee", fromSymbol: "€", toSymbol: "₨" },
    { from: "USD", to: "PKR", fromName: "US Dollar", toName: "Pakistani Rupee", fromSymbol: "$", toSymbol: "₨" },
  ];

  // Fetch base rate trends
  const { data: baseRateData, isLoading: baseRateLoading } = useQuery({
    queryKey: [`/api/rate-trends?fromCurrency=${currencyPair.from}&toCurrency=${currencyPair.to}&days=${periodOptions.find(p => p.value === periodOption)?.days || 30}`],
    enabled: showBaseRates,
  });

  // Fetch provider rate trends for selected providers
  const providerQueries = useQuery({
    queryKey: [`/api/provider-rate-trends?fromCurrency=${currencyPair.from}&toCurrency=${currencyPair.to}&days=${periodOptions.find(p => p.value === periodOption)?.days || 30}&providers=${selectedProviders.join(',')}`],
    enabled: selectedProviders.length > 0,
  });

  // Process and combine data for chart
  useEffect(() => {
    const processedData: ChartDataPoint[] = [];
    const dateMap = new Map<string, ChartDataPoint>();

    // Process base rate data
    if (baseRateData && Array.isArray(baseRateData) && showBaseRates) {
      baseRateData.forEach((point: any) => {
        const date = point.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        const dataPoint = dateMap.get(date)!;
        dataPoint.base_rate = point.rate;
      });
    }

    // Process provider rate data
    if (providerQueries.data && Array.isArray(providerQueries.data)) {
      providerQueries.data.forEach((point: any) => {
        const date = point.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        const dataPoint = dateMap.get(date)!;
        const providerKey = point.provider_name?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
        dataPoint[providerKey] = point.rate;
      });
    }

    // Convert map to array and sort by date
    const chartArray = Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setChartData(chartArray);
  }, [baseRateData, providerQueries.data, dataSources]);

  const handlePeriodChange = (value: string) => {
    setPeriodOption(value);
  };

  const handleCurrencyPairChange = (value: string) => {
    const selectedPair = currencyPairs.find(pair => `${pair.from}-${pair.to}` === value);
    if (selectedPair) {
      setCurrencyPair(selectedPair);
    }
  };

  // Provider management functions
  const handleProviderToggle = (providerName: string) => {
    setSelectedProviders(prev => 
      prev.includes(providerName) 
        ? prev.filter(p => p !== providerName)
        : [...prev, providerName]
    );
  };

  const handleBaseRateToggle = () => {
    setShowBaseRates(!showBaseRates);
  };

  const enabledSources = dataSources.filter(ds => ds.enabled);
  const isLoading = baseRateLoading || providerQueries.isLoading;

  const formatDateString = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatRate = (value: number) => {
    return value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {formatDateString(label)}
          </p>
          {payload.map((entry: any, index: number) => {
            const source = dataSources.find(ds => 
              ds.id === entry.dataKey || 
              ds.providerName?.toLowerCase().replace(/\s+/g, '_') === entry.dataKey
            );
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {source?.label || entry.dataKey}: {currencyPair.toSymbol}{formatRate(entry.value)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Calculate league table data for each day
  const leagueTableData = useMemo((): DayLeagueData[] => {
    if (!chartData.length) return [];
    
    return chartData.map(dayData => {
      const baseRate = dayData.base_rate;
      const providers: ProviderRanking[] = [];
      
      // Extract all provider rates for this day
      Object.keys(dayData).forEach(key => {
        if (key !== 'date' && key !== 'base_rate' && dayData[key] != null) {
          const providerName = selectedProviders.find(p => 
            p.toLowerCase().replace(/\s+/g, '_') === key
          ) || key.replace(/_/g, ' ');
          
          const rate = dayData[key] as number;
          const percentageAboveBase = baseRate ? ((rate - baseRate) / baseRate * 100) : 0;
          
          providers.push({
            name: providerName,
            rate: rate,
            percentageAboveBase: percentageAboveBase,
            amountAboveBase: baseRate ? (rate - baseRate) : 0
          });
        }
      });
      
      // Sort by rate (highest first) and take top 7
      providers.sort((a, b) => b.rate - a.rate);
      
      return {
        date: dayData.date,
        baseRate: baseRate || 0,
        topProviders: providers.slice(0, 7)
      };
    }).reverse(); // Most recent first
  }, [chartData, selectedProviders]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 text-amber-600" />;
      default: return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-gray-500">#{rank}</span>;
    }
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  // Calculate ranking trends data for stacked chart
  const rankingTrendsData = useMemo((): RankingTrendPoint[] => {
    if (!leagueTableData.length) return [];
    
    // Build trend data with provider names and their ranking positions
    return leagueTableData.slice().reverse().map(dayData => { // Reverse to show chronological order
      const trendPoint: RankingTrendPoint = { date: dayData.date };
      
      // Add top 7 providers for this day in order
      dayData.topProviders.slice(0, 7).forEach((provider, index) => {
        trendPoint[`rank_${index + 1}`] = provider.name;
      });
      
      return trendPoint;
    });
  }, [leagueTableData]);

  // Calculate stacked data for area chart (providers stacked by ranking)
  const stackedRankingData = useMemo(() => {
    if (!leagueTableData.length) return [];
    
    return leagueTableData.slice().reverse().map(dayData => {
      const stackPoint: any = { date: dayData.date };
      
      // Create stacked values - each provider gets a "slice" of 1 unit
      dayData.topProviders.slice(0, 7).forEach((provider, index) => {
        stackPoint[provider.name] = 1; // Each provider gets equal height in stack
      });
      
      return stackPoint;
    });
  }, [leagueTableData]);

  // Get all unique providers for stacked chart
  const allUniqueProviders = useMemo(() => {
    const providers = new Set<string>();
    leagueTableData.forEach(day => {
      day.topProviders.slice(0, 7).forEach(provider => {
        providers.add(provider.name);
      });
    });
    return Array.from(providers);
  }, [leagueTableData]);

  // Provider colors for ranking trends
  const rankingProviderColors = useMemo(() => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
      '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
      '#6366f1', '#84cc16', '#f43f5e', '#14b8a6', '#a855f7'
    ];
    const providerColorMap: { [key: string]: string } = {};
    
    let colorIndex = 0;
    rankingTrendsData.forEach(day => {
      Object.keys(day).forEach(key => {
        if (key !== 'date' && !providerColorMap[key]) {
          providerColorMap[key] = colors[colorIndex % colors.length];
          colorIndex++;
        }
      });
    });
    
    return providerColorMap;
  }, [rankingTrendsData]);

  const CustomStackedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = leagueTableData.find(day => day.date === label);
      
      if (!dayData) return null;

      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {formatDateString(label)}
          </p>
          <div className="space-y-1">
            {dayData.topProviders.slice(0, 7).map((provider, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  {getRankIcon(index + 1)}
                  <span className="ml-2" style={{ color: rankingProviderColors[provider.name] }}>
                    {provider.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {currencyPair.toSymbol}{formatRate(provider.rate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="py-12 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Enhanced Rate Trends Analysis
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Compare official base rates with provider rates over time to identify the best transfer opportunities
          </p>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden p-6">
          {/* Chart Controls */}
          <div className="flex flex-col lg:flex-row items-start justify-between mb-6 space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Currency and Period Selection */}
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
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

            {/* Data Source Selection */}
            <div className="lg:max-w-md w-full">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <BarChart2 className="w-4 h-4 mr-2" />
                Data Sources
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {dataSources.map((source) => (
                  <div key={source.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={source.id}
                      checked={source.enabled}
                      onCheckedChange={() => {
                        if (source.type === 'base') {
                          handleBaseRateToggle();
                        } else if (source.providerName) {
                          handleProviderToggle(source.providerName);
                        }
                      }}
                      className="data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor={source.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: source.enabled ? source.color : '#d1d5db' }}
                      />
                      {source.type === 'base' ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <Building2 className="w-3 h-3 mr-1" />
                      )}
                      {source.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Sources Display */}
          {enabledSources.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {enabledSources.map((source) => (
                  <Badge key={source.id} variant="secondary" className="flex items-center">
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: source.color }}
                    />
                    {source.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chart and League Table Section */}
          <Tabs defaultValue="chart" className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chart">Rate Trends Chart</TabsTrigger>
              <TabsTrigger value="rankings">Ranking Trends</TabsTrigger>
              <TabsTrigger value="league">Daily League Table</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chart">
              <Card>
                <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading trend data...</p>
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {currencyPair.fromName} to {currencyPair.toName} Exchange Rates
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Showing {chartData.length} data points over {periodOptions.find(p => p.value === periodOption)?.label.toLowerCase()}
                    </p>
                  </div>
                  
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDateString}
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${currencyPair.toSymbol}${formatRate(value)}`}
                        stroke="#6b7280"
                        fontSize={12}
                        domain={['dataMin - 10', 'dataMax + 10']}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      
                      {enabledSources.map((source) => {
                        const dataKey = source.id === 'base_rate' ? 'base_rate' : 
                          source.providerName?.toLowerCase().replace(/\s+/g, '_') || source.id;
                        
                        return (
                          <Line
                            key={source.id}
                            type="monotone"
                            dataKey={dataKey}
                            stroke={source.color}
                            strokeWidth={source.type === 'base' ? 3 : 2}
                            strokeDasharray={source.type === 'base' ? '0' : '5 5'}
                            dot={{ fill: source.color, strokeWidth: 2, r: 3 }}
                            name={source.label}
                            connectNulls={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-2">No trend data available</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Try selecting different data sources or time period
                    </p>
                  </div>
                </div>
              )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="rankings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LineChartIcon className="w-5 h-5 mr-2 text-blue-500" />
                    Provider Ranking Trends
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    See how provider rankings change over time (lower is better, 1st place = best rate)
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {rankingTrendsData.length > 0 ? (
                    <div>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          Daily Provider Rankings
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Timeline view showing top 5 providers across last 5 days with movement indicators
                        </p>
                      </div>
                      
                      {/* Horizontal Timeline View - Perfect for Social Media */}
                      <div className="overflow-x-auto">
                        <div className="min-w-full bg-white dark:bg-gray-900 rounded-lg border shadow-lg p-6">
                          {/* Header */}
                          <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                              {currencyPair.fromSymbol} to {currencyPair.toSymbol} Provider Rankings
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Last 5 Days - Track provider movement over time
                            </p>
                          </div>
                          
                          {/* Timeline Grid - Compact Layout for Social Media */}
                          <div className="grid gap-3 min-w-[900px]">
                            {/* Header Row */}
                            <div className="grid grid-cols-6 gap-3">
                              <div className="h-12 flex items-center justify-center font-semibold text-gray-800 dark:text-white border-b-2 border-gray-200 dark:border-gray-600">
                                Provider
                              </div>
                              {leagueTableData.slice(0, 5).map((dayData, dayIndex) => {
                                const isToday = dayIndex === 0;
                                return (
                                  <div key={dayData.date} className={`h-12 flex flex-col items-center justify-center rounded-lg border-b-2 ${
                                    isToday 
                                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-200' 
                                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white'
                                  }`}>
                                    <div className="text-xs font-medium">
                                      {formatDateString(dayData.date).split(' ')[1]}
                                    </div>
                                    <div className="text-xs">
                                      {formatDateString(dayData.date).split(' ')[0]}
                                    </div>
                                    {isToday && (
                                      <div className="text-xs bg-blue-500 text-white px-1 rounded">Latest</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Provider Rows */}
                            {(() => {
                              const recentDays = leagueTableData.slice(0, 5);
                              const allProviders = new Set<string>();
                              recentDays.forEach(day => {
                                day.topProviders.slice(0, 5).forEach(provider => {
                                  allProviders.add(provider.name);
                                });
                              });
                              
                              return Array.from(allProviders).slice(0, 5).map((providerName) => (
                                <div key={providerName} className="grid grid-cols-6 gap-3">
                                  {/* Provider Name Column */}
                                  <div 
                                    className="h-20 flex items-center p-3 rounded-lg font-medium text-gray-900 dark:text-white"
                                    style={{
                                      backgroundColor: `${rankingProviderColors[providerName]}20`,
                                      borderLeft: `4px solid ${rankingProviderColors[providerName]}`
                                    }}
                                  >
                                    <span className="text-sm font-semibold">{providerName}</span>
                                  </div>
                                  
                                  {/* Daily Rankings */}
                                  {recentDays.map((dayData, dayIndex) => {
                                    const providerRank = dayData.topProviders.findIndex(p => p.name === providerName) + 1;
                                    const provider = dayData.topProviders.find(p => p.name === providerName);
                                    const prevDay = recentDays[dayIndex + 1];
                                    const prevRank = prevDay ? prevDay.topProviders.findIndex(p => p.name === providerName) + 1 : 0;
                                    
                                    // Movement calculation
                                    let movement = '';
                                    let movementColor = '';
                                    let movementText = '';
                                    if (prevRank > 0 && providerRank > 0) {
                                      if (prevRank > providerRank) {
                                        movement = '↑';
                                        movementColor = 'text-green-500';
                                        movementText = 'Up';
                                      } else if (prevRank < providerRank) {
                                        movement = '↓';
                                        movementColor = 'text-red-500';
                                        movementText = 'Down';
                                      } else {
                                        movement = '→';
                                        movementColor = 'text-gray-400';
                                        movementText = 'Same';
                                      }
                                    }
                                    
                                    return (
                                      <div 
                                        key={`${providerName}-${dayData.date}`}
                                        className="h-20 flex flex-col items-center justify-center rounded-lg border-2 text-center relative overflow-hidden"
                                        style={{
                                          backgroundColor: providerRank > 0 ? `${rankingProviderColors[providerName]}15` : '#f8fafc',
                                          borderColor: providerRank > 0 ? rankingProviderColors[providerName] : '#e2e8f0'
                                        }}
                                      >
                                        {providerRank > 0 ? (
                                          <>
                                            {/* Provider Name in Box */}
                                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate max-w-full px-1">
                                              {providerName}
                                            </div>
                                            
                                            {/* Rank and Rate */}
                                            <div className="flex items-center space-x-1 mb-1">
                                              {getRankIcon(providerRank)}
                                              <span className="text-sm font-bold">#{providerRank}</span>
                                            </div>
                                            
                                            {/* Exchange Rate */}
                                            {provider && (
                                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                {currencyPair.toSymbol}{formatRate(provider.rate)}
                                              </div>
                                            )}
                                            
                                            {/* Movement Indicator */}
                                            {movement && dayIndex > 0 && (
                                              <div className={`absolute top-1 right-1 text-sm font-bold ${movementColor} bg-white dark:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center shadow-sm border`}>
                                                {movement}
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <div className="text-xs font-semibold text-gray-400 mb-1">
                                              {providerName}
                                            </div>
                                            <div className="text-xs text-gray-400">Not in Top 5</div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ));
                            })()}
                          </div>
                          
                          {/* Legend */}
                          <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-center space-x-1">
                              <span className="text-green-500 font-bold">↑</span>
                              <span>Moved Up</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-red-500 font-bold">↓</span>
                              <span>Moved Down</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-400 font-bold">→</span>
                              <span>Same Position</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Rankings Legend */}
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">
                          Reading the Timeline:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center">
                            <Trophy className="w-3 h-3 text-yellow-500 mr-1" />
                            Compare rankings across last 5 days side by side
                          </div>
                          <div className="flex items-center">
                            <Medal className="w-3 h-3 text-gray-400 mr-1" />
                            Movement arrows show if providers moved up/down
                          </div>
                          <div className="flex items-center">
                            <Award className="w-3 h-3 text-amber-600 mr-1" />
                            Perfect for social media sharing and trend analysis
                          </div>
                          <div className="text-gray-500">
                            Latest day highlighted in blue with "Latest" badge
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <LineChartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 mb-2">No ranking trends available</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Select providers and ensure base rates are enabled to see ranking trends
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="league">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                    Daily Provider League Table
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Top 7 providers by day, ranked by exchange rate with percentage above base rate
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {leagueTableData.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-6">
                        {leagueTableData.map((dayData, dayIndex) => (
                          <div key={dayData.date} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-lg">
                                {formatDateString(dayData.date)}
                              </h3>
                              {dayData.baseRate && (
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  Base Rate: {currencyPair.toSymbol}{formatRate(dayData.baseRate)}
                                </div>
                              )}
                            </div>
                            
                            {dayData.topProviders.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-16">Rank</TableHead>
                                    <TableHead>Provider</TableHead>
                                    <TableHead className="text-right">Rate</TableHead>
                                    <TableHead className="text-right">vs Base</TableHead>
                                    <TableHead className="text-right">Amount Above</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {dayData.topProviders.map((provider, index) => (
                                    <TableRow key={`${dayData.date}-${provider.name}`}>
                                      <TableCell className="flex items-center">
                                        {getRankIcon(index + 1)}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {provider.name}
                                      </TableCell>
                                      <TableCell className="text-right font-mono">
                                        {currencyPair.toSymbol}{formatRate(provider.rate)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className={`font-medium ${
                                          provider.percentageAboveBase >= 0 
                                            ? 'text-green-600 dark:text-green-400' 
                                            : 'text-red-600 dark:text-red-400'
                                        }`}>
                                          {formatPercentage(provider.percentageAboveBase)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right font-mono">
                                        <span className={`${
                                          provider.amountAboveBase >= 0 
                                            ? 'text-green-600 dark:text-green-400' 
                                            : 'text-red-600 dark:text-red-400'
                                        }`}>
                                          {provider.amountAboveBase >= 0 ? '+' : ''}
                                          {currencyPair.toSymbol}{formatRate(Math.abs(provider.amountAboveBase))}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No provider data available for this date
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 mb-2">No league data available</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Select providers and ensure base rates are enabled to see the league table
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Last updated: {new Date().toLocaleTimeString('en-GB')}
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Data
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnhancedRateTrends;