import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  scraping_url: text("scraping_url"),
  scraping_selector: text("scraping_selector"),
  transfer_time: text("transfer_time"),
  has_fixed_fee: boolean("has_fixed_fee").default(false),
  fixed_fee: real("fixed_fee"),
  percentage_fee: real("percentage_fee"),
  active: boolean("active").default(true),
});

export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
});

export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providers.$inferSelect;

// Exchange rate schema
export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  provider_id: integer("provider_id").notNull(),
  from_currency: text("from_currency").notNull(),
  to_currency: text("to_currency").notNull(),
  rate: real("rate").notNull(),
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
  lastChecked: z.string().optional() // ISO date string of when we last tried to get a live rate
});

export type TransferResult = z.infer<typeof transferResultSchema>;

// Rate trend data schema
export const rateTrendSchema = z.object({
  date: z.string(),
  rate: z.number().nullable(),
});

export type RateTrend = z.infer<typeof rateTrendSchema>;

// Rate statistics schema
export const rateStatsSchema = z.object({
  thirtyDayHigh: z.number().nullable(),
  thirtyDayHighDate: z.string().nullable(),
  thirtyDayLow: z.number().nullable(), 
  thirtyDayLowDate: z.string().nullable(),
  thirtyDayAverage: z.number().nullable(),
  oneMonthChange: z.number().nullable(),
  threeMonthChange: z.number().nullable(),
  oneYearChange: z.number().nullable(),
});

export type RateStats = z.infer<typeof rateStatsSchema>;
