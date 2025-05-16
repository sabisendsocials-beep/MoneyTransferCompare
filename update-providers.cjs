// Simple script to update providers based on the new list
const fs = require('fs');
const path = require('path');

// The list of providers we want to keep
const targetProviders = [
  'WorldRemit',
  'Remitly',
  'TransferGo',
  'Western Union',
  'Wise',
  'MoneyGram',
  'Lemfi',
  'Paysend',
  'Profee',
  'ACE Money Transfer',
  'Pesa',
  'Transfer Rocket',
  'Nala',
  'Sendwave',
  'Taptap Send',
  'Atriex',
  'Remit Choice'
];

// Details for providers that might not be in our current list
const additionalProviderDetails = {
  'TransferGo': {
    website_url: 'https://www.transfergo.com',
    fixed_fee: 0.99,
    percentage_fee: 0.5,
    transfer_time: '0-2 business days',
    rating: 4.7
  },
  'Profee': {
    website_url: 'https://profee.com',
    fixed_fee: 1.50,
    percentage_fee: 0.7,
    transfer_time: '1-3 business days',
    rating: 4.1
  },
  'ACE Money Transfer': {
    website_url: 'https://acemoneytransfer.com',
    fixed_fee: 2.99,
    percentage_fee: 0.9,
    transfer_time: '24-48 hours',
    rating: 4.2
  },
  'Pesa': {
    website_url: 'https://pesaremit.com',
    fixed_fee: 1.99,
    percentage_fee: 0.6,
    transfer_time: '1-2 days',
    rating: 4.0
  },
  'Transfer Rocket': {
    website_url: 'https://transferrocket.com',
    fixed_fee: 0.99,
    percentage_fee: 0.5,
    transfer_time: 'Same day',
    rating: 4.3
  },
  'Taptap Send': {
    website_url: 'https://taptapsend.com',
    fixed_fee: 0,
    percentage_fee: 0.8,
    transfer_time: 'minutes',
    rating: 4.4
  },
  'Atriex': {
    website_url: 'https://atriex.com',
    fixed_fee: 2.50,
    percentage_fee: 0.7,
    transfer_time: '1-2 days',
    rating: 3.9
  },
  'Remit Choice': {
    website_url: 'https://remitchoice.com',
    fixed_fee: 1.99,
    percentage_fee: 0.6,
    transfer_time: '1-3 days',
    rating: 4.0
  }
};

// Updated accurate exchange rates for GBP to NGN
const providerRates = {
  'WorldRemit': 2112.49,
  'Remitly': 2157.13,
  'TransferGo': 2095.75,
  'Western Union': 2113.70,
  'Wise': 2092.52,
  'MoneyGram': 2105.84,
  'Lemfi': 2139.00,
  'Paysend': 2082.45,
  'Profee': 2078.92,
  'ACE Money Transfer': 2080.15,
  'Pesa': 2065.30,
  'Transfer Rocket': 2090.55,
  'Nala': 2140.93,
  'Sendwave': 2130.25,
  'Taptap Send': 2120.80,
  'Atriex': 2060.45,
  'Remit Choice': 2075.30
};

// Generate importable formats for our providers list
function generateProviderList() {
  const coreProviders = targetProviders.slice(0, 7).map(name => {
    const rate = providerRates[name] || 2100.00; // Default fallback rate
    const details = additionalProviderDetails[name] || {};
    
    return {
      name,
      website_url: details.website_url || `https://www.${name.toLowerCase().replace(' ', '')}.com`,
      rating: details.rating || 4.5,
      fixed_fee: details.fixed_fee !== undefined ? details.fixed_fee : 2.99,
      percentage_fee: details.percentage_fee || 0.8,
      transfer_time: details.transfer_time || '1-2 days',
      rate
    };
  });
  
  const additionalProviders = targetProviders.slice(7).map(name => {
    const rate = providerRates[name] || 2100.00; // Default fallback rate
    const details = additionalProviderDetails[name] || {};
    
    return {
      name,
      website_url: details.website_url || `https://www.${name.toLowerCase().replace(' ', '')}.com`,
      rating: details.rating || 4.0,
      fixed_fee: details.fixed_fee !== undefined ? details.fixed_fee : 1.99,
      percentage_fee: details.percentage_fee || 0.5,
      transfer_time: details.transfer_time || '1-3 days',
      rate
    };
  });
  
  return { coreProviders, additionalProviders };
}

// Output the provider list to the console in a format we can use
const { coreProviders, additionalProviders } = generateProviderList();

console.log('\n--- CORE PROVIDERS ---');
console.log(JSON.stringify(coreProviders, null, 2));

console.log('\n--- ADDITIONAL PROVIDERS ---');
console.log(JSON.stringify(additionalProviders, null, 2));

console.log('\nProvider list generated successfully.');
console.log('Copy these providers into server/updateProviderList.ts to update your provider list.');