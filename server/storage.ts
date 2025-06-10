/**
 * Storage interface definitions
 */

import {
  User, InsertUser, UpsertUser,
  UserPreferences, InsertUserPreferences,
  Provider, InsertProvider,
  ExchangeRate, InsertExchangeRate,
  News, InsertNews,
  TransferRequest, TransferResult,
  RateTrendResponse, RateStats,
  ContactSubmission, InsertContactSubmission,
  NewsletterSubscription, InsertNewsletterSubscription,
  RateAlert, InsertRateAlert
} from '@shared/schema';

export interface IStorage {
  // User methods - updated for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User preferences methods
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: string, preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // Rate alerts methods for logged-in users
  getUserRateAlerts(userId: string): Promise<RateAlert[]>;
  updateRateAlert(alertId: number, userId: string, updates: Partial<InsertRateAlert>): Promise<RateAlert | undefined>;
  deleteRateAlert(alertId: number, userId: string): Promise<boolean>;
  
  // Provider methods
  getProviders(): Promise<Provider[]>;
  getActiveProviders(): Promise<Provider[]>;
  getProvider(id: number): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  updateProvider(id: number, providerUpdate: Partial<InsertProvider>): Promise<Provider | undefined>;
  deleteAllProviders(): Promise<void>;
  updateProvidersOnly(): Promise<void>;
  
  // Exchange rate methods
  updateRateVerification(providerId: number, fromCurrency: string, toCurrency: string, verified: boolean): Promise<boolean>;
  getLatestRates(fromCurrency: string, toCurrency: string): Promise<ExchangeRate[]>;
  createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  getRatesByProvider(providerId: number, fromCurrency: string, toCurrency: string, limit?: number): Promise<ExchangeRate[]>;
  deleteAllExchangeRates(): Promise<void>;
  deleteExchangeRatesForProvider(providerId: number, fromCurrency: string, toCurrency: string): Promise<void>;
  
  // News methods
  getLatestNews(limit: number): Promise<News[]>;
  createNews(newsItem: InsertNews): Promise<News>;
  deleteAllNews(): Promise<void>;
  deleteOldNews(beforeDate: Date): Promise<void>;
  
  // Transfer comparison methods
  compareTransferOptions(request: TransferRequest): Promise<TransferResult[]>;
  
  // Rate trends methods
  getRateTrends(fromCurrency: string, toCurrency: string, days: number): Promise<RateTrendResponse[]>;
  getRateStats(fromCurrency: string, toCurrency: string): Promise<RateStats>;
  updateRateTrends(fromCurrency: string, toCurrency: string, trends: RateTrendResponse[]): Promise<void>;
  shouldRefreshRateTrends(fromCurrency: string, toCurrency: string): Promise<boolean>;
  
  // Contact form methods
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(limit?: number): Promise<ContactSubmission[]>;
  updateContactSubmissionStatus(id: number, status: string): Promise<ContactSubmission | undefined>;
  
  // Newsletter subscription methods
  createNewsletterSubscription(subscription: InsertNewsletterSubscription): Promise<NewsletterSubscription>;
  getNewsletterSubscriptions(): Promise<NewsletterSubscription[]>;
}

// Import and export the database storage implementation
import { DatabaseStorage } from './databaseStorage';
export const storage = new DatabaseStorage();