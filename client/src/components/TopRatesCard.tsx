import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Trophy, ArrowRight, Clock, RefreshCw, ChevronDown, 
  TrendingUp, Zap, ExternalLink, Share2, Image, Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import sabiSendLogo from "@assets/SabiSend Logo with tagline short.png";

interface TransferResult {
  providerId: number;
  providerName: string;
  providerLogo?: string;
  exchangeRate: number;
  fee: number;
  transferTime: string;
  totalCost: number;
  receivedAmount: number;
  sendAmount: number;
  rateSource?: string;
  lastUpdated?: string;
  rating?: number;
}

const currencySymbols: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  INR: "₹",
  PKR: "Rs",
};

const currencyFlags: Record<string, string> = {
  GBP: "🇬🇧",
  EUR: "🇪🇺",
  USD: "🇺🇸",
  NGN: "🇳🇬",
  GHS: "🇬🇭",
  KES: "🇰🇪",
  INR: "🇮🇳",
  PKR: "🇵🇰",
};

const fromCurrencies = ["GBP", "EUR", "USD"];
const toCurrencies = ["NGN", "GHS", "KES", "INR", "PKR"];

const formatRate = (rate: number): string => {
  return rate.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTime = (time: string): string => {
  const now = new Date();
  return now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

interface TopRatesCardProps {
  className?: string;
  defaultFrom?: string;
  defaultTo?: string;
  showShareButton?: boolean;
}

const TopRatesCard = ({ 
  className = "",
  defaultFrom = "GBP",
  defaultTo = "NGN",
  showShareButton = false
}: TopRatesCardProps) => {
  const [fromCurrency, setFromCurrency] = useState(defaultFrom);
  const [toCurrency, setToCurrency] = useState(defaultTo);
  const [showTop5, setShowTop5] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const shareableRef = useRef<HTMLDivElement>(null);

  const generateShareableImage = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = 1200;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const brandPrimary = '#3b82f6';
    const brandDark = '#1e3a8a';
    const textDark = '#1f2937';
    const textMuted = '#6b7280';
    const accentGreen = '#10b981';

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      const logoImg = await loadImage(sabiSendLogo);
      const logoHeight = 60;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
      ctx.drawImage(logoImg, 60, 30, logoWidth, logoHeight);
    } catch {
      ctx.fillStyle = brandPrimary;
      ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
      ctx.fillText('SabiSend', 60, 70);
    }

    ctx.fillStyle = textDark;
    ctx.font = 'bold 40px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Top ${fromCurrency} to ${toCurrency} Rates`, 60, 140);

    ctx.fillStyle = textMuted;
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    const now = new Date();
    ctx.fillText(`Updated: ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 60, 175);

    const ratesToShow = sortedResults.slice(0, 5);
    const startY = 210;
    const rowHeight = 95;

    ratesToShow.forEach((result, index) => {
      const yPos = startY + (index * rowHeight);
      
      ctx.fillStyle = index === 0 ? '#f0fdf4' : '#f9fafb';
      ctx.beginPath();
      ctx.roundRect(60, yPos, width - 120, 85, 12);
      ctx.fill();
      
      ctx.strokeStyle = index === 0 ? accentGreen : '#e5e7eb';
      ctx.lineWidth = index === 0 ? 2 : 1;
      ctx.stroke();
      
      const medalColors = ['#fbbf24', '#9ca3af', '#d97706', '#9ca3af', '#9ca3af'];
      ctx.fillStyle = medalColors[index];
      ctx.beginPath();
      ctx.arc(115, yPos + 42, 26, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = index < 3 ? '#ffffff' : '#374151';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${index + 1}`, 115, yPos + 50);
      ctx.textAlign = 'left';
      
      ctx.fillStyle = textDark;
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.fillText(result.providerName, 165, yPos + 38);
      
      ctx.fillStyle = index === 0 ? accentGreen : brandPrimary;
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      const rateText = `${currencySymbols[toCurrency]}${formatRate(result.exchangeRate)}`;
      ctx.fillText(rateText, 165, yPos + 70);
      
      const rateWidth = ctx.measureText(rateText).width;
      ctx.fillStyle = textMuted;
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillText(`per ${currencySymbols[fromCurrency]}1`, 175 + rateWidth, yPos + 70);

      if (index === 0) {
        ctx.fillStyle = accentGreen;
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        const bestLabel = 'BEST RATE';
        const labelWidth = ctx.measureText(bestLabel).width + 16;
        ctx.beginPath();
        ctx.roundRect(width - 60 - labelWidth - 20, yPos + 30, labelWidth, 26, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(bestLabel, width - 60 - labelWidth - 12, yPos + 48);
      }
    });

    const footerY = height - 80;
    ctx.fillStyle = brandPrimary;
    ctx.beginPath();
    ctx.roundRect(60, footerY, width - 120, 55, 10);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Compare rates at sabisend.com', width / 2, footerY + 35);
    ctx.textAlign = 'left';

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleShare = async () => {
    if (sortedResults.length === 0) {
      toast({
        title: "No rates to share",
        description: "Please wait for rates to load",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingImage(true);
    
    try {
      const blob = await generateShareableImage();
      if (!blob) throw new Error('Failed to generate image');

      const shareUrl = `${window.location.origin}/results?amount=100&fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&calculationMode=send`;
      
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `sabisend-rates-${fromCurrency}-${toCurrency}.png`, { type: 'image/png' });
        const shareData = {
          files: [file],
          title: `Best ${fromCurrency} to ${toCurrency} Rates - SabiSend`,
          text: `Check out today's best exchange rates! Compare at ${shareUrl}`,
        };
        
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          downloadImage(blob);
        }
      } else {
        downloadImage(blob);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast({
          title: "Share cancelled",
          description: "You can download the image instead",
        });
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sabisend-rates-${fromCurrency}-${toCurrency}.png`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Image downloaded!",
      description: "Share it on social media with a link to sabisend.com",
    });
  };

  const { data: results, isLoading, error, refetch, dataUpdatedAt } = useQuery<TransferResult[]>({
    queryKey: ['/api/compare', fromCurrency, toCurrency, 'top-rates'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/compare', {
        amount: 100,
        fromCurrency,
        toCurrency,
        type: "send"
      });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const sortedResults = Array.isArray(results) 
    ? results.slice().sort((a, b) => b.exchangeRate - a.exchangeRate).slice(0, showTop5 ? 5 : 3)
    : [];

  const displayCount = showTop5 ? 5 : 3;
  const totalProviders = results?.length || 0;
  const hiddenCount = Math.max(0, totalProviders - displayCount);

  const lastUpdated = dataUpdatedAt 
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  const compareUrl = `/results?amount=100&fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&calculationMode=send`;

  return (
    <Card className={`border-2 shadow-lg ${className}`} data-testid="top-rates-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Top Rates Right Now</CardTitle>
              <p className="text-sm text-gray-500">Best exchange rates from all providers</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger className="w-[100px]" data-testid="from-currency-select">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span>{currencyFlags[fromCurrency]}</span>
                    <span>{fromCurrency}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {fromCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    <span className="flex items-center gap-2">
                      <span>{currencyFlags[currency]}</span>
                      <span>{currency}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
            
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger className="w-[100px]" data-testid="to-currency-select">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span>{currencyFlags[toCurrency]}</span>
                    <span>{toCurrency}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {toCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    <span className="flex items-center gap-2">
                      <span>{currencyFlags[currency]}</span>
                      <span>{currency}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <p className="text-xs text-gray-500">Quick switch:</p>
          {toCurrencies.map((currency) => (
            <button
              key={currency}
              onClick={() => setToCurrency(currency)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                toCurrency === currency 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              data-testid={`quick-switch-${currency}`}
            >
              {currencyFlags[currency]} {currency}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-3">Unable to load rates</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {sortedResults?.map((provider, index) => (
                <div 
                  key={provider.providerId}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    index === 0 
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200" 
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                  data-testid={`provider-row-${provider.providerId}`}
                >
                  <div className="flex items-center gap-3">
                    {index === 0 && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs">
                        BEST
                      </Badge>
                    )}
                    {index > 0 && (
                      <span className="text-sm font-medium text-gray-400 w-6">#{index + 1}</span>
                    )}
                    <div>
                      <p className={`font-semibold ${index === 0 ? "text-gray-900" : "text-gray-700"}`}>
                        {provider.providerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Fee: {currencySymbols[fromCurrency]}{provider.fee.toFixed(2)} • {provider.transferTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold ${index === 0 ? "text-lg text-green-600" : "text-gray-800"}`}>
                      {currencySymbols[fromCurrency]}1 = {currencySymbols[toCurrency]}{formatRate(provider.exchangeRate)}
                    </p>
                    {index === 0 && sortedResults.length > 1 && (
                      <p className="text-xs text-green-600">
                        +{currencySymbols[toCurrency]}{formatRate(provider.exchangeRate - (sortedResults[1]?.exchangeRate || 0))} vs #2
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalProviders > 3 && (
              <button
                onClick={() => setShowTop5(!showTop5)}
                className="w-full mt-3 py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-1"
                data-testid="toggle-top5-btn"
              >
                {showTop5 ? "Show Top 3" : `+${hiddenCount} more providers`}
                <ChevronDown className={`h-4 w-4 transition-transform ${showTop5 ? "rotate-180" : ""}`} />
              </button>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>Updated {lastUpdated || "just now"}</span>
                <button onClick={() => refetch()} className="text-primary hover:underline ml-2">
                  <RefreshCw className="h-3 w-3 inline mr-1" />
                  Refresh
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {showShareButton && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleShare}
                    disabled={isGeneratingImage || isLoading}
                    className="gap-2"
                    data-testid="share-rates-btn"
                  >
                    {isGeneratingImage ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Image className="h-4 w-4" />
                        Share Image
                      </>
                    )}
                  </Button>
                )}
                <Link href={compareUrl}>
                  <Button className="gap-2" data-testid="see-full-comparison-btn">
                    See Full Comparison
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopRatesCard;
