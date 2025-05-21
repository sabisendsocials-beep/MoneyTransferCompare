import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Mail, Phone, MapPin, MessageSquare, AlertCircle, 
  Info, Clock, Check, Loader2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Form schema
const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  topic: z.string().min(1, { message: "Please select a topic" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" }).max(1000, { message: "Message cannot exceed 1000 characters" }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

// FAQ items
const faqItems = [
  {
    question: "How does the rate comparison work?",
    answer: "Our platform collects real exchange rates from over 12 trusted money transfer providers. We update rates multiple times daily to ensure you always have the most current information. The comparison shows fees, exchange rates, and the total amount recipients will receive so you can make informed decisions."
  },
  {
    question: "Are there any fees for using this service?",
    answer: "No, our rate comparison service is completely free to use. We help you find the best rates without charging any fees. We may receive commissions from some providers when you choose their services, but this never affects the rates displayed or our rankings."
  },
  {
    question: "How often are the exchange rates updated?",
    answer: "Exchange rates are updated multiple times daily (at 6 AM, 2 PM, and 10 PM UTC). Each rate shows the exact time it was last updated, so you always know how current the information is."
  },
  {
    question: "Can I send money directly through your platform?",
    answer: "We don't process money transfers directly. When you find a provider with favorable rates, we direct you to their official website where you can complete your transaction securely."
  },
  {
    question: "How do you verify the accuracy of exchange rates?",
    answer: "We employ multiple verification methods to ensure rate accuracy, including direct API connections with providers when available, and sophisticated web scraping technology to capture rates from official provider websites. We also have data validation systems that flag any suspicious rates."
  }
];

const ContactUs = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  
  // Initialize the form
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      topic: "",
      message: "",
    },
  });
  
  // Form submission handler
  const onSubmit = async (data: ContactFormValues) => {
    setSubmitting(true);
    
    try {
      // In a real implementation, you would send this data to your backend
      // Simulating API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("Form submitted:", data);
      setSubmitted(true);
      
      toast({
        title: "Message sent successfully",
        description: "We've received your message and will respond shortly.",
        variant: "default",
      });
      
      // Reset form
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      
      toast({
        title: "Something went wrong",
        description: "Your message couldn't be sent. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Have questions about our service? Looking for more information? 
          Or maybe you have a feature suggestion? We'd love to hear from you!
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-10">
        {/* Contact Details */}
        <div className="md:col-span-1">
          <div className="bg-blue-50 rounded-lg p-6 h-full">
            <h2 className="text-xl font-semibold mb-6">Get In Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium">Email</h3>
                  <p className="text-gray-600">support@ratecompare.com</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium">Support Hours</h3>
                  <p className="text-gray-600">Monday - Friday: 9AM - 5PM UTC</p>
                  <p className="text-gray-600">Weekend: Closed</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium">Response Time</h3>
                  <p className="text-gray-600">We typically respond within 24 hours during business days.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-blue-100">
              <h3 className="font-medium mb-3">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                </a>
                <a href="#" className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
                </a>
                <a href="#" className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-white hover:bg-pink-700 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact Form */}
        <div className="md:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Send Us a Message</h2>
            
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                <p className="text-gray-600 mb-6">Your message has been sent successfully. We'll get back to you soon.</p>
                <Button 
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Name Field */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Email Field */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Topic Select */}
                  <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general_enquiry">General Enquiry</SelectItem>
                            <SelectItem value="feature_request">Feature Request</SelectItem>
                            <SelectItem value="bug_report">Report a Problem</SelectItem>
                            <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                            <SelectItem value="feedback">Feedback</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Message Field */}
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please describe your question or request in detail..." 
                            className="min-h-[150px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum 1000 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {faqItems.map((item, index) => (
            <div 
              key={index} 
              className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-3 flex items-start">
                <MessageSquare className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" />
                <span>{item.question}</span>
              </h3>
              <p className="text-gray-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContactUs;