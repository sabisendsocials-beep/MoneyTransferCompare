import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertNews } from '@shared/schema';

// Supported countries
const SUPPORTED_COUNTRIES = [
  { 
    code: 'NG', 
    name: 'Nigeria',
    currency: 'NGN',
    newsKeywords: ['Nigeria', 'Nigerian', 'Naira', 'Lagos', 'Abuja', 'Port Harcourt']
  },
  { 
    code: 'GH', 
    name: 'Ghana',
    currency: 'GHS',
    newsKeywords: ['Ghana', 'Ghanaian', 'Cedi', 'Accra', 'Kumasi', 'Tamale']
  }
];

// Dedicated financial news sources for specific markets
const FINANCIAL_NEWS_SOURCES = [
  {
    country: 'Nigeria',
    name: "Central Bank of Nigeria",
    url: "https://www.cbn.gov.ng/newsfeed.asp",
    titleSelector: "h2.news-title",
    contentSelector: "div.news-content",
    dateSelector: "span.news-date",
  },
  {
    country: 'Nigeria',
    name: "Nairametrics",
    url: "https://nairametrics.com/category/naira-forex/",
    titleSelector: "h2.entry-title",
    contentSelector: "div.entry-content",
    dateSelector: "time.entry-date",
  },
  {
    country: 'Nigeria',
    name: "BusinessDay",
    url: "https://businessday.ng/category/forex/",
    titleSelector: "h3.entry-title",
    contentSelector: "div.entry-content",
    dateSelector: "span.entry-date",
  },
  {
    country: 'Ghana',
    name: "Business & Financial Times",
    url: "https://thebftonline.com/category/business/",
    titleSelector: "h2.entry-title",
    contentSelector: "div.entry-content",
    dateSelector: "time.entry-date",
  },
  {
    country: 'Ghana',
    name: "GhanaWeb Business",
    url: "https://www.ghanaweb.com/GhanaHomePage/business/",
    titleSelector: "div.news-title h3",
    contentSelector: "div.news-content",
    dateSelector: "div.news-date",
  }
];

// General news sources
const GENERAL_NEWS_SOURCES = [
  {
    name: "BBC Africa",
    url: "https://www.bbc.com/news/world/africa",
    titleSelector: "h3.gs-c-promo-heading__title",
    contentSelector: "p.gs-c-promo-summary",
    dateSelector: "time",
    articleWrapperSelector: "div.gs-c-promo",
  },
  {
    name: "AllAfrica",
    url: "https://allafrica.com/latest/",
    titleSelector: "div.story h3.heading",
    contentSelector: "div.story-text",
    dateSelector: "div.date",
    articleWrapperSelector: "div.story",
  },
  {
    name: "Reuters Africa",
    url: "https://www.reuters.com/world/africa/",
    titleSelector: "h3.text-4xl",
    contentSelector: "p.text-base",
    dateSelector: "time",
    articleWrapperSelector: "article.story",
  }
];

// Get news specifically about a country
interface Country {
  code: string;
  name: string;
  currency: string;
  newsKeywords: string[];
}

function isNewsAboutCountry(title: string, content: string, country: Country): boolean {
  const keywords = country.newsKeywords;
  const combinedText = (title + ' ' + content).toLowerCase();
  
  for (const keyword of keywords) {
    if (combinedText.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

// Function to scrape financial news specifically about the markets we care about
export async function scrapeFinancialNews() {
  try {
    const newsItems: InsertNews[] = [];

    // First get dedicated financial news for each country
    for (const source of FINANCIAL_NEWS_SOURCES) {
      try {
        console.log(`Fetching financial news from ${source.name} for ${source.country}...`);
        const response = await fetch(source.url);
        if (!response.ok) {
          console.error(`Error fetching news from ${source.name}: ${response.statusText}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract news items
        const articles = $(source.titleSelector).slice(0, 3); // Get up to 3 news items per source
        
        articles.each((index, element) => {
          try {
            const titleElement = $(element);
            const title = titleElement.text().trim();
            const link = titleElement.find('a').attr('href') || source.url;
            
            // Find the associated content and date
            let content = "";
            if (source.contentSelector) {
              content = $(element).closest('article').find(source.contentSelector).text().trim();
            }
            
            let dateText = "";
            if (source.dateSelector) {
              dateText = $(element).closest('article').find(source.dateSelector).text().trim();
            }
            
            const summary = content.substring(0, 150) + (content.length > 150 ? '...' : '');
            
            // Create news item with country tag
            const newsItem: InsertNews = {
              title,
              content,
              summary,
              source: source.name,
              url: link,
              image_url: extractImageUrl($(element).closest('article')),
              published_at: parseDateText(dateText),
              category: 'financial', // Mark as financial news
              country: source.country // Specify country
            };
            
            newsItems.push(newsItem);
          } catch (err) {
            console.error(`Error parsing article from ${source.name}:`, err);
          }
        });
        
        console.log(`Scraped ${articles.length} financial news items from ${source.name}`);
      } catch (error) {
        console.error(`Error scraping news from ${source.name}:`, error);
      }
    }
    
    // Then get general news and filter for our countries
    for (const source of GENERAL_NEWS_SOURCES) {
      try {
        console.log(`Fetching general news from ${source.name}...`);
        const response = await fetch(source.url);
        if (!response.ok) {
          console.error(`Error fetching news from ${source.name}: ${response.statusText}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract news items
        const articleWrapper = source.articleWrapperSelector || 'article';
        const articles = $(articleWrapper).slice(0, 10); // Get up to 10 general news items
        
        let countryNewsFound = 0;
        
        articles.each((index, element) => {
          try {
            const titleElement = $(element).find(source.titleSelector);
            const title = titleElement.text().trim();
            
            // Skip if no title found
            if (!title) return;
            
            const link = titleElement.find('a').attr('href') || 
                         $(element).find('a').first().attr('href') || 
                         source.url;
            
            // Fix relative URLs
            const fullLink = link.startsWith('http') ? link : 
                             (source.url.endsWith('/') ? source.url.slice(0, -1) : source.url) + link;
            
            // Find the associated content and date
            let content = "";
            if (source.contentSelector) {
              content = $(element).find(source.contentSelector).text().trim();
            }
            
            let dateText = "";
            if (source.dateSelector) {
              dateText = $(element).find(source.dateSelector).text().trim();
            }
            
            // Create summary
            const summary = content.substring(0, 150) + (content.length > 150 ? '...' : '');
            
            // Determine which country this news is about
            let articleCountry = null;
            for (const country of SUPPORTED_COUNTRIES) {
              if (isNewsAboutCountry(title, content, country)) {
                articleCountry = country.name;
                break;
              }
            }
            
            // Skip news that's not about our supported countries
            if (!articleCountry) return;
            
            countryNewsFound++;
            
            // Create news item
            const newsItem: InsertNews = {
              title,
              content,
              summary,
              source: source.name,
              url: fullLink,
              image_url: extractImageUrl($(element)),
              published_at: parseDateText(dateText),
              category: 'general', // Mark as general news
              country: articleCountry // Specify which country
            };
            
            newsItems.push(newsItem);
            
            // Limit to 5 news per source that match our countries
            if (countryNewsFound >= 5) return false;
            
          } catch (err) {
            console.error(`Error parsing article from ${source.name}:`, err);
          }
        });
        
        console.log(`Scraped ${countryNewsFound} country-specific news items from ${source.name}`);
      } catch (error) {
        console.error(`Error scraping news from ${source.name}:`, error);
      }
    }

    // Save news items to storage
    const savedItems = [];
    for (const item of newsItems) {
      try {
        const savedNews = await storage.createNews(item);
        savedItems.push(savedNews);
      } catch (error) {
        console.error(`Error saving news item "${item.title}":`, error);
      }
    }

    return savedItems;
  } catch (error) {
    console.error('Error in scrapeFinancialNews:', error);
    return [];
  }
}

// Helper function to extract an image URL from an article
function extractImageUrl(articleElement: any): string | undefined {
  try {
    const img = articleElement.find('img').first();
    return img.attr('src') || img.attr('data-src');
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return undefined;
  }
}

// Helper function to parse date text into a Date object
function parseDateText(dateText: string): Date | undefined {
  if (!dateText) return undefined;
  
  try {
    return new Date(dateText);
  } catch (error) {
    console.error(`Error parsing date "${dateText}":`, error);
    return undefined;
  }
}

// This function would be called periodically to update news
export async function updateFinancialNews() {
  console.log('Starting financial news update...');
  // First clear existing news to avoid duplicates
  await clearExistingNews();
  // Then scrape and add new news
  const results = await scrapeFinancialNews();
  console.log(`Updated ${results.length} news items`);
  return results;
}

// Helper function to clear existing news to avoid duplicates
async function clearExistingNews(): Promise<void> {
  console.log('Clearing existing news...');
  try {
    await storage.deleteAllNews();
    console.log('Cleared existing news');
  } catch (error) {
    console.error('Error clearing news:', error);
  }
}
