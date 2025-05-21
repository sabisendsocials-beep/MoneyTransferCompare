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
    question: "How can I request a new provider to be added?",
    answer: "You can easily request a new provider by submitting a feature request through this page. Select 'Request New Provider' from the dropdown menu and include details about which money transfer provider you'd like us to add. We prioritize adding providers based on user demand."
  },
  {
    question: "What type of feedback is most helpful?",
    answer: "The most helpful feedback includes specific details about your experience using our platform and concrete suggestions for improvement. Whether you've spotted an issue with our rate comparison, have ideas for new features, or suggestions about the user interface - we value all types of constructive feedback."
  },
  {
    question: "How do you decide which features to implement?",
    answer: "We prioritize new features based on several factors, with user feedback being the most important one. We look at how many users have requested a feature, how it would improve the overall experience, and the technical feasibility of implementation. Your suggestions directly influence our development roadmap!"
  },
  {
    question: "Can I suggest new destination countries to include?",
    answer: "Absolutely! We're continuously expanding our coverage to include more countries and currencies. If you'd like us to add support for a specific country or currency pair, please submit a feature request and we'll evaluate adding it to our platform."
  },
  {
    question: "How long does it typically take for a feature request to be implemented?",
    answer: "Implementation time varies depending on the complexity of the feature and our current development priorities. Simple features might be implemented within weeks, while more complex ones could take several months. We always strive to keep improving the platform based on your feedback."
  }
];

const ContactUs = () => {
  // For SEO
  document.title = "Feedback & Feature Requests | MoneyTrans";
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  
  // Initialize the form
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      topic: "feature_request", // Default to feature request
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
      
      console.log("Feedback submitted:", data);
      setSubmitted(true);
      
      toast({
        title: "Feedback submitted successfully",
        description: "Thank you for helping us improve our platform!",
        variant: "default",
      });
      
      // Reset form
      form.reset();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      
      toast({
        title: "Something went wrong",
        description: "Your feedback couldn't be submitted. Please try again later.",
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
        <h1 className="text-3xl font-bold mb-4">Feedback & Feature Requests</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We're constantly improving our platform based on your suggestions! 
          Share your ideas, report issues, or request new features to help us make our service better for you.
        </p>
      </div>
      
      <div className="grid md:grid-cols-1 gap-10">        
        {/* Contact Form */}
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6 text-center">Share Your Ideas with Us</h2>
            
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Thank You For Your Feedback!</h3>
                <p className="text-gray-600 mb-6">
                  Your suggestions help us improve our platform. We review all feedback and prioritize new features based on user demand.
                </p>
                <Button 
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                >
                  Submit Another Idea
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
                  
                  {/* Topic Tiles */}
                  <div className="mb-6">
                    <label className="text-sm font-medium leading-none">
                      What is your feedback about?
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${form.watch('topic') === 'feature_request' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                        onClick={() => form.setValue('topic', 'feature_request')}
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <span className="font-medium text-gray-800">Feature Request</span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Suggest a new feature</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${form.watch('topic') === 'provider_request' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                        onClick={() => form.setValue('topic', 'provider_request')}
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        </div>
                        <span className="font-medium text-gray-800">Add New Provider</span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Request a new transfer service</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${form.watch('topic') === 'bug_report' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                        onClick={() => form.setValue('topic', 'bug_report')}
                      >
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </div>
                        <span className="font-medium text-gray-800">Report an Issue</span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Tell us what's not working</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${form.watch('topic') === 'improvement' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                        onClick={() => form.setValue('topic', 'improvement')}
                      >
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </div>
                        <span className="font-medium text-gray-800">Improve Design</span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Suggest UI/UX improvements</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${form.watch('topic') === 'new_currency' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                        onClick={() => form.setValue('topic', 'new_currency')}
                      >
                        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10a15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        </div>
                        <span className="font-medium text-gray-800">Add Currency</span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Request a new currency pair</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${form.watch('topic') === 'feedback' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                        onClick={() => form.setValue('topic', 'feedback')}
                      >
                        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </div>
                        <span className="font-medium text-gray-800">General Feedback</span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Share your thoughts</span>
                      </div>
                    </div>
                    {form.formState.errors.topic && (
                      <p className="text-sm font-medium text-destructive mt-2">
                        {form.formState.errors.topic.message as string}
                      </p>
                    )}
                  </div>
                  
                  {/* Message Field */}
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Idea or Feedback</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your feature idea or feedback in detail. What would you like to see improved? How would this enhance your experience?" 
                            className="min-h-[150px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          We value your input! Your suggestions directly influence our development priorities.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Feature Request"
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