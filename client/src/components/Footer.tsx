import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
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

  return (
    <footer className="bg-gray-800 text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">TransferWise</h3>
            <p className="text-gray-400 text-sm">
              Find the best money transfer options from UK to Nigeria with real-time comparisons of rates, fees, and delivery times.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/">
                  <a className="hover:text-white transition duration-200">Home</a>
                </Link>
              </li>
              <li>
                <Link href="/compare">
                  <a className="hover:text-white transition duration-200">Compare Providers</a>
                </Link>
              </li>
              <li>
                <Link href="/trends">
                  <a className="hover:text-white transition duration-200">Exchange Rate Trends</a>
                </Link>
              </li>
              <li>
                <Link href="/news">
                  <a className="hover:text-white transition duration-200">Nigeria Financial News</a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Popular Corridors</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/compare?from=GBP&to=NGN">
                  <a className="hover:text-white transition duration-200">UK to Nigeria</a>
                </Link>
              </li>
              <li>
                <Link href="/compare?from=GBP&to=GHS">
                  <a className="hover:text-white transition duration-200">UK to Ghana</a>
                </Link>
              </li>
              <li>
                <Link href="/compare?from=GBP&to=KES">
                  <a className="hover:text-white transition duration-200">UK to Kenya</a>
                </Link>
              </li>
              <li>
                <Link href="/compare?from=GBP&to=ZAR">
                  <a className="hover:text-white transition duration-200">UK to South Africa</a>
                </Link>
              </li>
              <li>
                <Link href="/compare?from=GBP&to=INR">
                  <a className="hover:text-white transition duration-200">UK to India</a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Stay Updated</h3>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe to our newsletter for the latest exchange rates and news.
            </p>
            <form onSubmit={handleSubscribe} className="flex">
              <Input
                type="email"
                name="email"
                placeholder="Your email"
                className="flex-1 rounded-l-lg bg-gray-700 border-gray-600 text-white focus:ring-primary"
              />
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white rounded-l-none">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 mt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} TransferWise. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-white transition duration-200">
              <Facebook size={18} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition duration-200">
              <Twitter size={18} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition duration-200">
              <Instagram size={18} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition duration-200">
              <Linkedin size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
