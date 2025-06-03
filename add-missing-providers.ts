/**
 * Script to add missing providers and new currency support
 */
import { db } from "./server/db";
import * as schema from "./shared/schema";
import { eq, and } from "drizzle-orm";

const missingProviders = [
  {
    name: "ACE Money Transfer",
    logo: "",
    website: "https://www.acemoneytransfer.com",
    description: "International money transfer service",
    collection_method: "MANUAL" as const
  },
  {
    name: "Neteller",
    logo: "",
    website: "https://www.neteller.com",
    description: "Digital payment platform",
    collection_method: "MANUAL" as const
  },
  {
    name: "Ria Money Transfer",
    logo: "",
    website: "https://www.riamoneytransfer.com",
    description: "Global money transfer network",
    collection_method: "MANUAL" as const
  },
  {
    name: "Xoom (PayPal)",
    logo: "",
    website: "https://www.xoom.com",
    description: "PayPal's international money transfer service",
    collection_method: "MANUAL" as const
  }
];

const newCurrencies = ["KES", "INR", "PKR"];
const existingCurrencies = ["GBP", "USD", "EUR"];

async function addMissingProviders() {
  console.log("Adding missing providers...");
  
  for (const provider of missingProviders) {
    try {
      // Check if provider already exists
      const existing = await db.select()
        .from(schema.providers)
        .where(eq(schema.providers.name, provider.name));
      
      if (existing.length === 0) {
        await db.insert(schema.providers).values(provider);
        console.log(`✓ Added provider: ${provider.name}`);
      } else {
        console.log(`- Skipped ${provider.name} (already exists)`);
      }
    } catch (error) {
      console.error(`Error adding provider ${provider.name}:`, error);
    }
  }
}

async function addNewCurrencies() {
  console.log("\nAdding new currencies...");
  
  const currencyData = [
    { code: "KES", name: "Kenyan Shilling", country: "Kenya" },
    { code: "INR", name: "Indian Rupee", country: "India" },
    { code: "PKR", name: "Pakistani Rupee", country: "Pakistan" }
  ];
  
  for (const currency of currencyData) {
    try {
      // Check if currency already exists
      const existing = await db.select()
        .from(schema.currencies)
        .where(eq(schema.currencies.code, currency.code));
      
      if (existing.length === 0) {
        await db.insert(schema.currencies).values(currency);
        console.log(`✓ Added currency: ${currency.code} (${currency.name})`);
      } else {
        console.log(`- Skipped ${currency.code} (already exists)`);
      }
    } catch (error) {
      console.error(`Error adding currency ${currency.code}:`, error);
    }
  }
}

async function getProviderCollectionSettings() {
  console.log("\nGetting current provider collection settings...");
  
  const providers = await db.select().from(schema.providers);
  const settings: Record<string, string> = {};
  
  for (const provider of providers) {
    settings[provider.name] = provider.collection_method || "MANUAL";
    console.log(`${provider.name}: ${settings[provider.name]}`);
  }
  
  return settings;
}

async function addExchangeRateRecords() {
  console.log("\nAdding exchange rate records for new currency pairs...");
  
  // Get all providers
  const providers = await db.select().from(schema.providers);
  const providerSettings = await getProviderCollectionSettings();
  
  // Create rate records for all combinations of origin currencies to new destination currencies
  const originCurrencies = ["GBP", "USD", "EUR"];
  const destinationCurrencies = ["KES", "INR", "PKR"];
  
  for (const provider of providers) {
    for (const fromCurrency of originCurrencies) {
      for (const toCurrency of destinationCurrencies) {
        try {
          // Check if this rate record already exists
          const existing = await db.select()
            .from(schema.exchangeRates)
            .where(
              and(
                eq(schema.exchangeRates.provider_id, provider.id),
                eq(schema.exchangeRates.from_currency, fromCurrency),
                eq(schema.exchangeRates.to_currency, toCurrency)
              )
            );
          
          if (existing.length === 0) {
            await db.insert(schema.exchangeRates).values({
              provider_id: provider.id,
              from_currency: fromCurrency,
              to_currency: toCurrency,
              rate: 0, // Empty rate, to be filled manually
              fee: 0,
              total_cost: 0,
              collection_method: providerSettings[provider.name] || "MANUAL",
              last_updated: new Date()
            });
            console.log(`✓ Added rate record: ${provider.name} ${fromCurrency}→${toCurrency}`);
          } else {
            console.log(`- Skipped ${provider.name} ${fromCurrency}→${toCurrency} (already exists)`);
          }
        } catch (error) {
          console.error(`Error adding rate record for ${provider.name} ${fromCurrency}→${toCurrency}:`, error);
        }
      }
    }
  }
}

async function main() {
  try {
    console.log("=== Adding Missing Providers and Currency Support ===\n");
    
    await addMissingProviders();
    await addNewCurrencies();
    await addExchangeRateRecords();
    
    console.log("\n=== Task Completed Successfully ===");
    
    // Verify final state
    const totalProviders = await db.select().from(schema.providers);
    const totalCurrencies = await db.select().from(schema.currencies);
    const totalRates = await db.select().from(schema.exchangeRates);
    
    console.log(`\nFinal state:`);
    console.log(`- Total providers: ${totalProviders.length}`);
    console.log(`- Total currencies: ${totalCurrencies.length}`);
    console.log(`- Total exchange rate records: ${totalRates.length}`);
    
  } catch (error) {
    console.error("Error in main process:", error);
    process.exit(1);
  }
}

main();