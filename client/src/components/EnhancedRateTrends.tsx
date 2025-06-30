import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
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
  Calendar,
  TrendingUp,
  Building2,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
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

          {/* Chart Section */}
          <Card className="mb-6">
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