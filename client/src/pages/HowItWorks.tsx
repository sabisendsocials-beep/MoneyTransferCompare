import { Helmet } from "react-helmet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Banknote, TrendingUp, Clock, ArrowRight, CheckCircle, HelpCircle, ShieldCheck } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      title: "Enter Your Transfer Details",
      description: "Tell us how much you want to send or how much you want the recipient to receive.",
      icon: <Search className="h-8 w-8 text-primary" />,
    },
    {
      title: "Compare Your Options",
      description: "We'll show you a comparison of rates, fees, and delivery times across multiple providers.",
      icon: <Banknote className="h-8 w-8 text-primary" />,
    },
    {
      title: "Choose the Best Provider",
      description: "Select the option that suits your needs best - whether that's the lowest cost, fastest transfer, or best exchange rate.",
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
    },
    {
      title: "Complete Your Transfer",
      description: "Go directly to your chosen provider's website to complete your transfer securely.",
      icon: <ArrowRight className="h-8 w-8 text-primary" />,
    },
  ];

  const benefits = [
    {
      title: "Save Money",
      description: "Our comparison tool helps you find the lowest fees and best exchange rates, potentially saving you significant amounts on larger transfers.",
      icon: <Banknote className="h-6 w-6 text-primary" />,
    },
    {
      title: "Save Time",
      description: "Instead of checking multiple providers manually, see all your options in one place in seconds.",
      icon: <Clock className="h-6 w-6 text-primary" />,
    },
    {
      title: "Make Informed Decisions",
      description: "Get transparent information about fees, exchange rates, and transfer times to choose what's best for your specific needs.",
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
    },
    {
      title: "Enjoy Peace of Mind",
      description: "We only compare licensed and regulated money transfer providers to ensure your money is always secure.",
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    },
  ];

  const faqs = [
    {
      question: "Is SabiSend a money transfer service?",
      answer: "No, SabiSend is not a money transfer service. We are a comparison platform that helps you find the best money transfer provider for your needs. We don't handle any transfers ourselves, but instead direct you to licensed and regulated providers."
    },
    {
      question: "How does SabiSend make money?",
      answer: "SabiSend is a free service for users. We may receive a commission from some of the providers listed on our site when users click through to their website and complete a transfer. This does not affect our rankings or recommendations, which are based solely on what offers the best value to users."
    },
    {
      question: "Are the exchange rates shown on SabiSend up-to-date?",
      answer: "Yes, we aim to show the most current exchange rates available. Our rates are updated regularly throughout the day to reflect the latest information from providers. However, exchange rates can fluctuate rapidly, so the final rate you receive may differ slightly from what was shown on our site."
    },
    {
      question: "What currencies and countries do you support?",
      answer: "We support a wide range of currencies and transfer corridors, with a focus on popular destinations like Nigeria, Ghana, Kenya, India, and more. We're constantly expanding our coverage to include more countries and currencies."
    },
    {
      question: "Why do different providers offer different exchange rates?",
      answer: "Providers set their own exchange rates based on various factors including the mid-market rate, their operating costs, profit margins, and the level of risk associated with different currencies. Some providers offer rates closer to the mid-market rate but charge separate fees, while others build their margin into the exchange rate."
    },
    {
      question: "How do I know which provider is best for me?",
      answer: "The best provider depends on your specific needs. If you want to maximise the amount received, look for the provider with the highest 'recipient gets' amount. If speed is important, check the estimated delivery times. Consider factors like payment methods, pickup options, and customer service as well."
    }
  ];

  return (
    <>
      <Helmet>
        <title>How It Works | SabiSend - International Money Transfer Comparison</title>
        <meta 
          name="description" 
          content="Learn how SabiSend helps you find the best money transfer options. Compare rates, fees, and delivery times to save money on international transfers."
        />
      </Helmet>
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">How SabiSend Works</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Simple, transparent comparisons to help you find the best international money transfer options
          </p>
        </div>
      </section>
      
      {/* Steps Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Find the Best Money Transfer in 4 Simple Steps
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="border-2 border-gray-100 dark:border-gray-800 hover:border-primary hover:shadow-md transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="mb-4 flex justify-center">
                    <div className="bg-primary/10 p-4 rounded-full">
                      {step.icon}
                    </div>
                  </div>
                  <div className="bg-primary/10 text-primary text-center w-8 h-8 rounded-full mx-auto mb-4 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-center">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-center">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why Use SabiSend?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 mr-4">
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-full shadow-sm">
                    {benefit.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* FAQs Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center">
                      <HelpCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                      <span>{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-300 pl-7">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-16 bg-primary-50 dark:bg-primary-900/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Find the Best Transfer Option?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Start comparing providers now to save money on your international transfers.
          </p>
          <a 
            href="/compare" 
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 md:py-4 md:text-lg md:px-8"
          >
            Compare Transfer Providers
            <ArrowRight className="ml-2 h-5 w-5" />
          </a>
        </div>
      </section>
    </>
  );
};

export default HowItWorks;