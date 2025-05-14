import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon, MenuIcon, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

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

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M12 12V6"></path>
            <path d="M12 12h6"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">TransferWise</h1>
        </div>
        
        <nav className="hidden md:flex space-x-6">
          <Link href="/">
            <a className={`font-medium hover:text-primary ${location === '/' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>
              Home
            </a>
          </Link>
          <Link href="/compare">
            <a className={`font-medium hover:text-primary ${location === '/compare' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>
              Compare
            </a>
          </Link>
          <Link href="/trends">
            <a className={`font-medium hover:text-primary ${location === '/trends' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>
              Trends
            </a>
          </Link>
          <Link href="/news">
            <a className={`font-medium hover:text-primary ${location === '/news' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>
              News
            </a>
          </Link>
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
            <Link href="/">
              <a 
                className={`font-medium py-2 ${location === '/' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </a>
            </Link>
            <Link href="/compare">
              <a 
                className={`font-medium py-2 ${location === '/compare' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Compare
              </a>
            </Link>
            <Link href="/trends">
              <a 
                className={`font-medium py-2 ${location === '/trends' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Trends
              </a>
            </Link>
            <Link href="/news">
              <a 
                className={`font-medium py-2 ${location === '/news' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                News
              </a>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
