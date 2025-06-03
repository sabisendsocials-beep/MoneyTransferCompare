import { pgTable, text, serial, integer, boolean, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

// User schema (keeping original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Exchange rate provider schema
export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  rating: real("rating"),
  website_url: text("website_url"),
  // Scraping configuration
  scraping_url: text("scraping_url"),
  scraping_selector: text("scraping_selector"),
  // API integration configuration
  has_api: boolean("has_api").default(false),
  api_url: text("api_url"),
  api_key_required: boolean("api_key_required").default(false),
  api_response_path: text("api_response_path"), // JSON path to extract rate from API response
  // Provider details
  transfer_time: text("transfer_time"),
  has_fixed_fee: boolean("has_fixed_fee").default(false),
  fixed_fee: real("fixed_fee"),
  percentage_fee: real("percentage_fee"),
  // Collection strategy preference (API, SCRAPER, or MANUAL)
  preferred_collection: text("preferred_collection").default('SCRAPER'),
  active: boolean("active").default(true),
  last_successful_collection: timestamp("last_successful_collection"),
  // Provider comments - for additional information displayed on results page
  comment: text("comment"),
});

export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
});

export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providers.$inferSelect;

// Data source enum for rate collection
export enum RateSourceType {
  API = 'API',
  SCRAPER = 'SCRAPER',
  MANUAL = 'MANUAL',
  FALLBACK = 'FALLBACK'
}

// Exchange rate schema with source tracking
export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  provider_id: integer("provider_id").notNull(),
  from_currency: text("from_currency").notNull(),
  to_currency: text("to_currency").notNull(),
  rate: real("rate").notNull(),
  source: text("source").default('SCRAPER').notNull(), // API, SCRAPER, MANUAL, FALLBACK
  source_url: text("source_url"), // URL or identifier of the data source
  verified: boolean("verified").default(false), // Whether this rate has been verified
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  timestamp: true
});

export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;

// News schema
export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  summary: text("summary"),
  source: text("source"),
  url: text("url"),
  image_url: text("image_url"),
  category: text("category"), // e.g., 'financial', 'general'
  country: text("country"),   // e.g., 'Nigeria', 'Ghana'
  published_at: timestamp("published_at"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  timestamp: true,
});

export type InsertNews = z.infer<typeof insertNewsSchema>;
export type News = typeof news.$inferSelect;

// Schema for comparison requests
export const transferRequestSchema = z.object({
  amount: z.number().positive(),
  fromCurrency: z.string().default("GBP"),
  toCurrency: z.string().default("NGN"),
  type: z.enum(["send", "receive"]),
});

export type TransferRequest = z.infer<typeof transferRequestSchema>;

// Schema for comparison results
export const transferResultSchema = z.object({
  providerId: z.number(),
  providerName: z.string(),
  providerLogo: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  exchangeRate: z.number(),
  fee: z.number(),
  receivedAmount: z.number(),
  sendAmount: z.number(),
  transferTime: z.string().nullable().optional(),
  totalCost: z.number(),
  websiteUrl: z.string().nullable().optional(),
  lastUpdated: z.string().optional(), // ISO date string of when the rate was last updated
  lastChecked: z.string().optional(), // ISO date string of when we last tried to get a live rate
  rateSource: z.enum(['api', 'scraping', 'screenshot', 'unavailable']).optional().default('scraping'), // Source of the exchange rate data
  comment: z.string().nullable().optional() // Provider comment for additional information
});

export type TransferResult = z.infer<typeof transferResultSchema>;

// Rate trend data table to store historical exchange rates
export const rateTrends = pgTable("rate_trends", {
  id: serial("id").primaryKey(),
  from_currency: text("from_currency").notNull(),
  to_currency: text("to_currency").notNull(),
  date: text("date").notNull(),
  rate: real("rate").notNull(),
  source: text("source"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertRateTrendSchema = createInsertSchema(rateTrends).omit({
  id: true,
  created_at: true
});

export type InsertRateTrend = z.infer<typeof insertRateTrendSchema>;
export type RateTrend = typeof rateTrends.$inferSelect;

// Define rate_cache table to track when we last updated from the API
export const rateCache = pgTable("rate_cache", {
  id: serial("id").primaryKey(),
  from_currency: text("from_currency").notNull(),
  to_currency: text("to_currency").notNull(),
  last_updated: timestamp("last_updated").defaultNow().notNull()
});

export const insertRateCacheSchema = createInsertSchema(rateCache).omit({
  id: true
});

export type InsertRateCache = z.infer<typeof insertRateCacheSchema>;
export type RateCache = typeof rateCache.$inferSelect;

// Rate trend data schema for API responses
export const rateTrendSchema = z.object({
  date: z.string(),
  rate: z.number(),
  from_currency: z.string(),
  to_currency: z.string()
});

export type RateTrendResponse = z.infer<typeof rateTrendSchema>;

// Rate statistics schema
export const rateStatsSchema = z.object({
  currentRate: z.number().nullable(),
  thirtyDayHigh: z.number().nullable(),
  thirtyDayHighDate: z.string().nullable(),
  thirtyDayLow: z.number().nullable(), 
  thirtyDayLowDate: z.string().nullable(),
  thirtyDayAverage: z.number().nullable(),
  oneMonthChange: z.number().nullable(),
  threeMonthChange: z.number().nullable(),
  oneYearChange: z.number().nullable(),
  lastUpdated: z.string().nullable()
});

export type RateStats = z.infer<typeof rateStatsSchema>;

// Newsletter Subscriptions schema - for storing email subscriptions
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribed_at: timestamp("subscribed_at").defaultNow().notNull(),
  active: boolean("active").default(true),
});

export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptions).omit({
  id: true,
  subscribed_at: true,
  active: true,
});

export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;

// Contact Submissions schema - for storing user feedback and feature requests
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(), // e.g., 'feature_request', 'feedback', 'bug_report', 'support'
  message: text("message").notNull(),
  status: text("status").default('new').notNull(), // e.g., 'new', 'in_progress', 'completed', 'spam'
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  created_at: true,
  updated_at: true,
  status: true
});

export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;

// Contact form validation schema for frontend
export const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  topic: z.string().min(1, { message: "Please select a topic" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" }).max(1000, { message: "Message cannot exceed 1000 characters" }),
});

// Blog Posts schema - for SEO and content marketing
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  featured_image: text("featured_image"),
  author: text("author").notNull(),
  status: text("status").default('draft').notNull(), // 'draft', 'published', 'archived'
  published_at: timestamp("published_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  // SEO fields
  meta_description: text("meta_description"),
  meta_keywords: text("meta_keywords"),
  // Blog categorization
  category: text("category").notNull(), // e.g., 'money-transfer-guides', 'market-analysis', 'provider-reviews'
  tags: text("tags").array(), // Array of tags for filtering
  // Analytics
  view_count: integer("view_count").default(0),
  featured: boolean("featured").default(false),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  created_at: true,
  updated_at: true,
  view_count: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Blog form validation schema for frontend
export const blogPostFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }).max(200, { message: "Title cannot exceed 200 characters" }),
  slug: z.string().min(3, { message: "Slug must be at least 3 characters" }).max(100, { message: "Slug cannot exceed 100 characters" }).regex(/^[a-z0-9-]+$/, { message: "Slug can only contain lowercase letters, numbers, and hyphens" }),
  excerpt: z.string().min(50, { message: "Excerpt must be at least 50 characters" }).max(500, { message: "Excerpt cannot exceed 500 characters" }),
  content: z.string().min(200, { message: "Content must be at least 200 characters" }),
  featured_image: z.string().url({ message: "Featured image must be a valid URL" }).optional(),
  author: z.string().min(2, { message: "Author name must be at least 2 characters" }),
  status: z.enum(['draft', 'published', 'archived']),
  meta_description: z.string().max(160, { message: "Meta description cannot exceed 160 characters" }).optional(),
  meta_keywords: z.string().optional(),
  category: z.string().min(1, { message: "Category is required" }),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
});
