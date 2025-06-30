import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Building2, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import ImprovedEnhancedRateTrends from "@/components/ImprovedEnhancedRateTrends";

export default function EnhancedTrendsTest() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Enhanced Rate Trends
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Compare base rates with provider rates over time
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center">
              <BarChart3 className="w-3 h-3 mr-1" />
              Test Page
            </Badge>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Base Rate Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track official exchange rate movements from Alpha Vantage historical data and daily increments
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-green-600" />
                Provider Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Compare rates from multiple money transfer providers including Wise, Remitly, and WorldRemit
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                Multi-Source Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Enable or disable specific data sources with individual styling and trend analysis
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Rate Trends Component */}
        <ImprovedEnhancedRateTrends />

        {/* Feature Details */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Enhancement Features</CardTitle>
              <CardDescription>
                Key improvements over the standard rate trends display
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Data Source Control</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• Toggle base rates on/off</li>
                    <li>• Select specific providers to display</li>
                    <li>• Visual indicators for data source types</li>
                    <li>• Dynamic legend updates</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Enhanced Visualization</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• Different line styles for base vs provider rates</li>
                    <li>• Color-coded provider identification</li>
                    <li>• Improved tooltip with provider details</li>
                    <li>• Responsive chart scaling</li>
                  </ul>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Technical Implementation</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <strong>API Endpoints:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• /api/rate-trends - Base rate data</li>
                      <li>• /api/provider-rate-trends - Provider data</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Data Processing:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• Real-time provider filtering</li>
                      <li>• Date-based data alignment</li>
                      <li>• Dynamic chart data combination</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}