import { InsertProvider } from '@shared/schema';

/**
 * Updated providers list based on latest requirements
 * These are the primary money transfer providers for our comparison platform
 */
export const additionalProviders: Partial<InsertProvider>[] = [
  // Our primary providers that are already in the core database
  // WorldRemit, Remitly, Western Union, Wise, MoneyGram, and Lemfi
  // are managed separately in the main system
  
  // Additional providers from the updated list
  {
    name: 'TransferGo',
    website_url: 'https://www.transfergo.com',
    logo: null,
    active: true,
    fixed_fee: 0.99,
    percentage_fee: 0.5,
    transfer_time: '0-2 business days',
    rating: 4.7,
    scraping_url: 'https://www.transfergo.com/en',
    scraping_selector: '.exchange-rate, .converter__rate'
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
    scraping_selector: '.exchange-rate-display, .rate-info'
  },
  {
    name: 'Profee',
    website_url: 'https://profee.com',
    logo: null,
    active: true,
    fixed_fee: 1.50,
    percentage_fee: 0.7,
    transfer_time: '1-3 business days',
    rating: 4.1,
    scraping_url: 'https://profee.com/en',
    scraping_selector: '.exchange-rate, .currency-rate'
  },
  {
    name: 'ACE Money Transfer',
    website_url: 'https://acemoneytransfer.com',
    logo: null,
    active: true,
    fixed_fee: 2.99,
    percentage_fee: 0.9,
    transfer_time: '24-48 hours',
    rating: 4.2,
    scraping_url: 'https://acemoneytransfer.com',
    scraping_selector: '.exchange-rate, .rate-display'
  },
  {
    name: 'Pesa',
    website_url: 'https://pesaremit.com',
    logo: null,
    active: true,
    fixed_fee: 1.99,
    percentage_fee: 0.6,
    transfer_time: '1-2 days',
    rating: 4.0,
    scraping_url: 'https://pesaremit.com',
    scraping_selector: '.rate, .exchange-rate'
  },
  {
    name: 'Transfer Rocket',
    website_url: 'https://transferrocket.com',
    logo: null,
    active: true,
    fixed_fee: 0.99,
    percentage_fee: 0.5,
    transfer_time: 'Same day',
    rating: 4.3,
    scraping_url: 'https://transferrocket.com',
    scraping_selector: '.rate-info, .exchange-rate'
  },
  {
    name: 'Nala',
    website_url: 'https://nala.money',
    logo: null,
    active: true,
    fixed_fee: 1.50,
    percentage_fee: 0.5,
    transfer_time: 'minutes',
    rating: 4.5,
    scraping_url: 'https://nala.money',
    scraping_selector: '.exchange-rate, .rate-display'
  },
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
    scraping_selector: '.exchange-rate, .rate-text'
  },
  {
    name: 'Taptap Send',
    website_url: 'https://taptapsend.com',
    logo: null,
    active: true,
    fixed_fee: 0,
    percentage_fee: 0.8,
    transfer_time: 'minutes',
    rating: 4.4,
    scraping_url: 'https://taptapsend.com',
    scraping_selector: '.exchange-rate, .rate-amount'
  },
  {
    name: 'Atriex',
    website_url: 'https://atriex.com',
    logo: null,
    active: true,
    fixed_fee: 2.50,
    percentage_fee: 0.7,
    transfer_time: '1-2 days',
    rating: 3.9,
    scraping_url: 'https://atriex.com',
    scraping_selector: '.rate, .exchange-rate'
  },
  {
    name: 'Remit Choice',
    website_url: 'https://remitchoice.com',
    logo: null,
    active: true,
    fixed_fee: 1.99,
    percentage_fee: 0.6,
    transfer_time: '1-3 days',
    rating: 4.0,
    scraping_url: 'https://remitchoice.com',
    scraping_selector: '.exchange-rate, .rate-info'
  }
];