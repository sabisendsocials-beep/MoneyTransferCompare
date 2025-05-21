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
            <h2 className="text-xl font-semibold mb-6">Submit Your Feedback</h2>
            
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
                            <SelectItem value="feature_request">Feature Request</SelectItem>
                            <SelectItem value="feedback">General Feedback</SelectItem>
                            <SelectItem value="bug_report">Report a Problem</SelectItem>
                            <SelectItem value="improvement">Suggestion for Improvement</SelectItem>
                            <SelectItem value="provider_request">Request New Provider</SelectItem>
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