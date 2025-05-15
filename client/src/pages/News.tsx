import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Search } from "lucide-react";
import { News } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const NewsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [newsLimit, setNewsLimit] = useState(6);
  
  const { data: news, isLoading } = useQuery<News[]>({
    queryKey: [`/api/news?limit=${newsLimit}`],
  });
  
  const filteredNews = news?.filter(item => 
    !searchQuery || 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return format(date, "MMMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };
  
  const handleLoadMore = () => {
    setNewsLimit(prevLimit => prevLimit + 6);
  };
  
  return (
    <>
      <Helmet>
        <title>Nigeria Financial News | UK to Nigeria Money Transfer | TransferWise</title>
        <meta 
          name="description" 
          content="Stay updated with the latest financial news from Nigeria that may affect exchange rates, money transfers, and the economy."
        />
      </Helmet>
      
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4 text-center">Nigeria Financial News</h1>
          <p className="text-center text-blue-100 max-w-2xl mx-auto">
            Stay informed about financial developments in Nigeria that may impact exchange rates and money transfers.
          </p>
        </div>
      </div>
      
      <section className="py-12 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <Input
                type="text"
                placeholder="Search news articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse h-96">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !filteredNews || filteredNews.length === 0 ? (
            <div className="text-center py-16">
              {searchQuery ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No news found matching "{searchQuery}"</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">No news available at this time</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNews.map((item) => (
                  <Card key={item.id} className="overflow-hidden h-full flex flex-col">
                    <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-16 w-16 text-gray-400 dark:text-gray-500" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={1} 
                              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" 
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 flex-grow flex flex-col">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <Calendar className="mr-1 h-3 w-3" />
                        <span className="font-medium">{item.formatted_date || formatDate(item.publishedAt)}</span>
                        {item.source && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{item.source}</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 flex-grow">
                        {item.summary || item.content?.substring(0, 150) + '...'}
                      </p>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-dark text-sm font-medium inline-flex items-center mt-auto"
                      >
                        Read full article
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {news && news.length >= newsLimit && (
                <div className="text-center mt-10">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    className="px-6"
                  >
                    Load More News
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">How Financial News Affects Exchange Rates</h2>
          
          <div className="space-y-6 prose prose-lg dark:prose-invert max-w-none">
            <p>
              Financial news from Nigeria can have a significant impact on the GBP to NGN exchange rate. 
              Understanding these connections can help you make more informed decisions about when to transfer money.
            </p>
            
            <h3>Key Factors to Watch:</h3>
            
            <ul>
              <li><strong>Central Bank Policies</strong> - Changes in interest rates or foreign exchange policies can cause immediate shifts in the naira's value</li>
              <li><strong>Oil Prices</strong> - As Nigeria's economy is heavily dependent on oil exports, fluctuations in global oil prices directly impact the naira</li>
              <li><strong>Political Stability</strong> - Elections, policy changes, and governance issues can affect investor confidence and currency value</li>
              <li><strong>Economic Indicators</strong> - Inflation rates, GDP growth, and trade balances provide insights into the direction of the currency</li>
              <li><strong>Regulatory Changes</strong> - New regulations affecting foreign exchange or remittances can impact transfer costs and exchange rates</li>
            </ul>
            
            <p>
              By staying informed about these developments through our news section, you can potentially time your transfers 
              to take advantage of favorable rates, helping you get more value for your money.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
              <h4 className="text-primary-600 dark:text-primary-400 font-semibold mb-2">Pro Tip:</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Consider setting up rate alerts in our Trends section to be notified when the exchange rate reaches your desired level, 
                then check the News section to understand what might be causing the movement and whether it's likely to continue.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default NewsPage;
