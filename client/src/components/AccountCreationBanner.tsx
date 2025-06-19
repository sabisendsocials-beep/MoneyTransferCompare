import { UserPlus, TrendingUp, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const AccountCreationBanner = () => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Icon and main message */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Create a free account to unlock personalized features
              </p>
              <p className="text-xs text-gray-600 hidden sm:block">
                Get rate alerts, save preferences, and track your favorite providers
              </p>
            </div>
          </div>

          {/* Right side - Benefits and CTA */}
          <div className="flex items-center gap-3">
            {/* Benefits icons - hidden on mobile */}
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                <span>Alerts</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Trends</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Free</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
              onClick={() => window.location.href = '/login'}
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountCreationBanner;