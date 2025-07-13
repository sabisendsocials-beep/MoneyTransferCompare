import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Instagram, Linkedin, Clock, Shield, Globe2, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Footer = () => {
  const { toast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const emailInput = form.elements.namedItem('email') as HTMLInputElement;
    
    if (emailInput.value) {
      toast({
        title: "Newsletter subscription successful",
        description: "Thank you for subscribing to our newsletter!",
      });
      emailInput.value = '';
    } else {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Value Propositions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 border-b border-gray-600 pb-12">
          <div className="flex flex-col items-center text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-3 text-white">Real-Time Comparisons</h3>
            <p className="text-gray-200 leading-relaxed">
              Get up-to-the-minute rates and fees from all major transfer providers in one place
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-3 text-white">Independent & Trusted</h3>
            <p className="text-gray-200 leading-relaxed">
              Unbiased comparisons with transparent information to help you make the best decision
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Globe2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-3 text-white">Global Coverage</h3>
            <p className="text-gray-200 leading-relaxed">
              Compare transfers between multiple countries and currencies worldwide
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-primary rounded-full p-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <path d="M12 12V6"></path>
                  <path d="M12 12h6"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">SabiSend</h3>
            </div>
            <p className="text-gray-200 text-sm mb-4">
              SabiSend helps you find the best international money transfer options with real-time comparisons of rates, fees, and delivery times.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="https://www.facebook.com/sabisend" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition duration-200">
                <Facebook size={18} />
              </a>
              <a href="https://x.com/sabisend_" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition duration-200">
                <Twitter size={18} />
              </a>
              <a href="https://www.instagram.com/sabisend" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition duration-200">
                <Instagram size={18} />
              </a>
              <a href="https://www.tiktok.com/@sabisend_fx" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition duration-200">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.321 5.562a5.122 5.122 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.294-1.98-1.294-3.281V1h-3.061v14.519c0 1.294-.527 2.466-1.376 3.315-.849.849-1.98 1.376-3.274 1.376-2.54 0-4.61-2.07-4.61-4.61s2.07-4.61 4.61-4.61c.849 0 1.617.241 2.302.644V7.573a8.685 8.685 0 0 0-2.302-.322c-4.774 0-8.671 3.897-8.671 8.671S4.462 24.593 9.236 24.593s8.671-3.897 8.671-8.671V9.236a9.28 9.28 0 0 0 5.414 1.733V7.573c-1.617 0-3.073-.723-4.061-1.825-.402-.446-.724-.966-.966-1.536-.12-.241-.202-.523-.282-.805h-3.315c.08.322.161.604.241.886.161.563.402 1.086.724 1.572.966 1.375 2.505 2.263 4.301 2.263v3.396a5.446 5.446 0 0 1-1.774-.322v6.597c0 2.705-2.224 4.929-4.929 4.929s-4.929-2.224-4.929-4.929 2.224-4.929 4.929-4.929c.885 0 1.693.241 2.425.644V7.814a8.36 8.36 0 0 0-2.425-.362c-4.532 0-8.268 3.736-8.268 8.268s3.736 8.268 8.268 8.268 8.268-3.736 8.268-8.268V9.719a9.043 9.043 0 0 0 5.173 1.613V7.573c-1.533 0-2.908-.684-3.857-1.774-.402-.443-.684-.925-.925-1.457-.08-.201-.161-.443-.201-.684z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-3 text-sm text-gray-200">
              <li>
                <Link href="/" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Compare Providers
                </Link>
              </li>
              <li>
                <Link href="/trends" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Exchange Rate Trends
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Financial News
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Money Transfer Guides</h3>
            <ul className="space-y-3 text-sm text-gray-200">
              <li>
                <Link href="/send-money-to-nigeria" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Send Money to Nigeria
                </Link>
              </li>
              <li>
                <Link href="/send-money-to-ghana" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Send Money to Ghana
                </Link>
              </li>
              <li>
                <Link href="/send-money-to-kenya" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Send Money to Kenya
                </Link>
              </li>
              <li>
                <Link href="/send-money-to-india" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Send Money to India
                </Link>
              </li>
              <li>
                <Link href="/send-money-to-pakistan" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Send Money to Pakistan
                </Link>
              </li>
              <li>
                <Link href="/gbp-to-ngn" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  GBP to NGN Exchange Rate
                </Link>
              </li>
              <li>
                <Link href="/eur-to-ngn" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  EUR to NGN Exchange Rate
                </Link>
              </li>
              <li>
                <Link href="/gbp-to-ghs" className="hover:text-primary transition duration-200 flex items-center">
                  <span className="bg-gray-800 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                  GBP to GHS Exchange Rate
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Stay Updated</h3>
            <p className="text-gray-200 text-sm mb-4 leading-relaxed">
              Subscribe to our newsletter for the latest exchange rates, news and money-saving tips.
            </p>
            <form onSubmit={handleSubscribe} className="flex">
              <Input
                type="email"
                name="email"
                placeholder="Your email"
                className="flex-1 rounded-l-lg bg-gray-800 border-gray-700 text-white focus:ring-primary focus:border-primary"
              />
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white rounded-l-none">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-200 text-sm mb-4 md:mb-0">
            &copy; {currentYear} SabiSend. All rights reserved.
            <span className="block text-xs mt-1 opacity-50">Impact-Site-Verification: 05a24e7b-12ee-477c-876c-027d1184abf7</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-200">
            <a href="#" className="hover:text-primary transition duration-200">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition duration-200">Terms of Service</a>
            <a href="#" className="hover:text-primary transition duration-200">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
