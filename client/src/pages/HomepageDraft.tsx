import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Bell, TrendingUp, Sparkles, 
  CheckCircle2, Shield, Clock, Globe 
} from "lucide-react";
import TopRatesCard from "@/components/TopRatesCard";
import EnhancedRateTrends from "@/components/EnhancedRateTrends";
import { RateAlertForm } from "@/components/RateAlertForm";
import { MarketCommentary } from "@/components/MarketCommentary";
import NewsSection from "@/components/NewsSection";

const HomepageDraft = () => {
  return (
    <div className="min-h-screen">
      <div className="bg-yellow-50 border-b border-yellow-200 py-2">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
            DRAFT PREVIEW
          </Badge>
          <span className="ml-2 text-sm text-gray-600">
            This is a proposed homepage redesign for review
          </span>
        </div>
      </div>

      <section className="relative bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-800 py-10 md:py-16">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-30" 
            style={{
              backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.15) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.15) 2%, transparent 0%)",
              backgroundSize: "100px 100px"
            }}>
          </div>
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-emerald-500/10 filter blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 filter blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Don't send on habit.{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                Send on facts.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
              SabiSend compares exchange rates from 15+ providers in real time, 
              helping you save on every international transfer.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm text-blue-200">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Free to use</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>Independent & unbiased</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>Updated every minute</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <TopRatesCard 
              className="bg-white shadow-2xl border-0" 
              defaultFrom="GBP" 
              defaultTo="NGN" 
            />
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Provider Ranking Trends</h2>
            </div>
            <p className="text-gray-600">Track provider movement over time - see who's offering the best rates</p>
          </div>
          <EnhancedRateTrends />
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Bell className="h-6 w-6 text-amber-500" />
                <h2 className="text-2xl font-bold text-gray-900">Rate Alerts</h2>
              </div>
              <p className="text-gray-600">Get notified when rates hit your target</p>
            </div>
            <RateAlertForm />
          </div>
        </div>
      </section>

      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Sabi Buzz</h2>
              <Badge variant="secondary" className="text-xs">AI Insights</Badge>
            </div>
            <MarketCommentary fromCurrency="GBP" toCurrency="NGN" />
          </div>
        </div>
      </section>

      <section className="py-8 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to compare all providers?
            </h2>
            <p className="text-gray-600 mb-6">
              See detailed fees, transfer times, and customer ratings for every provider
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/compare">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <Globe className="h-5 w-5" />
                  Full Rate Comparison
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/trends">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  <TrendingUp className="h-5 w-5" />
                  View Exchange Rate Trends
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <NewsSection />
    </div>
  );
};

export default HomepageDraft;
