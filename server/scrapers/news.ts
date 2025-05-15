import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertNews } from '@shared/schema';

const NEWS_SOURCES = [
  {
    name: "Central Bank of Nigeria",
    url: "https://www.cbn.gov.ng/newsfeed.asp",
    titleSelector: "h2.news-title",
    contentSelector: "div.news-content",
    dateSelector: "span.news-date",
  },
  {
    name: "Nairametrics",
    url: "https://nairametrics.com/category/naira-forex/",
    titleSelector: "h2.entry-title",
    contentSelector: "div.entry-content",
    dateSelector: "time.entry-date",
  },
  {
    name: "BusinessDay",
    url: "https://businessday.ng/category/forex/",
    titleSelector: "h3.entry-title",
    contentSelector: "div.entry-content",
    dateSelector: "span.entry-date",
  }
];

export async function scrapeFinancialNews() {
  try {
    const newsItems = [];

    for (const source of NEWS_SOURCES) {
      try {
        const response = await fetch(source.url);
        if (!response.ok) {
          console.error(`Error fetching news from ${source.name}: ${response.statusText}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract news items
        const articles = $(source.titleSelector).slice(0, 5); // Get up to 5 news items
        
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
            
            // Create news item
            const newsItem: InsertNews = {
              title,
              content,
              summary,
              source: source.name,
              url: link,
              image_url: extractImageUrl($(element).closest('article')),
              published_at: parseDateText(dateText),
            };
            
            newsItems.push(newsItem);
          } catch (err) {
            console.error(`Error parsing article from ${source.name}:`, err);
          }
        });
        
        console.log(`Scraped ${articles.length} news items from ${source.name}`);
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
function extractImageUrl(articleElement: cheerio.Cheerio): string | undefined {
  const img = articleElement.find('img').first();
  return img.attr('src') || img.attr('data-src');
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
  const results = await scrapeFinancialNews();
  console.log(`Updated ${results.length} news items`);
  return results;
}
