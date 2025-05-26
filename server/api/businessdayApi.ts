/**
 * BusinessDay Nigeria integration for Nigerian financial news
 * Since BusinessDay doesn't offer a public API, we'll scrape their financial content
 */

import * as cheerio from 'cheerio';
import { type InsertNews } from "@shared/schema";

const BUSINESSDAY_BASE_URL = "https://businessday.ng";

/**
 * Scrape financial news from BusinessDay Nigeria
 */
export async function fetchBusinessDayNews(): Promise<InsertNews[]> {
  const newsItems: InsertNews[] = [];

  try {
    console.log("Fetching Nigerian financial news from BusinessDay...");

    // BusinessDay Nigeria financial sections to scrape
    const sections = [
      {
        url: `${BUSINESSDAY_BASE_URL}/category/finance/`,
        category: 'finance'
      },
      {
        url: `${BUSINESSDAY_BASE_URL}/category/banking/`,
        category: 'banking'
      },
      {
        url: `${BUSINESSDAY_BASE_URL}/category/economy/`,
        category: 'economy'
      },
      {
        url: `${BUSINESSDAY_BASE_URL}/category/markets/`,
        category: 'markets'
      }
    ];

    for (const section of sections) {
      try {
        console.log(`Scraping BusinessDay section: ${section.category}`);
        
        const response = await fetch(section.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          }
        });

        if (!response.ok) {
          console.error(`Error fetching ${section.category} from BusinessDay: ${response.status}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract articles from BusinessDay's structure
        $('article, .post, .entry').slice(0, 3).each((index, element) => {
          try {
            const article = $(element);
            
            // Extract title
            const titleElement = article.find('h1, h2, h3, .entry-title, .post-title').first();
            const title = titleElement.text().trim();
            
            if (!title || title.length < 10) return;

            // Extract link
            const linkElement = titleElement.find('a').first();
            const relativeUrl = linkElement.attr('href') || '';
            const url = relativeUrl.startsWith('http') ? relativeUrl : `${BUSINESSDAY_BASE_URL}${relativeUrl}`;

            // Extract excerpt/summary
            const excerptElement = article.find('.excerpt, .entry-summary, .post-excerpt, p').first();
            const summary = excerptElement.text().trim().substring(0, 200);

            // Extract image
            const imageElement = article.find('img').first();
            const image_url = imageElement.attr('src') || imageElement.attr('data-src');

            // Extract date
            const dateElement = article.find('.date, .published, time, .entry-date').first();
            const dateText = dateElement.text().trim() || dateElement.attr('datetime');
            
            let published_at: Date | undefined;
            if (dateText) {
              try {
                published_at = new Date(dateText);
                // If invalid date, use current date
                if (isNaN(published_at.getTime())) {
                  published_at = new Date();
                }
              } catch {
                published_at = new Date();
              }
            } else {
              published_at = new Date();
            }

            // Only include if title is relevant to finance
            if (isRelevantToFinance(title, summary)) {
              const newsItem: InsertNews = {
                title,
                content: summary,
                summary: summary.substring(0, 150) + (summary.length > 150 ? '...' : ''),
                source: 'BusinessDay Nigeria',
                url,
                image_url: image_url ? (image_url.startsWith('http') ? image_url : `${BUSINESSDAY_BASE_URL}${image_url}`) : undefined,
                published_at,
                category: section.category,
                country: 'Nigeria'
              };

              newsItems.push(newsItem);
            }
          } catch (error) {
            console.error('Error parsing BusinessDay article:', error);
          }
        });

        console.log(`Scraped ${newsItems.length} articles from BusinessDay ${section.category}`);
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error scraping BusinessDay ${section.category}:`, error);
      }
    }

    // Remove duplicates based on title
    const uniqueNewsItems = newsItems.filter((item, index, self) => 
      index === self.findIndex(other => other.title === item.title)
    );

    console.log(`Successfully scraped ${uniqueNewsItems.length} unique articles from BusinessDay Nigeria`);
    return uniqueNewsItems;

  } catch (error) {
    console.error("Error in fetchBusinessDayNews:", error);
    return [];
  }
}

/**
 * Check if article is relevant to financial topics
 */
function isRelevantToFinance(title: string, content: string): boolean {
  const financialKeywords = [
    'bank', 'banking', 'finance', 'economy', 'economic', 'naira', 'dollar',
    'exchange rate', 'inflation', 'GDP', 'investment', 'market', 'stock',
    'CBN', 'central bank', 'monetary', 'forex', 'foreign exchange',
    'financial', 'business', 'trade', 'import', 'export', 'remittance',
    'fintech', 'payment', 'credit', 'loan', 'debt', 'interest rate'
  ];

  const combinedText = (title + ' ' + content).toLowerCase();
  
  return financialKeywords.some(keyword => 
    combinedText.includes(keyword.toLowerCase())
  );
}

/**
 * Update financial news from BusinessDay Nigeria
 */
export async function updateBusinessDayNews() {
  try {
    console.log("Starting BusinessDay Nigeria news update...");
    
    const { storage } = await import('../storage');
    
    // Fetch fresh news from BusinessDay
    const newsItems = await fetchBusinessDayNews();
    
    if (newsItems.length === 0) {
      console.log("No fresh news articles found from BusinessDay Nigeria");
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
        console.error("Error adding BusinessDay article:", error);
      }
    }

    console.log(`Successfully added ${addedArticles.length} fresh articles from BusinessDay Nigeria`);
    return addedArticles;

  } catch (error) {
    console.error("Error updating BusinessDay Nigeria news:", error);
    return [];
  }
}