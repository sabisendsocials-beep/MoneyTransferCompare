import LiveRateDashboard from "@/components/LiveRateDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, Layout, Zap } from "lucide-react";

const PreviewDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Badge variant="outline" className="mb-2 text-orange-600 border-orange-300 bg-orange-50">
            PREVIEW MODE
          </Badge>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Live Rate Dashboard Proposal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            This is a preview of the proposed Live Rate Dashboard component. It shows real-time 
            "best rates" from all providers, giving users immediate value before they even 
            start a comparison.
          </p>
        </div>

        <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Info className="h-5 w-5" />
              Proposal Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-blue-700 dark:text-blue-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Immediate Value:</strong> Users see best rates instantly without needing to use the calculator</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Return Visits:</strong> Users bookmark the page to check rates regularly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Trust Building:</strong> Shows SabiSend has real, live data from multiple providers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Conversion Funnel:</strong> Each card links to full comparison for that corridor</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>SEO Boost:</strong> Rich, frequently updated content for search engines</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Layout className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Option 1: Grid Layout</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Full dashboard with cards showing best rates for each currency corridor. 
            Recommended placement: Below the hero section, before the rate alert module.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-12">
          <LiveRateDashboard showTitle={true} maxCards={6} layout="grid" />
        </div>

        <Separator className="my-8" />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Option 2: Ticker Banner</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Compact ticker showing live rates. Could be placed at the very top of the page 
            or just below the navigation bar for maximum visibility.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-12">
          <LiveRateDashboard layout="ticker" />
        </div>

        <Separator className="my-8" />

        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Zap className="h-5 w-5" />
              Implementation Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-green-700 dark:text-green-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span><strong>Auto-refresh:</strong> Rates update every 60 seconds automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span><strong>Manual refresh:</strong> Users can click refresh button for instant update</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span><strong>Data source:</strong> Uses existing /api/best-rates endpoint (no backend changes needed)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span><strong>Responsive:</strong> Works on mobile, tablet, and desktop</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span><strong>Configurable:</strong> Can show 3, 6, or 9 cards depending on placement</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>Note:</strong> This is a preview page only. The current homepage has not been modified. 
            Once approved, this component can be added to the homepage in your preferred location.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreviewDashboard;
