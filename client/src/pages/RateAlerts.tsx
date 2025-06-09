/**
 * Rate Alerts Page
 * Main page for creating and managing rate alerts
 */

import { RateAlertForm } from '@/components/RateAlertForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, Mail, Clock } from 'lucide-react';

export default function RateAlerts() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Rate Alerts</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Never miss the perfect exchange rate. Get notified when your target rate is reached.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <CardTitle className="text-lg">Instant Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Receive email alerts the moment your target rate is reached
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <CardTitle className="text-lg">Smart Targeting</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Set absolute rates or percentage increases based on official or provider rates
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <CardTitle className="text-lg">Hourly Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Continuous rate monitoring with checks every hour around the clock
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Main Form */}
      <RateAlertForm />

      {/* How It Works */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            How Rate Alerts Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Alert Types</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline">Official Rate</Badge>
                  <p className="text-sm">Based on authentic Alpha Vantage market data with 10+ years of historical accuracy</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline">Best Provider</Badge>
                  <p className="text-sm">Based on the highest rate currently offered by active money transfer providers</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Trigger Options</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline">Absolute Value</Badge>
                  <p className="text-sm">Alert when rate reaches a specific target (e.g., £1 = ₦2,150)</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline">Percentage</Badge>
                  <p className="text-sm">Alert when rate increases by a percentage (e.g., +3% from current rate)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Important Notes</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Alerts are one-time notifications - create new ones for continued monitoring</li>
              <li>• Target rates must be higher than current rates (alerts for rate improvements only)</li>
              <li>• Rate checks occur every hour at the top of the hour</li>
              <li>• Email notifications include current rates and links to live comparisons</li>
              <li>• No duplicate alerts - one pending alert per email/currency pair/basis combination</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Supported Currencies */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Supported Currency Corridors</CardTitle>
          <CardDescription>
            Rate alerts are available for all major international money transfer routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">From Currencies</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">GBP - British Pound</Badge>
                <Badge variant="secondary">EUR - Euro</Badge>
                <Badge variant="secondary">USD - US Dollar</Badge>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">To Currencies</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">NGN - Nigerian Naira</Badge>
                <Badge variant="secondary">GHS - Ghanaian Cedi</Badge>
                <Badge variant="secondary">KES - Kenyan Shilling</Badge>
                <Badge variant="secondary">INR - Indian Rupee</Badge>
                <Badge variant="secondary">PKR - Pakistani Rupee</Badge>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Coverage</h4>
              <p className="text-sm text-muted-foreground">
                15 currency pairs with authentic historical data and real-time provider rate monitoring
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}