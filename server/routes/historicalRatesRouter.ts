/**
 * Historical Rates API Router
 * 
 * This router handles API endpoints for retrieving historical exchange rate data.
 * It uses data stored in the database, which is populated from ExchangeRate-API.
 */

import { Router } from 'express';
import { getHistoricalRates } from '../services/historicalRatesService';

const router = Router();

/**
 * GET /api/historical-rates/:fromCurrency/:toCurrency/:days
 * Get historical exchange rate data for a specific currency pair and time period
 */
router.get('/api/historical-rates/:fromCurrency/:toCurrency/:days', async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.params;
    const days = parseInt(req.params.days) || 30;
    
    // Validate inputs
    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: fromCurrency, toCurrency'
      });
    }
    
    // Limit days to reasonable values
    const validDays = Math.min(Math.max(days, 1), 365);
    
    // Get historical rates from the service
    const rates = await getHistoricalRates(
      fromCurrency.toUpperCase(),
      toCurrency.toUpperCase(),
      validDays
    );
    
    // Format the response
    return res.json({
      success: true,
      data: {
        from: fromCurrency.toUpperCase(),
        to: toCurrency.toUpperCase(),
        days: validDays,
        rates: rates.map(rate => ({
          date: rate.date,
          rate: rate.rate
        }))
      }
    });
  } catch (error) {
    console.error(`Error getting historical rates: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Error getting historical rates'
    });
  }
});

export default router;