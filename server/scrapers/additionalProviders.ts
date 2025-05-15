import { InsertProvider } from '@shared/schema';

/**
 * Additional providers to add to the comparison platform
 * These will supplement the existing providers in the database
 */
export const additionalProviders: Partial<InsertProvider>[] = [
  {
    name: 'Sendwave',
    website_url: 'https://www.sendwave.com',
    logo: null,
    active: true,
    fixed_fee: 0,
    percentage_fee: 0.5,
    transfer_time: 'minutes',
    rating: 4.6,
    scraping_url: 'https://www.sendwave.com',
    scraping_selector: '.exchange-rate'
  },
  {
    name: 'Paysend',
    website_url: 'https://paysend.com',
    logo: null,
    active: true,
    fixed_fee: 1.00,
    percentage_fee: 0.8,
    transfer_time: 'minutes - 1 day',
    rating: 4.4,
    scraping_url: 'https://paysend.com',
    scraping_selector: '.exchange-rate-display'
  },
  {
    name: 'Flutterwave',
    website_url: 'https://flutterwave.com',
    logo: null,
    active: true,
    fixed_fee: 0.50,
    percentage_fee: 0.7,
    transfer_time: '1-2 days',
    rating: 4.3,
    scraping_url: 'https://flutterwave.com',
    scraping_selector: '.exchange-rate'
  },
  {
    name: 'SendApp',
    website_url: 'https://sendapp.com',
    logo: null,
    active: true,
    fixed_fee: 0,
    percentage_fee: 0.6,
    transfer_time: 'minutes',
    rating: 4.0,
    scraping_url: 'https://sendapp.com',
    scraping_selector: '.rate'
  },
  {
    name: 'Chipper Cash',
    website_url: 'https://chippercash.com',
    logo: null,
    active: true,
    fixed_fee: 0,
    percentage_fee: 0.8,
    transfer_time: 'minutes',
    rating: 4.5,
    scraping_url: 'https://chippercash.com',
    scraping_selector: '.exchange-rate'
  }
];