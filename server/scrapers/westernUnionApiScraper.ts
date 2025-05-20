/**
 * Western Union API Scraper
 * 
 * This module attempts to extract rates from Western Union's more accessible API endpoints
 * instead of relying on web scraping of dynamically loaded content.
 */
import fetch from 'node-fetch';
import { storage } from '../storage';

/**
 * Try to get Western Union rate through their API
 * @param fromCurrency Source currency (e.g., 'GBP')
 * @param toCurrency Target currency (e.g., 'NGN')
 * @returns The exchange rate if found, otherwise null
 */
export async function getWesternUnionRateFromApi(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    console.log(`Attempting to fetch Western Union rate from API: ${fromCurrency} to ${toCurrency}`);
    
    // Western Union has an API endpoint that returns the exchange rate
    // This endpoint is more reliable than scraping the website
    const apiUrl = `https://www.westernunion.com/api/currency-converter/v1/rates?sourceCurrency=${fromCurrency}&targetCurrency=${toCurrency}&amount=1`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`API response not OK: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('Western Union API response:', JSON.stringify(data).substring(0, 200) + '...');
    
    // Extract the rate from the API response
    if (data && data.rate) {
      console.log(`Successfully extracted rate from API: ${data.rate}`);
      return parseFloat(data.rate);
    }
    
    // Alternative format check
    if (data && data.rates && data.rates.length > 0) {
      const rate = data.rates[0].rate;
      console.log(`Successfully extracted rate from rates array: ${rate}`);
      return parseFloat(rate);
    }
    
    console.log('Could not find rate in API response');
    return null;
  } catch (error) {
    console.error('Error fetching Western Union rate from API:', error);
    return null;
  }
}

/**
 * Try to get Western Union rate through their price estimator API
 * @param fromCurrency Source currency (e.g., 'GBP')
 * @param toCurrency Target currency (e.g., 'NGN')
 * @returns The exchange rate if found, otherwise null
 */
export async function getWesternUnionRateFromEstimator(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    console.log(`Attempting to fetch Western Union rate from price estimator API`);
    
    // Western Union has a price estimator API that includes the exchange rate
    const apiUrl = `https://www.westernunion.com/api/price-estimator/v1/price-estimator?sourceCurrency=${fromCurrency}&targetCurrency=${toCurrency}&amount=100&paymentMethod=CREDIT_CARD&receiveMethod=CASH&originState=&destinationCountry=${toCurrency.substring(0, 2)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`Estimator API response not OK: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('Western Union estimator API response:', JSON.stringify(data).substring(0, 200) + '...');
    
    // Extract the rate from the estimator API response
    if (data && data.fxRate) {
      console.log(`Successfully extracted rate from estimator API: ${data.fxRate}`);
      return parseFloat(data.fxRate);
    }
    
    // Alternative field check
    if (data && data.exchangeRate) {
      console.log(`Successfully extracted exchange rate: ${data.exchangeRate}`);
      return parseFloat(data.exchangeRate);
    }
    
    // Try to calculate the rate from amount fields
    if (data && data.sourceAmount && data.targetAmount) {
      const calculatedRate = parseFloat(data.targetAmount) / parseFloat(data.sourceAmount);
      console.log(`Calculated rate from amounts: ${calculatedRate}`);
      return calculatedRate;
    }
    
    console.log('Could not find rate in estimator API response');
    return null;
  } catch (error) {
    console.error('Error fetching Western Union rate from estimator API:', error);
    return null;
  }
}

/**
 * Update Western Union rate using API endpoints instead of web scraping
 * @param providerId Western Union provider ID
 * @param fromCurrency Source currency (e.g., 'GBP')
 * @param toCurrency Target currency (e.g., 'NGN')
 * @returns Whether the update was successful
 */
export async function updateWesternUnionRateViaApi(
  providerId: number,
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  try {
    console.log('=== Attempting to update Western Union rate via API ===');
    
    // Try the direct rate API first
    let rate = await getWesternUnionRateFromApi(fromCurrency, toCurrency);
    
    // If that fails, try the price estimator API
    if (!rate) {
      console.log('Direct API failed, trying price estimator API...');
      rate = await getWesternUnionRateFromEstimator(fromCurrency, toCurrency);
    }
    
    // If we found a rate, store it
    if (rate) {
      console.log(`Successfully extracted Western Union ${fromCurrency} to ${toCurrency} rate: ${rate}`);
      
      // Create a new exchange rate record
      await storage.createExchangeRate({
        provider_id: providerId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        source: 'API'
      });
      
      console.log(`Successfully stored Western Union ${fromCurrency} to ${toCurrency} rate via API: ${rate}`);
      return true;
    }
    
    console.log('Failed to extract Western Union rate from APIs');
    return false;
  } catch (error) {
    console.error('Error updating Western Union rate via API:', error);
    return false;
  }
}