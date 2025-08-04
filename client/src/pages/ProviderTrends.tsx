import { Helmet } from "react-helmet";
import EnhancedRateTrends from "@/components/EnhancedRateTrends";

export default function ProviderTrends() {
  return (
    <>
      <Helmet>
        <title>Provider Trends - Compare Exchange Rate Rankings | SabiSend</title>
        <meta 
          name="description" 
          content="Track how money transfer providers rank against each other over time. See daily provider rankings and movement indicators for the best exchange rates across 15 currency corridors." 
        />
        <meta property="og:title" content="Provider Trends - Exchange Rate Rankings | SabiSend" />
        <meta property="og:description" content="Compare provider rankings and track movement over time for the best exchange rates." />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Provider Trends & Rankings
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Track how money transfer providers rank against each other over time. 
              See daily rankings, movement indicators, and historical trends to make informed decisions.
            </p>
          </div>
          
          <EnhancedRateTrends />
        </div>
      </div>
    </>
  );
}