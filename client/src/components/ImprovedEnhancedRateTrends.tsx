import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ChartDataPoint = {
  date: string;
  [key: string]: any; // Dynamic keys for different rate sources
};

type Provider = {
  id: number;
  name: string;
  logo?: string;
};

const periodOptions: PeriodOption[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 14 days", value: "14d", days: 14 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 60 days", value: "60d", days: 60 },
  { label: "Last 90 days", value: "90d", days: 90 },
];

const currencyPairs: CurrencyPair[] = [
  { from: 'GBP', to: 'NGN', fromName: 'British Pound', toName: 'Nigerian Naira', fromSymbol: '£', toSymbol: '₦' },
  { from: 'GBP', to: 'GHS', fromName: 'British Pound', toName: 'Ghanaian Cedi', fromSymbol: '£', toSymbol: '₵' },
  { from: 'GBP', to: 'KES', fromName: 'British Pound', toName: 'Kenyan Shilling', fromSymbol: '£', toSymbol: 'KSh' },
  { from: 'GBP', to: 'INR', fromName: 'British Pound', toName: 'Indian Rupee', fromSymbol: '£', toSymbol: '₹' },
  { from: 'GBP', to: 'PKR', fromName: 'British Pound', toName: 'Pakistani Rupee', fromSymbol: '£', toSymbol: '₨' },
  { from: 'EUR', to: 'NGN', fromName: 'Euro', toName: 'Nigerian Naira', fromSymbol: '€', toSymbol: '₦' },
  { from: 'EUR', to: 'GHS', fromName: 'Euro', toName: 'Ghanaian Cedi', fromSymbol: '€', toSymbol: '₵' },
  { from: 'EUR', to: 'KES', fromName: 'Euro', toName: 'Kenyan Shilling', fromSymbol: '€', toSymbol: 'KSh' },
  { from: 'EUR', to: 'INR', fromName: 'Euro', toName: 'Indian Rupee', fromSymbol: '€', toSymbol: '₹' },
  { from: 'EUR', to: 'PKR', fromName: 'Euro', toName: 'Pakistani Rupee', fromSymbol: '€', toSymbol: '₨' },
  { from: 'USD', to: 'NGN', fromName: 'US Dollar', toName: 'Nigerian Naira', fromSymbol: '$', toSymbol: '₦' },
  { from: 'USD', to: 'GHS', fromName: 'US Dollar', toName: 'Ghanaian Cedi', fromSymbol: '$', toSymbol: '₵' },
  { from: 'USD', to: 'KES', fromName: 'US Dollar', toName: 'Kenyan Shilling', fromSymbol: '$', toSymbol: 'KSh' },
  { from: 'USD', to: 'INR', fromName: 'US Dollar', toName: 'Indian Rupee', fromSymbol: '$', toSymbol: '₹' },
  { from: 'USD', to: 'PKR', fromName: 'US Dollar', toName: 'Pakistani Rupee', fromSymbol: '$', toSymbol: '₨' },
];

// Provider color palette
const providerColors = [
  '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', 
  '#7c3aed', '#059669', '#d97706', '#0369a1', '#be123c',
  '#7c2d12', '#365314', '#1e3a8a', '#581c87', '#78350f',
  '#166534', '#92400e', '#1e40af', '#6b21a8', '#86198f'
];

export default function ImprovedEnhancedRateTrends() {
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>(currencyPairs[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(periodOptions[2]); // Default to 30 days
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['Wise', 'WorldRemit']);
  const [showBaseRates, setShowBaseRates] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Fetch all available providers
  const { data: allProviders = [] } = useQuery<Provider[]>({
    queryKey: ['/api/providers'],
    select: (data) => data || []
  });

  // Fetch base rate trends
  const { data: baseRateTrends = [] } = useQuery({
    queryKey: ['/api/rate-trends', { 
      fromCurrency: selectedPair.from, 
      toCurrency: selectedPair.to, 
      days: selectedPeriod.days 
    }],
    enabled: showBaseRates
  });

  // Fetch provider rate trends
  const { data: providerRateTrends = [] } = useQuery({
    queryKey: ['/api/provider-rate-trends', { 
      fromCurrency: selectedPair.from, 
      toCurrency: selectedPair.to, 
      days: selectedPeriod.days,
      providers: selectedProviders.join(',')
    }],
    enabled: selectedProviders.length > 0
  });

  const getProviderColor = (providerName: string) => {
    const index = allProviders.findIndex((p: Provider) => p.name === providerName);
    return providerColors[index % providerColors.length];
  };

  // Combine and process chart data
  useEffect(() => {
    const combinedData = new Map<string, ChartDataPoint>();

    // Add base rates
    if (showBaseRates && baseRateTrends.length > 0) {
      baseRateTrends.forEach((point: any) => {
        const existing = combinedData.get(point.date) || { date: point.date };
        existing.baseRate = point.rate;
        combinedData.set(point.date, existing);
      });
    }

    // Add provider rates
    if (providerRateTrends.length > 0) {
      providerRateTrends.forEach((point: any) => {
        const existing = combinedData.get(point.date) || { date: point.date };
        existing[`provider_${point.provider_name}`] = point.rate;
        combinedData.set(point.date, existing);
      });
    }

    // Convert to array and sort by date
    const chartArray = Array.from(combinedData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setChartData(chartArray);
  }, [baseRateTrends, providerRateTrends, showBaseRates]);

  // Provider selection handlers
  const handleProviderToggle = (providerName: string) => {
    setSelectedProviders(prev => 
      prev.includes(providerName) 
        ? prev.filter(p => p !== providerName)
        : [...prev, providerName]
    );
  };

  const selectAllProviders = () => {
    setSelectedProviders(allProviders.map((p: Provider) => p.name));
  };

  const clearAllProviders = () => {
    setSelectedProviders([]);
  };

  // Multi-select provider dropdown component
  const ProviderMultiSelect = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[200px]">
          <div className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            {selectedProviders.length === 0 
              ? "Select providers..." 
              : selectedProviders.length === 1 
                ? selectedProviders[0]
                : `${selectedProviders.length} providers selected`
            }
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Select Providers</h4>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectAllProviders}
                className="h-8 px-2 text-xs"
              >
                All
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllProviders}
                className="h-8 px-2 text-xs"
              >
                None
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {allProviders.map((provider: Provider) => (
                <div key={provider.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`provider-${provider.id}`}
                    checked={selectedProviders.includes(provider.name)}
                    onCheckedChange={() => handleProviderToggle(provider.name)}
                  />
                  <label
                    htmlFor={`provider-${provider.id}`}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: getProviderColor(provider.name) }}
                      />
                      {provider.name}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="text-xs text-muted-foreground">
            {selectedProviders.length} of {allProviders.length} providers selected
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center text-sm">
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="mr-2">{entry.name}:</span>
            <span className="font-medium">
              {selectedPair.toSymbol}{entry.value?.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Calculate statistics
  const stats = {
    totalDataPoints: chartData.length,
    activeSources: (showBaseRates ? 1 : 0) + selectedProviders.length,
    dateRange: chartData.length > 0 ? {
      start: chartData[0]?.date,
      end: chartData[chartData.length - 1]?.date
    } : null
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Enhanced Rate Trends
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Compare base rates with provider rates over time
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center">
          <BarChart2 className="w-3 h-3 mr-1" />
          {stats.activeSources} source{stats.activeSources !== 1 ? 's' : ''} active
        </Badge>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Chart Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Currency Pair Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency Pair</label>
              <Select 
                value={`${selectedPair.from}/${selectedPair.to}`}
                onValueChange={(value) => {
                  const [from, to] = value.split('/');
                  const pair = currencyPairs.find(p => p.from === from && p.to === to);
                  if (pair) setSelectedPair(pair);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyPairs.map((pair) => (
                    <SelectItem key={`${pair.from}/${pair.to}`} value={`${pair.from}/${pair.to}`}>
                      <div className="flex items-center">
                        <span className="font-medium">{pair.from}/{pair.to}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {pair.fromSymbol} → {pair.toSymbol}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select 
                value={selectedPeriod.value}
                onValueChange={(value) => {
                  const period = periodOptions.find(p => p.value === value);
                  if (period) setSelectedPeriod(period);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {period.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Base Rates Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Base Rates</label>
              <Button
                variant={showBaseRates ? "default" : "outline"}
                onClick={() => setShowBaseRates(!showBaseRates)}
                className="w-full justify-start"
              >
                {showBaseRates ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                Alpha Vantage Data
              </Button>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider Rates</label>
              <ProviderMultiSelect />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedPair.fromSymbol}1 = {selectedPair.toSymbol}? - {selectedPeriod.label}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {stats.dateRange && (
                <span>{stats.dateRange.start} to {stats.dateRange.end}</span>
              )}
              <span>{stats.totalDataPoints} data points</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  />
                  <YAxis 
                    className="text-xs"
                    tickFormatter={(value) => `${selectedPair.toSymbol}${value.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Base rate line */}
                  {showBaseRates && (
                    <Line
                      type="monotone"
                      dataKey="baseRate"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
                      connectNulls={true}
                      name="Base Rate (Alpha Vantage)"
                    />
                  )}
                  
                  {/* Provider rate lines */}
                  {selectedProviders.map((providerName) => (
                    <Line
                      key={providerName}
                      type="monotone"
                      dataKey={`provider_${providerName}`}
                      stroke={getProviderColor(providerName)}
                      strokeWidth={2}
                      dot={{ strokeWidth: 2, r: 3 }}
                      connectNulls={true}
                      name={providerName}
                      strokeDasharray="5 5"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <TrendingUp className="w-12 h-12 mx-auto opacity-50" />
                <p>No data available for the selected configuration</p>
                <p className="text-sm">Try selecting different providers or time period</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sources Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {showBaseRates && (
              <Badge variant="secondary" className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600 mr-2" />
                Base Rates (Alpha Vantage)
              </Badge>
            )}
            {selectedProviders.map((providerName) => (
              <Badge key={providerName} variant="outline" className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: getProviderColor(providerName) }}
                />
                {providerName}
              </Badge>
            ))}
            {stats.activeSources === 0 && (
              <p className="text-sm text-muted-foreground">No data sources selected</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}