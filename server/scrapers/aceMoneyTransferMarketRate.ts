/**
 * ACE Money Transfer Market Rate Implementation
 * 
 * This file provides a market-based rate solution for ACE Money Transfer
 * when direct scraping is not possible due to anti-scraping measures.
 */
import { storage } from '../storage';
import { getHistoricalRates } from '../api/exchangeRateApi';

/**
 * Update ACE Money Transfer rates using market-based approach
 * @param providerId Provider ID for ACE Money Transfer
 */
export async function updateAceMoneyTransferMarketRates(providerId: number): Promise<boolean> {
  console.log('=== ACE MONEY TRANSFER MARKET-BASED RATE UPDATE ===');
  console.log('Using market-based rates due to anti-scraping protection');
  
  try {
    // GBP to NGN rate
    await updateAceMarketRate(providerId, 'GBP', 'NGN', 0.995); // 99.5% of market rate
    
    // EUR to NGN rate
    await updateAceMarketRate(providerId, 'EUR', 'NGN', 0.995); // 99.5% of market rate
    
    // GBP to GHS rate
    await updateAceMarketRate(providerId, 'GBP', 'GHS', 0.995); // 99.5% of market rate
    
    // EUR to GHS rate
    await updateAceMarketRate(providerId, 'EUR', 'GHS', 0.995); // 99.5% of market rate
    
    console.log('Successfully updated ACE Money Transfer market-based rates');
    return true;
  } catch (error) {
    console.error('Error updating ACE Money Transfer market-based rates:', error);
    return false;
  }
}

/**
 * Update a single market-based rate for ACE Money Transfer
 */
async function updateAceMarketRate(
  providerId: number,
  fromCurrency: string,
  toCurrency: string,
  marketRateFactor: number
): Promise<void> {
  try {
    // Get the latest market rate from our trend data
    const trendData = await getHistoricalRates(fromCurrency, toCurrency);
    
    if (!trendData || trendData.length === 0) {
      console.error(`No trend data available for ${fromCurrency}-${toCurrency}`);
      return;
    }
    
    // Sort by date to get the latest rate
    const sortedData = trendData.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Use the most recent rate
    const latestRate = sortedData[0].rate;
    
    // Calculate ACE Money Transfer rate (slightly below market rate)
    const aceRate = latestRate * marketRateFactor;
    
    console.log(
      `Market rate for ${fromCurrency}-${toCurrency}: ${latestRate}, ` +
      `ACE rate (${marketRateFactor * 100}%): ${aceRate}`
    );
    
    // Update the rate in the database
    await storage.createExchangeRate({
      provider_id: providerId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: aceRate,
      source: 'MARKET_BASED'
    });
    
    console.log(`Updated ACE Money Transfer ${fromCurrency}-${toCurrency} rate: ${aceRate}`);
  } catch (error) {
    console.error(`Error updating market rate for ${fromCurrency}-${toCurrency}:`, error);
    throw error;
  }
}