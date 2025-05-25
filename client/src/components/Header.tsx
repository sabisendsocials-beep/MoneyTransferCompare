import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon, MenuIcon, X, HelpCircle, Banknote, TrendingUp, Newspaper, Home, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import sabiSendLogo from "@assets/SabiSend Logo with tagline.png";

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
    { href: "/how-it-works", label: "How It Works", icon: <HelpCircle size={18} /> },
    { href: "/contact", label: "Feedback", icon: <Newspaper size={18} /> }
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center" onClick={() => window.location.href = '/'} style={{cursor: 'pointer'}}>
          <img 
            src={sabiSendLogo}
            alt="SabiSend - Your money, made wiser"
            className="h-16 w-auto md:h-20"
          />
        </div>
        
        <nav className="hidden md:flex space-x-6">
          {navItems.map((item) => (
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
            {navItems.map((item) => (
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
