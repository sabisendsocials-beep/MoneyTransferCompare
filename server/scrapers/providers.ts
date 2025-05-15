import * as cheerio from 'cheerio';
import { storage } from '../storage';
import type { InsertExchangeRate, InsertProvider } from '@shared/schema';
import { realProviderRates } from './realRates';

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

// Use our real rate data from provider websites
const providerList = [
  { name: 'Wise', website: 'https://wise.com', fee: 3.56, transferTime: '1-2 days', rating: 4.8 },
  { name: 'Western Union', website: 'https://www.westernunion.com', fee: 2.99, transferTime: '1-3 days', rating: 4.1 },
  { name: 'MoneyGram', website: 'https://www.moneygram.com', fee: 3.99, transferTime: '1-2 days', rating: 4.0 },
  { name: 'Remitly', website: 'https://www.remitly.com', fee: 2.49, transferTime: 'Same day', rating: 4.5 },
  { name: 'WorldRemit', website: 'https://www.worldremit.com', fee: 2.99, transferTime: '1-3 days', rating: 4.3 },
  { name: 'Azimo', website: 'https://azimo.com', fee: 2.99, transferTime: '1-2 days', rating: 3.9 },
  { name: 'TorFX', website: 'https://www.torfx.com', fee: 0, transferTime: '1-2 days', rating: 4.6 },
  { name: 'Small World', website: 'https://www.smallworldfs.com', fee: 2.49, transferTime: '1-3 days', rating: 3.8 },
  { name: 'XE Money Transfer', website: 'https://www.xe.com', fee: 2.00, transferTime: '2-4 days', rating: 4.2 },
  { name: 'Currencys', website: 'https://currencys.co.uk', fee: 3.50, transferTime: '2-3 days', rating: 3.9 },
  { name: 'Lemfi', website: 'https://lemfi.com', fee: 1.25, transferTime: '1-2 days', rating: 4.7 },
  { name: 'Nala', website: 'https://nala.money', fee: 1.50, transferTime: 'Same day', rating: 4.6 }
];

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

export async function ensureProvidersExist() {
  try {
    const existingProviders = await storage.getProviders();

    if (existingProviders.length < providerList.length) {
      console.log('Missing providers, initializing complete provider list...');
      
      // Delete all existing providers to avoid duplicates
      // In a real production system, we would use a more sophisticated approach
      // Remove existing providers if needed (for demonstration purposes)
      try {
        await storage.deleteAllProviders();
        console.log('Cleared existing providers');
      } catch (error) {
        console.error('Failed to clear providers, will attempt to continue:', error);
      }
      
      // Add all providers
      for (const provider of providerList) {
        const providerName = provider.name;
        const insertProvider: InsertProvider = {
          name: providerName,
          website_url: provider.website,
          logo: null,
          active: true,
          fixed_fee: provider.fee,
          transfer_time: provider.transferTime,
          rating: provider.rating,
          // Add actual URLs and selectors for scraping exchange rates
          scraping_url: getScrapingUrl(providerName),
          scraping_selector: getScrapingSelector(providerName)
        };
        
        try {
          await storage.createProvider(insertProvider);
          console.log(`Added provider: ${providerName}`);
        } catch (error) {
          console.error(`Failed to add provider ${providerName}:`, error);
        }
      }
      
      console.log('Provider initialization complete');
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
              // Fall back to stored rates
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
              continue; // Skip to next provider
            }
          } catch (error) {
            console.error(`Error scraping ${provider.name}:`, error);
            // Continue to fall back to stored rates
          }
        }
        
        // Find the real rate for this provider
        const realData = realProviderRates.find(p => 
          p.name === provider.name && 
          p.fromCurrency === 'GBP' && 
          p.toCurrency === 'NGN'
        );
        
        if (realData) {
          const rate = realData.rate;
          
          // Create exchange rate record
          const rateData: InsertExchangeRate = {
            provider_id: provider.id,
            from_currency: realData.fromCurrency,
            to_currency: realData.toCurrency,
            rate
          };

          const savedRate = await storage.createExchangeRate(rateData);
          results.push(savedRate);
          console.log(`Added real exchange rate for ${provider.name}: 1 GBP = ${rate} NGN`);
        } else {
          console.warn(`No real rate data found for ${provider.name}`);
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
    { from: 'EUR', to: 'NGN' },
    { from: 'GBP', to: 'GHS' },
    { from: 'EUR', to: 'GHS' }
  ];

  for (const provider of providers) {
    for (const pair of currencyPairs) {
      try {
        // Find the real rate for this provider and currency pair
        const realData = realProviderRates.find(p => 
          p.name === provider.name && 
          p.fromCurrency === pair.from && 
          p.toCurrency === pair.to
        );
        
        if (realData) {
          const rateData: InsertExchangeRate = {
            provider_id: provider.id,
            from_currency: pair.from,
            to_currency: pair.to,
            rate: realData.rate
          };

          await storage.createExchangeRate(rateData);
          console.log(`Added real rate for ${provider.name}: 1 ${pair.from} = ${realData.rate} ${pair.to}`);
        }
      } catch (error) {
        console.error(`Error adding currency pair ${pair.from}/${pair.to} for ${provider.name}:`, error);
      }
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