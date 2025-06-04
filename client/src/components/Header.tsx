import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon, MenuIcon, X, HelpCircle, Banknote, TrendingUp, Newspaper, Home, MessageSquare, BookOpen, Globe, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import sabiSendLogo from "@assets/SabiSend Logo with tagline short.png";

const Header = () => {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navItems = [
    { href: "/", label: "Home", icon: <Home size={18} /> },
    { href: "/compare", label: "Compare", icon: <Banknote size={18} /> },
    { href: "/trends", label: "Trends", icon: <TrendingUp size={18} /> },
    { href: "/news", label: "News", icon: <Newspaper size={18} /> },
    { href: "/blog", label: "Blog", icon: <BookOpen size={18} /> },
    { href: "/how-it-works", label: "How It Works", icon: <HelpCircle size={18} /> },
    { href: "/contact", label: "Feedback", icon: <MessageSquare size={18} /> }
  ];

  const countryPages = [
    { href: "/send-money-to-nigeria", label: "Nigeria", flag: "🇳🇬" },
    { href: "/send-money-to-ghana", label: "Ghana", flag: "🇬🇭" },
    { href: "/send-money-to-kenya", label: "Kenya", flag: "🇰🇪" },
    { href: "/send-money-to-india", label: "India", flag: "🇮🇳" },
    { href: "/send-money-to-pakistan", label: "Pakistan", flag: "🇵🇰" },
  ];

  const popularCorridors = [
    { href: "/gbp-to-ngn", label: "GBP to NGN" },
    { href: "/eur-to-ngn", label: "EUR to NGN" },
    { href: "/usd-to-ngn", label: "USD to NGN" },
    { href: "/gbp-to-inr", label: "GBP to INR" },
    { href: "/usd-to-inr", label: "USD to INR" },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center" onClick={() => window.location.href = '/'} style={{cursor: 'pointer'}}>
          <img 
            src={sabiSendLogo}
            alt="SabiSend - Your money, made wiser"
            className="h-12 w-auto md:h-14 max-w-none object-contain"
            style={{
              filter: 'contrast(1.1)',
              imageRendering: 'crisp-edges'
            }}
          />
        </div>
        
        <nav className="hidden md:flex space-x-6 items-center">
          {navItems.slice(0, 2).map((item) => (
            <div
              key={item.href}
              className={`font-medium hover:text-primary cursor-pointer ${
                location === item.href ? 'text-primary' : 'text-gray-600 dark:text-gray-300'
              } flex items-center space-x-1`}
              onClick={() => window.location.href = item.href}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
          
          {/* Countries Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="font-medium text-gray-600 dark:text-gray-300 hover:text-primary flex items-center space-x-1">
                <Globe size={18} />
                <span>Countries</span>
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Send Money To</DropdownMenuLabel>
              {countryPages.map((country) => (
                <DropdownMenuItem key={country.href} asChild>
                  <Link href={country.href} className="flex items-center space-x-2">
                    <span>{country.flag}</span>
                    <span>{country.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Popular Rates</DropdownMenuLabel>
              {popularCorridors.map((corridor) => (
                <DropdownMenuItem key={corridor.href} asChild>
                  <Link href={corridor.href}>
                    {corridor.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {navItems.slice(2).map((item) => (
            <div
              key={item.href}
              className={`font-medium hover:text-primary cursor-pointer ${
                location === item.href ? 'text-primary' : 'text-gray-600 dark:text-gray-300'
              } flex items-center space-x-1`}
              onClick={() => window.location.href = item.href}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <MoonIcon className="h-5 w-5" />
            ) : (
              <SunIcon className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileMenu}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 px-4 py-2 shadow-md">
          <nav className="flex flex-col space-y-3 py-3">
            {navItems.slice(0, 2).map((item) => (
              <div
                key={item.href}
                className={`font-medium py-2 cursor-pointer ${
                  location === item.href ? 'text-primary' : 'text-gray-600 dark:text-gray-300'
                } flex items-center space-x-2`}
                onClick={() => window.location.href = item.href}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
            
            {/* Countries Section */}
            <div className="border-t pt-3 mt-3">
              <div className="text-sm font-semibold text-gray-500 mb-2 flex items-center space-x-2">
                <Globe size={16} />
                <span>Send Money To</span>
              </div>
              {countryPages.map((country) => (
                <Link key={country.href} href={country.href}>
                  <div className="py-2 text-gray-600 dark:text-gray-300 flex items-center space-x-2 hover:text-primary cursor-pointer">
                    <span>{country.flag}</span>
                    <span>{country.label}</span>
                  </div>
                </Link>
              ))}
            </div>
            
            {navItems.slice(2).map((item) => (
              <div
                key={item.href}
                className={`font-medium py-2 cursor-pointer ${
                  location === item.href ? 'text-primary' : 'text-gray-600 dark:text-gray-300'
                } flex items-center space-x-2`}
                onClick={() => {
                  window.location.href = item.href;
                  setIsMobileMenuOpen(false);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
