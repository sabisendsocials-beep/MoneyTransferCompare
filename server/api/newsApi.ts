/**
 * NewsAPI integration for fetching fresh financial news
 * Focuses on Nigeria, Ghana, and international money transfer topics
 */

import { type InsertNews } from "@shared/schema";

const NEWS_API_KEY = process.env.NEWSAPI_KEY;
const NEWS_API_BASE_URL = "https://newsapi.org/v2";

if (!NEWS_API_KEY) {
  console.warn("NewsAPI key not found. Fresh news updates will be limited.");
}

interface NewsAPIArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

/**
 * Fetch financial news about Nigeria and Ghana
 */
export async function fetchFinancialNews(): Promise<InsertNews[]> {
  if (!NEWS_API_KEY) {
    console.error("NewsAPI key not configured");
    return [];
  }

  const newsItems: InsertNews[] = [];

  try {
    // Search terms focused on financial topics relevant to our users
    const searchQueries = [
      "Nigeria currency exchange rate naira",
      "Ghana cedi exchange rate financial",
      "Nigeria remittance money transfer",
      "Ghana remittance financial services",
      "Nigeria central bank monetary policy",
      "Ghana bank financial economy",
      "Nigeria forex foreign exchange",
      "Ghana economic financial news"
    ];

    for (const query of searchQueries) {
      try {
        console.log(`Fetching news for: ${query}`);
        
        const url = new URL(`${NEWS_API_BASE_URL}/everything`);
        url.searchParams.append("q", query);
        url.searchParams.append("language", "en");
        url.searchParams.append("sortBy", "publishedAt");
        url.searchParams.append("pageSize", "5"); // Limit to 5 articles per query
        url.searchParams.append("from", getDateDaysAgo(7)); // Last 7 days

        const response = await fetch(url.toString(), {
          headers: {
            "X-API-Key": NEWS_API_KEY,
          },
        });

        if (!response.ok) {
          console.error(`NewsAPI error for query "${query}": ${response.status} ${response.statusText}`);
          continue;
        }

        const data: NewsAPIResponse = await response.json();

        if (data.status !== "ok") {
          console.error(`NewsAPI returned error status for query "${query}": ${data.status}`);
          continue;
        }

        // Process articles
        for (const article of data.articles) {
          if (!article.title || !article.description) continue;
          
          // Skip articles that seem irrelevant
          if (isRelevantFinancialNews(article.title, article.description)) {
            const newsItem: InsertNews = {
              title: article.title,
              content: article.content || article.description,
              summary: article.description.substring(0, 200) + (article.description.length > 200 ? '...' : ''),
              source: article.source.name,
              url: article.url,
              image_url: article.urlToImage,
              published_at: new Date(article.publishedAt),
              category: determineCategory(article.title, article.description),
              country: determineCountry(article.title, article.description)
            };

            newsItems.push(newsItem);
          }
        }

        console.log(`Fetched ${data.articles.length} articles for query: ${query}`);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching news for query "${query}":`, error);
      }
    }

    // Remove duplicates based on title
    const uniqueNewsItems = newsItems.filter((item, index, self) => 
      index === self.findIndex(other => other.title === item.title)
    );

    console.log(`Fetched ${uniqueNewsItems.length} unique financial news articles from NewsAPI`);
    return uniqueNewsItems;

  } catch (error) {
    console.error("Error in fetchFinancialNews:", error);
    return [];
  }
}

/**
 * Check if an article is relevant to financial/remittance topics
 */
function isRelevantFinancialNews(title: string, description: string): boolean {
  const relevantKeywords = [
    'exchange rate', 'currency', 'naira', 'cedi', 'central bank', 'monetary',
    'remittance', 'money transfer', 'forex', 'financial', 'economy', 'banking',
    'inflation', 'gdp', 'economic growth', 'financial services', 'fintech'
  ];

  const combinedText = (title + ' ' + description).toLowerCase();
  
  return relevantKeywords.some(keyword => 
    combinedText.includes(keyword.toLowerCase())
  );
}

/**
 * Determine the category of news based on content
 */
function determineCategory(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('exchange rate') || text.includes('currency') || text.includes('forex')) {
    return 'exchange-rates';
  }
  if (text.includes('remittance') || text.includes('money transfer')) {
    return 'remittance';
  }
  if (text.includes('central bank') || text.includes('monetary')) {
    return 'monetary-policy';
  }
  
  return 'financial';
}

/**
 * Determine which country the news is about
 */
function determineCountry(title: string, description: string): string | null {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('nigeria') || text.includes('naira') || text.includes('lagos') || text.includes('abuja')) {
    return 'Nigeria';
  }
  if (text.includes('ghana') || text.includes('cedi') || text.includes('accra')) {
    return 'Ghana';
  }
  
  return null;
}

/**
 * Get date string for N days ago in YYYY-MM-DD format
 */
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Update financial news in the database
 */
export async function updateFinancialNewsFromAPI() {
  try {
    console.log("Starting NewsAPI financial news update...");
    
    const { storage } = await import('../storage');
    
    // Fetch fresh news from NewsAPI
    const newsItems = await fetchFinancialNews();
    
    if (newsItems.length === 0) {
      console.log("No fresh news articles found from NewsAPI");
      return [];
    }

    // Clear old news (keep only last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Delete old news
    await storage.deleteOldNews(threeDaysAgo);
    console.log("Cleared old news articles");

    // Add new articles
    const addedArticles = [];
    for (const newsItem of newsItems) {
      try {
        const added = await storage.createNews(newsItem);
        addedArticles.push(added);
      } catch (error) {
        console.error("Error adding news article:", error);
      }
    }

    console.log(`Successfully added ${addedArticles.length} fresh news articles from NewsAPI`);
    return addedArticles;

  } catch (error) {
    console.error("Error updating financial news from NewsAPI:", error);
    return [];
  }
}