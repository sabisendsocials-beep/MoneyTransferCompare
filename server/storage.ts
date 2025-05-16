import { 
  users, type User, type InsertUser,
  providers, type Provider, type InsertProvider,
  exchangeRates, type ExchangeRate, type InsertExchangeRate, 
  news, type News, type InsertNews,
  type TransferRequest, type TransferResult,
  type RateTrend, type RateStats 
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods (keeping original)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Provider methods
  getProviders(): Promise<Provider[]>;
  getActiveProviders(): Promise<Provider[]>;
  getProvider(id: number): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  updateProvider(id: number, provider: Partial<InsertProvider>): Promise<Provider | undefined>;
  deleteAllProviders(): Promise<void>;
  
  // Exchange rate methods
  getLatestRates(fromCurrency: string, toCurrency: string): Promise<ExchangeRate[]>;
  createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  getRatesByProvider(providerId: number, fromCurrency: string, toCurrency: string, limit: number): Promise<ExchangeRate[]>;
  deleteAllExchangeRates(): Promise<void>; // Method to clear all exchange rates
  deleteExchangeRatesForProvider(providerId: number, fromCurrency: string, toCurrency: string): Promise<void>; // Method to clear rates for a specific provider
  
  // News methods
  getLatestNews(limit: number): Promise<News[]>;
  createNews(news: InsertNews): Promise<News>;
  deleteAllNews(): Promise<void>; // Method to clear all news
  
  // Comparison methods
  compareTransferOptions(request: TransferRequest): Promise<TransferResult[]>;
  
  // Rate trend methods
  getRateTrends(fromCurrency: string, toCurrency: string, days: number): Promise<RateTrend[]>;
  getRateStats(fromCurrency: string, toCurrency: string): Promise<RateStats>;
  updateRateTrends(fromCurrency: string, toCurrency: string, trends: RateTrend[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private providers: Map<number, Provider>;
  private exchangeRates: ExchangeRate[];
  private news: News[];
  currentUserId: number;
  currentProviderId: number;
  currentExchangeRateId: number;
  currentNewsId: number;

  constructor() {
    this.users = new Map();
    this.providers = new Map();
    this.exchangeRates = [];
    this.news = [];
    this.currentUserId = 1;
    this.currentProviderId = 1;
    this.currentExchangeRateId = 1;
    this.currentNewsId = 1;
    
    // Initialize with sample providers - using a self-executing async function
    (async () => {
      await this.initializeProviders();
    })().catch(err => console.error("Error initializing data:", err));
  }

  private async initializeProviders() {
    const sampleProviders: InsertProvider[] = [
      {
        name: "Wise",
        logo: "https://wise.com/public-resources/assets/logos/wise.svg",
        rating: 4.8,
        website_url: "https://wise.com",
        scraping_url: "https://wise.com/gb/currency-converter/gbp-to-ngn-rate",
        scraping_selector: ".cc__source-to-target",
        transfer_time: "1-2 hours",
        has_fixed_fee: true,
        fixed_fee: 3.5,
        percentage_fee: 0.5,
        active: true
      },
      {
        name: "Western Union",
        logo: "https://www.westernunion.com/content/dam/wu/logo/logo.svg",
        rating: 4.0,
        website_url: "https://www.westernunion.com",
        scraping_url: "https://www.westernunion.com/gb/en/currency-converter/gbp-to-ngn-rate.html",
        scraping_selector: ".exchange-rate",
        transfer_time: "1-3 days",
        has_fixed_fee: true,
        fixed_fee: 4.9,
        percentage_fee: 1.0,
        active: true
      },
      {
        name: "MoneyGram",
        logo: "https://www.moneygram.com/mgo/assets/images/mg-logo.svg",
        rating: 3.5,
        website_url: "https://www.moneygram.com",
        scraping_url: "https://www.moneygram.com/mgo/gb/en/exchange-rate-calculator",
        scraping_selector: ".exchange-rate-value",
        transfer_time: "Minutes (cash pickup)",
        has_fixed_fee: true,
        fixed_fee: 5.99,
        percentage_fee: 1.5,
        active: true
      },
      {
        name: "Remitly",
        logo: "https://assets.remitly.com/images/remitly-logo.svg",
        rating: 4.2,
        website_url: "https://www.remitly.com",
        scraping_url: "https://www.remitly.com/gb/en/nigeria/pricing",
        scraping_selector: ".exchange-rate-value",
        transfer_time: "3-5 business days",
        has_fixed_fee: true,
        fixed_fee: 3.99,
        percentage_fee: 0.8,
        active: true
      },
      {
        name: "Lemfi",
        logo: "https://lemfi.com/wp-content/uploads/2021/07/lemfi-logo.png",
        rating: 4.7,
        website_url: "https://lemfi.com",
        scraping_url: "https://lemfi.com/exchange-rates",
        scraping_selector: ".exchange-rate-display",
        transfer_time: "Same day",
        has_fixed_fee: true,
        fixed_fee: 2.99,
        percentage_fee: 0.4,
        active: true
      },
      {
        name: "Nala",
        logo: "https://nala.co.uk/wp-content/uploads/2022/01/nala-logo.svg",
        rating: 4.6,
        website_url: "https://nala.co.uk",
        scraping_url: "https://nala.co.uk/rates",
        scraping_selector: ".currency-rate",
        transfer_time: "Minutes to hours",
        has_fixed_fee: true,
        fixed_fee: 1.99,
        percentage_fee: 0.5,
        active: true
      }
    ];
    
    // Create each provider
    for (const provider of sampleProviders) {
      await this.createProvider(provider);
    }
    
    // Initialize with sample exchange rates
    await this.initializeExchangeRates();
    
    // Initialize with sample news
    this.initializeNews();
  }
  
  private async initializeExchangeRates() {
    const providers = await this.getActiveProviders();
    const now = new Date();
    
    providers.forEach(provider => {
      // Current rate
      let baseRate = 0;
      switch(provider.name) {
        case "Wise": baseRate = 1523; break;
        case "Western Union": baseRate = 1519; break;
        case "MoneyGram": baseRate = 1510; break;
        case "Remitly": baseRate = 1518; break;
        default: baseRate = 1515;
      }
      
      this.createExchangeRate({
        provider_id: provider.id,
        from_currency: "GBP",
        to_currency: "NGN",
        rate: baseRate
      });
      
      // Create historical data for charts
      const days = 30;
      for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        
        // Add some random fluctuation to create realistic looking data
        const fluctuation = (Math.random() - 0.5) * 20;
        const historicalRate = baseRate + fluctuation;
        
        this.exchangeRates.push({
          id: this.currentExchangeRateId++,
          provider_id: provider.id,
          from_currency: "GBP",
          to_currency: "NGN",
          rate: historicalRate,
          timestamp: date
        });
      }
    });
  }
  
  private initializeNews() {
    const sampleNews: InsertNews[] = [
      {
        title: "Nigeria's Central Bank Adjusts Foreign Exchange Policy",
        summary: "The Central Bank of Nigeria has announced new measures to stabilize the naira amid ongoing economic reforms...",
        content: "The Central Bank of Nigeria has announced a series of measures aimed at stabilizing the naira exchange rate. The new policies include increased intervention in the forex market and changes to the way banks can access foreign currency. Experts believe these measures could help reduce volatility in the naira's value against major currencies.",
        source: "Financial Times",
        url: "https://www.ft.com",
        image_url: "https://example.com/nigeria-central-bank.jpg",
        category: "Economy",
        country: "Nigeria",
        published_at: new Date(2023, 10, 20)
      },
      {
        title: "Nigerian Stock Market Hits 3-Year High As Foreign Investors Return",
        summary: "Nigeria's equities market reached a three-year peak as international investors show renewed interest in the country's financial assets...",
        content: "Nigeria's equities market has reached a three-year high as international investors return to the country's financial markets. The Nigerian Stock Exchange (NSE) All-Share Index has risen by 15% since the beginning of the year, reflecting growing confidence in the country's economic prospects.",
        source: "Reuters",
        url: "https://www.reuters.com",
        image_url: "https://example.com/nigeria-stock-exchange.jpg",
        category: "Markets",
        country: "Nigeria",
        published_at: new Date(2023, 10, 18)
      },
      {
        title: "Nigeria's Oil Production Increases, Boosting Foreign Exchange Reserves",
        summary: "Nigeria has reported a 15% increase in oil production, strengthening the country's foreign exchange position and potentially stabilizing the naira...",
        content: "Nigeria has reported a 15% increase in oil production in the last quarter, which has helped boost the country's foreign exchange reserves. The increase in oil output, combined with stronger global oil prices, has provided much-needed support for the naira and may help stabilize the currency in the coming months.",
        source: "Bloomberg",
        url: "https://www.bloomberg.com",
        image_url: "https://example.com/nigeria-oil-production.jpg",
        category: "Energy",
        country: "Nigeria",
        published_at: new Date(2023, 10, 15)
      }
    ];
    
    sampleNews.forEach(newsItem => {
      this.createNews(newsItem);
    });
  }

  // User methods (keeping original)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Provider methods
  async getProviders(): Promise<Provider[]> {
    return Array.from(this.providers.values());
  }
  
  async getActiveProviders(): Promise<Provider[]> {
    return Array.from(this.providers.values()).filter(provider => provider.active);
  }
  
  async getProvider(id: number): Promise<Provider | undefined> {
    return this.providers.get(id);
  }
  
  async createProvider(insertProvider: InsertProvider): Promise<Provider> {
    const id = this.currentProviderId++;
    const provider: Provider = { 
      id,
      name: insertProvider.name,
      logo: insertProvider.logo || null,
      rating: insertProvider.rating || null,
      website_url: insertProvider.website_url || null,
      scraping_url: insertProvider.scraping_url || null,
      scraping_selector: insertProvider.scraping_selector || null,
      transfer_time: insertProvider.transfer_time || null,
      has_fixed_fee: insertProvider.has_fixed_fee || null,
      fixed_fee: insertProvider.fixed_fee || null,
      percentage_fee: insertProvider.percentage_fee || null,
      active: insertProvider.active || null
    };
    this.providers.set(id, provider);
    return provider;
  }
  
  async updateProvider(id: number, providerUpdate: Partial<InsertProvider>): Promise<Provider | undefined> {
    const provider = this.providers.get(id);
    if (!provider) return undefined;
    
    const updatedProvider = { ...provider, ...providerUpdate };
    this.providers.set(id, updatedProvider);
    return updatedProvider;
  }
  
  // Exchange rate methods
  async getLatestRates(fromCurrency: string, toCurrency: string): Promise<ExchangeRate[]> {
    const providers = await this.getActiveProviders();
    const result: ExchangeRate[] = [];
    
    for (const provider of providers) {
      const rates = this.exchangeRates
        .filter(rate => 
          rate.provider_id === provider.id && 
          rate.from_currency === fromCurrency && 
          rate.to_currency === toCurrency)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      if (rates.length > 0) {
        result.push(rates[0]);
      }
    }
    
    return result;
  }
  
  async createExchangeRate(insertRate: InsertExchangeRate): Promise<ExchangeRate> {
    const id = this.currentExchangeRateId++;
    const rate: ExchangeRate = { ...insertRate, id, timestamp: new Date() };
    this.exchangeRates.push(rate);
    return rate;
  }
  
  async getRatesByProvider(providerId: number, fromCurrency: string, toCurrency: string, limit: number): Promise<ExchangeRate[]> {
    return this.exchangeRates
      .filter(rate => 
        rate.provider_id === providerId && 
        rate.from_currency === fromCurrency && 
        rate.to_currency === toCurrency)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // News methods
  async getLatestNews(limit: number): Promise<News[]> {
    return this.news
      .sort((a, b) => {
        if (!a.published_at) return 1;
        if (!b.published_at) return -1;
        return b.published_at.getTime() - a.published_at.getTime();
      })
      .slice(0, limit);
  }
  
  async createNews(insertNews: InsertNews): Promise<News> {
    const id = this.currentNewsId++;
    const newsItem: News = { 
      id, 
      timestamp: new Date(),
      title: insertNews.title,
      content: insertNews.content || null,
      summary: insertNews.summary || null,
      source: insertNews.source || null,
      url: insertNews.url || null,
      image_url: insertNews.image_url || null,
      category: insertNews.category || null,
      country: insertNews.country || null,
      published_at: insertNews.published_at || null
    };
    this.news.push(newsItem);
    return newsItem;
  }
  
  // Comparison methods
  async compareTransferOptions(request: TransferRequest): Promise<TransferResult[]> {
    const { amount, fromCurrency, toCurrency, type } = request;
    const providers = await this.getActiveProviders();
    const rates = await this.getLatestRates(fromCurrency, toCurrency);
    
    const results: TransferResult[] = [];
    
    for (const provider of providers) {
      const providerRate = rates.find(rate => rate.provider_id === provider.id);
      
      if (providerRate) {
        const exchangeRate = providerRate.rate;
        const fee = provider.has_fixed_fee && provider.fixed_fee !== null ? provider.fixed_fee : 0;
        const percentageFee = provider.percentage_fee !== null ? provider.percentage_fee : 0;
        
        let sendAmount = amount;
        let receivedAmount = amount;
        
        if (type === 'send') {
          // For 'send' type, the amount is what the user intends to send before fees
          // We need to deduct the fees from the amount before calculating received amount
          const feeAmount = fee + (amount * percentageFee / 100);
          
          // The actual conversion amount is reduced by the fees
          const amountAfterFees = amount - feeAmount;
          
          console.log(`Provider: ${provider.name}, Amount: ${amount}, Fee: ${feeAmount}, Amount After Fees: ${amountAfterFees}, Exchange Rate: ${exchangeRate}`);
          
          // Calculate what the recipient receives based on the amount after fees
          receivedAmount = amountAfterFees * exchangeRate;
          
          console.log(`Received Amount: ${receivedAmount}`);
          
          // The send amount is the original amount (including fees)
          sendAmount = amount;
        } else {
          // For 'receive' type, we work backwards from the received amount
          sendAmount = amount / exchangeRate;
          const feeAmount = fee + (sendAmount * percentageFee / 100);
          sendAmount += feeAmount;
        }
        
        // Find the most recent rate to get the timestamp
        const mostRecentRate = rates.find(rate => rate.provider_id === provider.id);
        const lastUpdated = mostRecentRate ? mostRecentRate.timestamp.toISOString() : new Date().toISOString();
        
        // Determine rate source based on provider name
        let rateSource: 'api' | 'scraping' | 'screenshot' | 'unavailable' = 'scraping';
        if (provider.name === 'Wise') {
          rateSource = 'api'; // Wise uses API integration
        } else if (['WorldRemit', 'Nala', 'MoneyGram', 'Western Union'].includes(provider.name)) {
          rateSource = 'screenshot'; // These have screenshot-verified rates
        }
        
        results.push({
          providerId: provider.id,
          providerName: provider.name,
          providerLogo: provider.logo || null,
          rating: provider.rating || null,
          exchangeRate: exchangeRate,
          fee,
          receivedAmount: receivedAmount,
          sendAmount: sendAmount,
          transferTime: provider.transfer_time || null,
          totalCost: fee + (amount * percentageFee / 100),
          websiteUrl: provider.website_url || null,
          lastUpdated: lastUpdated,
          lastChecked: new Date().toISOString(),
          rateSource: rateSource
        });
      }
    }
    
    // Sort results by best deal (highest received amount for 'send' or lowest send amount for 'receive')
    if (type === 'send') {
      results.sort((a, b) => b.receivedAmount - a.receivedAmount);
    } else {
      results.sort((a, b) => a.sendAmount - b.sendAmount);
    }
    
    return results;
  }
  
  // Rate trend methods
  async getRateTrends(fromCurrency: string, toCurrency: string, days: number): Promise<RateTrend[]> {
    // Calculate average rate across all providers per day
    const trends: RateTrend[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayRates = this.exchangeRates.filter(rate => 
        rate.from_currency === fromCurrency && 
        rate.to_currency === toCurrency && 
        rate.timestamp >= dayStart && 
        rate.timestamp <= dayEnd
      );
      
      if (dayRates.length > 0) {
        const avgRate = dayRates.reduce((sum, rate) => sum + rate.rate, 0) / dayRates.length;
        trends.push({
          date: date.toISOString().split('T')[0],
          rate: parseFloat(avgRate.toFixed(2))
        });
      }
    }
    
    return trends;
  }
  
  async getRateStats(fromCurrency: string, toCurrency: string): Promise<RateStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    
    // Get rates for the last 30 days
    const thirtyDayRates = this.exchangeRates.filter(rate => 
      rate.from_currency === fromCurrency && 
      rate.to_currency === toCurrency && 
      rate.timestamp >= thirtyDaysAgo
    );
    
    if (thirtyDayRates.length === 0) {
      throw new Error("No exchange rate data available");
    }
    
    // Calculate high, low, and average
    const sortedRates = [...thirtyDayRates].sort((a, b) => b.rate - a.rate);
    
    const highRate = sortedRates[0];
    const lowRate = sortedRates[sortedRates.length - 1];
    const avgRate = thirtyDayRates.reduce((sum, rate) => sum + rate.rate, 0) / thirtyDayRates.length;
    
    // Calculate changes over time
    const latestRate = this.getLatestAverageRate(fromCurrency, toCurrency);
    const oneMonthAgoRate = this.getAverageRateAtDate(fromCurrency, toCurrency, thirtyDaysAgo);
    const threeMonthsAgoRate = this.getAverageRateAtDate(fromCurrency, toCurrency, ninetyDaysAgo);
    const oneYearAgoRate = this.getAverageRateAtDate(fromCurrency, toCurrency, oneYearAgo);
    
    const oneMonthChange = ((latestRate - oneMonthAgoRate) / oneMonthAgoRate) * 100;
    const threeMonthChange = ((latestRate - threeMonthsAgoRate) / threeMonthsAgoRate) * 100;
    const oneYearChange = ((latestRate - oneYearAgoRate) / oneYearAgoRate) * 100;
    
    return {
      thirtyDayHigh: highRate.rate,
      thirtyDayHighDate: highRate.timestamp.toISOString().split('T')[0],
      thirtyDayLow: lowRate.rate,
      thirtyDayLowDate: lowRate.timestamp.toISOString().split('T')[0],
      thirtyDayAverage: parseFloat(avgRate.toFixed(2)),
      oneMonthChange: parseFloat(oneMonthChange.toFixed(1)),
      threeMonthChange: parseFloat(threeMonthChange.toFixed(1)),
      oneYearChange: parseFloat(oneYearChange.toFixed(1))
    };
  }
  
  private getLatestAverageRate(fromCurrency: string, toCurrency: string): number {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayRates = this.exchangeRates.filter(rate => 
      rate.from_currency === fromCurrency && 
      rate.to_currency === toCurrency && 
      rate.timestamp >= dayStart
    );
    
    if (dayRates.length === 0) {
      const latestRates = this.exchangeRates
        .filter(rate => rate.from_currency === fromCurrency && rate.to_currency === toCurrency)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return latestRates.length > 0 ? latestRates[0].rate : 1520; // Fallback value
    }
    
    return dayRates.reduce((sum, rate) => sum + rate.rate, 0) / dayRates.length;
  }
  
  private getAverageRateAtDate(fromCurrency: string, toCurrency: string, date: Date): number {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayRates = this.exchangeRates.filter(rate => 
      rate.from_currency === fromCurrency && 
      rate.to_currency === toCurrency && 
      rate.timestamp >= dayStart && 
      rate.timestamp <= dayEnd
    );
    
    if (dayRates.length === 0) {
      // If no data for the exact date, find the closest date
      const closestRates = this.exchangeRates
        .filter(rate => rate.from_currency === fromCurrency && rate.to_currency === toCurrency)
        .sort((a, b) => 
          Math.abs(a.timestamp.getTime() - date.getTime()) - 
          Math.abs(b.timestamp.getTime() - date.getTime())
        );
      
      // Don't use fallback values anymore
      return closestRates.length > 0 ? closestRates[0].rate : null as unknown as number;
    }
    
    return dayRates.reduce((sum, rate) => sum + rate.rate, 0) / dayRates.length;
  }

  async updateRateTrends(fromCurrency: string, toCurrency: string, trends: RateTrend[]): Promise<void> {
    // In a real database implementation, we would store these trends
    // For now, in the in-memory version, we'll just log them
    console.log(`Updated ${trends.length} trend data points for ${fromCurrency}/${toCurrency}`);
  }
  
  async deleteAllProviders(): Promise<void> {
    // Clear the providers map
    this.providers.clear();
    // Reset the ID counter
    this.currentProviderId = 1;
    // Clear the exchange rates related to these providers
    this.exchangeRates = [];
    
    console.log('All in-memory providers and their exchange rates have been deleted');
  }
  
  async deleteAllExchangeRates(): Promise<void> {
    this.exchangeRates = [];
    console.log('Deleted all exchange rates from memory');
    return Promise.resolve();
  }
  
  async deleteExchangeRatesForProvider(providerId: number, fromCurrency: string, toCurrency: string): Promise<void> {
    // Filter out rates that match the criteria
    this.exchangeRates = this.exchangeRates.filter(rate => 
      !(rate.provider_id === providerId && 
        rate.from_currency === fromCurrency && 
        rate.to_currency === toCurrency)
    );
    console.log(`Deleted exchange rates for provider ${providerId} (${fromCurrency} → ${toCurrency})`);
    return Promise.resolve();
  }
  
  async deleteAllNews(): Promise<void> {
    this.news = [];
    console.log('Deleted all news from memory');
    return Promise.resolve();
  }
}

import { DatabaseStorage } from './databaseStorage';

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
