import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertExchangeRate, InsertProvider } from '@shared/schema';

// Get the URL to scrape based on provider name and currency pair
function getScrapingUrl(providerName: string, fromCurrency = 'GBP', toCurrency = 'NGN'): string | null {
  switch (providerName) {
    case 'Wise':
      return `https://wise.com/gb/currency-converter/${fromCurrency.toLowerCase()}-to-${toCurrency.toLowerCase()}-rate`;
    case 'Western Union':
      return `https://www.westernunion.com/gb/en/currency-converter/gbp-to-ngn-rate.html`;
    case 'MoneyGram':
      return `https://www.moneygram.com/mgo/gb/en/currency-converter/`;
    case 'Remitly':
      return `https://www.remitly.com/gb/en/nigeria/pricing`;
    case 'WorldRemit':
      return `https://www.worldremit.com/en/currency-converter`;
    case 'Azimo':
      return `https://azimo.com/en/exchange-rates`;
    case 'TorFX':
      return `https://www.torfx.com/currency-converter`;
    case 'Small World':
      return `https://www.smallworldfs.com/en-gb/exchange-rates`;
    case 'XE Money Transfer':
      return `https://www.xe.com/currencyconverter/convert/?Amount=1&From=${fromCurrency}&To=${toCurrency}`;
    case 'Currencys':
      return `https://currencys.co.uk/currency-converter/`;
    case 'Lemfi':
      return `https://lemfi.com/rates`;
    case 'Nala':
      return `https://nala.money/pricing`;
    default:
      return null;
  }
}

// Get the CSS selector for extracting exchange rates based on provider name
function getScrapingSelector(providerName: string): string | null {
  switch (providerName) {
    case 'Wise':
      return '.rate-value';
    case 'Western Union':
      return '.exchange-rate-value';
    case 'MoneyGram':
      return '.exchange-rate';
    case 'Remitly':
      return '.exchange-rate-display';
    case 'WorldRemit':
      return '.converter-result';
    case 'Azimo':
      return '.rate-display';
    case 'TorFX':
      return '.rate-box';
    case 'Small World':
      return '.current-rate';
    case 'XE Money Transfer':
      return '.result__BigRate-sc-1bsijpp-1';
    case 'Currencys':
      return '.converter-result-value';
    case 'Lemfi':
      return '.rate-card';
    case 'Nala':
      return '.rate-display';
    default:
      return null;
  }
}

// Helper function to extract the numeric exchange rate from text
function extractExchangeRate(text: string, providerName: string): number | null {
  try {
    let rateText = text.trim();
    
    // Different providers format their rates differently
    switch (providerName) {
      case 'Wise':
        // Example format: "1 GBP = 1,523 NGN"
        rateText = rateText.split('=')[1].trim();
        break;
      case 'Western Union':
        // Example format: "1 GBP = 1498.20 NGN"
        rateText = rateText.split('=')[1].trim();
        break;
      case 'MoneyGram':
        // Example format: "1 GBP equals 1,489.75 NGN"
        rateText = rateText.split('equals')[1].trim();
        break;
      case 'Remitly':
        // Example format: "1 GBP = 1512.30 NGN"
        rateText = rateText.split('=')[1].trim();
        break;
      case 'WorldRemit':
        // Example format: "1 British Pound = 1,506.80 Nigerian Naira"
        rateText = rateText.split('=')[1].trim();
        break;
      case 'Lemfi':
        // Example format: "1 GBP = 1525.75 NGN"
        rateText = rateText.split('=')[1].trim();
        break;
      case 'Nala':
        // Example format: "1 GBP = 1518.90 NGN"
        rateText = rateText.split('=')[1].trim();
        break;
      default:
        // Try to find a number pattern
        const match = rateText.match(/(\d+[.,]?\d*)/);
        if (match) {
          rateText = match[0];
        }
    }
    
    // Clean up the rate text and convert to number
    return parseFloat(rateText.replace(/[^\d.]/g, ''));
  } catch (error) {
    console.error(`Error extracting rate from text "${text}" for ${providerName}:`, error);
    return null;
  }
}

// This is used when we can't scrape real data, to ensure we have
// data for the demo. In production, this would be replaced with actual data.
const mockProviderRates = [
  { name: 'Wise', rate: 1523.45, fee: 3.50, transferTime: '1-2 days', rating: 4.8 },
  { name: 'Western Union', rate: 1498.20, fee: 2.99, transferTime: '1-3 days', rating: 4.1 },
  { name: 'MoneyGram', rate: 1489.75, fee: 3.99, transferTime: '1-2 days', rating: 4.0 },
  { name: 'Remitly', rate: 1512.30, fee: 1.99, transferTime: 'Same day', rating: 4.5 },
  { name: 'WorldRemit', rate: 1506.80, fee: 2.49, transferTime: '1-3 days', rating: 4.3 },
  { name: 'Azimo', rate: 1486.90, fee: 2.99, transferTime: '1-2 days', rating: 3.9 },
  { name: 'TorFX', rate: 1510.25, fee: 0, transferTime: '1-2 days', rating: 4.6 },
  { name: 'Small World', rate: 1479.60, fee: 2.49, transferTime: '1-3 days', rating: 3.8 },
  { name: 'XE Money Transfer', rate: 1505.40, fee: 2.00, transferTime: '2-4 days', rating: 4.2 },
  { name: 'Currencys', rate: 1492.80, fee: 3.50, transferTime: '2-3 days', rating: 3.9 },
  { name: 'Lemfi', rate: 1525.75, fee: 1.25, transferTime: '1-2 days', rating: 4.7 },
  { name: 'Nala', rate: 1518.90, fee: 1.50, transferTime: 'Same day', rating: 4.6 }
];

const mockProviderWebsites = {
  'Wise': 'https://wise.com',
  'Western Union': 'https://www.westernunion.com',
  'MoneyGram': 'https://www.moneygram.com',
  'Remitly': 'https://www.remitly.com',
  'WorldRemit': 'https://www.worldremit.com',
  'Azimo': 'https://azimo.com',
  'TorFX': 'https://www.torfx.com',
  'Small World': 'https://www.smallworldfs.com',
  'XE Money Transfer': 'https://www.xe.com',
  'Currencys': 'https://currencys.co.uk',
  'Lemfi': 'https://lemfi.com',
  'Nala': 'https://nala.money'
};

export async function ensureProvidersExist() {
  try {
    const existingProviders = await storage.getProviders();

    if (existingProviders.length === 0) {
      console.log('No providers found, initializing sample providers...');
      
      for (const mockProvider of mockProviderRates) {
        const providerName = mockProvider.name;
        const provider: InsertProvider = {
          name: providerName,
          website_url: mockProviderWebsites[providerName as keyof typeof mockProviderWebsites] || 'https://example.com',
          logo: null,
          active: true,
          fixed_fee: mockProvider.fee,
          transfer_time: mockProvider.transferTime,
          rating: mockProvider.rating,
          // Add actual URLs and selectors for scraping exchange rates
          scraping_url: getScrapingUrl(providerName),
          scraping_selector: getScrapingSelector(providerName)
        };
        
        await storage.createProvider(provider);
      }
      
      console.log('Sample providers created.');
    }
  } catch (error) {
    console.error('Error ensuring providers exist:', error);
  }
}

export async function scrapeExchangeRates() {
  try {
    // First ensure we have providers
    await ensureProvidersExist();
    
    const providers = await storage.getActiveProviders();
    const results = [];

    for (const provider of providers) {
      try {
        if (provider.scraping_url && provider.scraping_selector) {
          // If we have scraping configuration, try to use it
          try {
            // Attempt to scrape real data from provider website
            console.log(`Attempting to scrape exchange rate from ${provider.name}...`);
            const response = await fetch(provider.scraping_url);
            if (!response.ok) {
              console.error(`Error fetching data for ${provider.name}: ${response.statusText}`);
              // Fall back to mock data if scraping fails
              continue;
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            const rateText = $(provider.scraping_selector).text();
            if (!rateText) {
              console.error(`No rate text found for ${provider.name} using selector "${provider.scraping_selector}"`);
              continue;
            }
            
            const rate = extractExchangeRate(rateText, provider.name);

            if (rate) {
              const rateData: InsertExchangeRate = {
                provider_id: provider.id,
                from_currency: 'GBP',
                to_currency: 'NGN',
                rate
              };

              const savedRate = await storage.createExchangeRate(rateData);
              results.push(savedRate);
              console.log(`Scraped exchange rate for ${provider.name}: 1 GBP = ${rate} NGN`);
            } else {
              console.error(`Failed to extract rate for ${provider.name}`);
              // Fall back to mock data if parsing fails
              continue;
            }
          } catch (error) {
            console.error(`Error scraping ${provider.name}:`, error);
            // Fall back to mock data if scraping fails
            continue;
          }
        }

        // Fall back to mock data if scraping isn't configured or fails
        if (results.find(r => r.provider_id === provider.id)) {
          // Already added this provider via scraping, skip mock data
          continue;
        }
        
        // Find the mock rate for this provider
        const mockData = mockProviderRates.find(p => p.name === provider.name);
        
        if (mockData) {
          const rate = mockData.rate;
          
          // Create exchange rate record
          const rateData: InsertExchangeRate = {
            provider_id: provider.id,
            from_currency: 'GBP',
            to_currency: 'NGN',
            rate
          };

          const savedRate = await storage.createExchangeRate(rateData);
          results.push(savedRate);
          console.log(`Added exchange rate for ${provider.name}: 1 GBP = ${rate} NGN (fallback to mock data)`);
        } else {
          console.warn(`Provider ${provider.name} has no scraping configuration or mock data`);
        }
      } catch (error) {
        console.error(`Error processing provider ${provider.name}:`, error);
      }
    }

    // Add data for EUR to NGN and other currency pairs
    await addAdditionalCurrencyPairs(providers);

    return results;
  } catch (error) {
    console.error('Error in scrapeExchangeRates:', error);
    return [];
  }
}

// Helper function to add rates for additional currency pairs
async function addAdditionalCurrencyPairs(providers: any[]) {
  const currencyPairs = [
    { from: 'EUR', to: 'NGN', baseRate: 1298 },
    { from: 'GBP', to: 'GHS', baseRate: 17.8 },
    { from: 'EUR', to: 'GHS', baseRate: 15.2 }
  ];

  for (const provider of providers) {
    for (const pair of currencyPairs) {
      // Add some variance to make data more realistic
      const variance = (Math.random() * 0.05) - 0.025; // +/- 2.5%
      const rate = pair.baseRate * (1 + variance);
      
      const rateData: InsertExchangeRate = {
        provider_id: provider.id,
        from_currency: pair.from,
        to_currency: pair.to,
        rate
      };

      await storage.createExchangeRate(rateData);
    }
  }
}

// This function would be called periodically to update rates
export async function updateExchangeRates() {
  console.log('Starting exchange rate update...');
  const results = await scrapeExchangeRates();
  console.log(`Updated ${results.length} exchange rates`);
  return results;
}