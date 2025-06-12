import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { News } from "@shared/schema";
import { Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";

// Extended type to include the formatted_date from backend
type NewsWithFormattedDate = News & {
  formatted_date?: string;
};

const NewsSection = () => {
  const { data: news, isLoading } = useQuery<NewsWithFormattedDate[]>({
    queryKey: ["/api/news?limit=3"],
  });

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <section className="py-12 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          Nigeria Financial News
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
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
        ) : !news || news.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">No news available at this time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
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
                <CardContent className="p-4">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <Calendar className="mr-1 h-3 w-3" />
                    <span>{item.formatted_date || formatDate(item.published_at)}</span>
                    {item.source && (
                      <>
                        <span className="mx-1">•</span>
                        <span className="truncate">{item.source}</span>
                      </>
                    )}
                  </div>
                  <p className="font-medium text-[10px] mb-1 text-gray-800 dark:text-white line-clamp-2 leading-tight">
                    {item.title}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-[10px] mb-3 line-clamp-2 leading-tight">
                    {item.summary}
                  </p>
                  {item.url && (
                    <a
                      href={item.url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark text-sm font-medium inline-flex items-center"
                    >
                      Read more
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/news"
            className="inline-flex items-center text-primary hover:text-primary-dark font-medium"
          >
            View more news
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="ml-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
