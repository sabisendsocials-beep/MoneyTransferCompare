import { Helmet } from "react-helmet";
import RateTrends from "@/components/RateTrends";

const Trends = () => {
  return (
    <>
      <Helmet>
        <title>GBP to NGN Exchange Rate Trends | SabiSend</title>
        <meta 
          name="description" 
          content="View historical exchange rate trends for GBP to NGN. Monitor rate changes, set rate alerts, and make informed decisions for your money transfers."
        />
      </Helmet>
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4 text-center">GBP to NGN Exchange Rate Trends</h1>
          <p className="text-center text-blue-100 max-w-2xl mx-auto">
            Monitor historical exchange rates, track market movements, and set alerts for favorable rates.
          </p>
        </div>
      </div>
      
      <RateTrends />
      
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Understanding Exchange Rate Trends</h2>
          
          <div className="space-y-6 prose prose-lg dark:prose-invert max-w-none">
            <p>
              Exchange rates between the British Pound (GBP) and Nigerian Naira (NGN) are influenced by various factors including:
            </p>
            
            <ul>
              <li>Economic indicators in both the UK and Nigeria</li>
              <li>Political stability and policy changes</li>
              <li>Oil prices (due to Nigeria's oil-dependent economy)</li>
              <li>Interest rate differentials between the countries</li>
              <li>Market speculation and investor sentiment</li>
            </ul>
            
            <p>
              By monitoring these trends, you can make more informed decisions about when to transfer money, potentially saving significant amounts on larger transfers.
            </p>
            
            <h3>Tips for Using Exchange Rate Data</h3>
            
            <ol>
              <li><strong>Set rate alerts</strong> - Receive notifications when the rate reaches your target level</li>
              <li><strong>Monitor long-term trends</strong> - Look at 3-month and 1-year changes to understand the direction</li>
              <li><strong>Consider seasonal patterns</strong> - Some currencies show predictable patterns at certain times of year</li>
              <li><strong>Stay informed</strong> - Keep up with financial news that might impact exchange rates</li>
            </ol>
            
            <p>
              Our rate trend tool provides you with historical data and analytics to help you make more informed decisions about your international money transfers.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Trends;
