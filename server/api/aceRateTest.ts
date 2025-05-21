/**
 * ACE Money Transfer Rate Test API
 * 
 * Simplified test endpoint to diagnose market-based rate functionality
 */
import { Router, Request, Response, json } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { rateTrends } from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';
import { subDays, format } from 'date-fns';

// Create router
const testRouter = Router();
testRouter.use(json());

// Test endpoint to check if we can get trend rates
testRouter.get('/test-trend-rates', async (req: Request, res: Response) => {
  try {
    const fromCurrency = req.query.from?.toString() || 'GBP';
    const toCurrency = req.query.to?.toString() || 'NGN';
    
    console.log(`Testing trend rates for ${fromCurrency}-${toCurrency}`);
    
    // Get historical trend data
    const startDate = subDays(new Date(), 30);
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    
    const trends = await db.select()
      .from(rateTrends)
      .where(
        and(
          eq(rateTrends.from_currency, fromCurrency),
          eq(rateTrends.to_currency, toCurrency),
          sql`${rateTrends.date} >= ${formattedStartDate}`
        )
      )
      .orderBy(sql`${rateTrends.date} DESC`);
    
    if (trends && trends.length > 0) {
      // Get the ACE Money Transfer provider
      const providers = await storage.getProviders();
      const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
      
      if (aceProvider) {
        // Calculate ACE rate (99.5% of market rate)
        const marketRate = trends[0].rate;
        const aceRate = marketRate * 0.995;
        
        // Add the rate to the database
        await storage.createExchangeRate({
          provider_id: aceProvider.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: aceRate,
          source: 'MARKET_BASED'
        });
        
        return res.json({
          success: true,
          message: `Successfully updated ACE Money Transfer ${fromCurrency}-${toCurrency} rate`,
          trend_data: {
            total_trends: trends.length,
            latest_trend: trends[0],
            market_rate: marketRate,
            ace_rate: aceRate
          },
          provider: {
            id: aceProvider.id,
            name: aceProvider.name
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'ACE Money Transfer provider not found in database',
          trends_available: trends.length
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        message: `No trend data found for ${fromCurrency}-${toCurrency}`,
        query: { from: fromCurrency, to: toCurrency }
      });
    }
  } catch (error) {
    console.error('Error in test-trend-rates endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing trend rates',
      error: String(error)
    });
  }
});

// Test endpoint to check if we can get providers
testRouter.get('/test-providers', async (_req: Request, res: Response) => {
  try {
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    return res.json({
      success: true,
      total_providers: providers.length,
      ace_provider: aceProvider ? {
        id: aceProvider.id,
        name: aceProvider.name
      } : null
    });
  } catch (error) {
    console.error('Error in test-providers endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing providers',
      error: String(error)
    });
  }
});

// Test endpoint to check exchange rates in database
testRouter.get('/test-exchange-rates', async (_req: Request, res: Response) => {
  try {
    const providers = await storage.getProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      return res.status(404).json({
        success: false,
        message: 'ACE Money Transfer provider not found'
      });
    }
    
    // Use direct database query instead of storage method
const rates = await db.select()
  .from(storage.tables.exchangeRates)
  .where(eq(storage.tables.exchangeRates.provider_id, aceProvider.id))
  .orderBy(sql`timestamp DESC`);
    
    return res.json({
      success: true,
      provider: {
        id: aceProvider.id,
        name: aceProvider.name
      },
      rates_count: rates.length,
      rates: rates
    });
  } catch (error) {
    console.error('Error in test-exchange-rates endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing exchange rates',
      error: String(error)
    });
  }
});

export default testRouter;