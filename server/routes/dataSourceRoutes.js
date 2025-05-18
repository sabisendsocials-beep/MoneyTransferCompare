import express from 'express';
import { db } from '../db';
import { exchangeRates, providers } from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

const router = express.Router();

/**
 * Get verified rates
 */
router.get('/verified-rates', async (req, res) => {
  try {
    const verifiedRates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.verified, true))
      .orderBy(desc(exchangeRates.timestamp));

    return res.json({
      success: true,
      rates: verifiedRates
    });
  } catch (error) {
    console.error(`Error fetching verified rates: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verified rates',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get latest rates for specific providers
 */
router.get('/latest-provider-rates', async (req, res) => {
  try {
    const { providerId, fromCurrency, toCurrency } = req.query;
    
    let query = db
      .select({
        rate: exchangeRates,
        provider: providers
      })
      .from(exchangeRates)
      .innerJoin(providers, eq(exchangeRates.providerId, providers.id))
      .orderBy(desc(exchangeRates.timestamp));
    
    if (providerId) {
      query = query.where(eq(exchangeRates.providerId, parseInt(providerId)));
    }
    
    if (fromCurrency && toCurrency) {
      query = query.where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency)
        )
      );
    }
    
    // Limit to 50 most recent rates
    const results = await query.limit(50);
    
    return res.json({
      success: true,
      rates: results.map(r => ({
        ...r.rate,
        providerName: r.provider.name,
        logo: r.provider.logo
      }))
    });
  } catch (error) {
    console.error(`Error fetching latest provider rates: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch latest provider rates',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get data source statistics
 */
router.get('/data-source-stats', async (_req, res) => {
  try {
    // Get counts by source type
    const sourceStats = await db.execute(
      `SELECT source, COUNT(*) as count 
       FROM exchange_rates 
       GROUP BY source 
       ORDER BY count DESC`
    );
    
    // Get verified vs. unverified count
    const verificationStats = await db.execute(
      `SELECT 
         SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) as verified_count,
         SUM(CASE WHEN verified = false OR verified IS NULL THEN 1 ELSE 0 END) as unverified_count
       FROM exchange_rates`
    );
    
    return res.json({
      success: true,
      sourceStats: sourceStats.rows || [],
      verificationStats: verificationStats.rows?.[0] || { verified_count: 0, unverified_count: 0 }
    });
  } catch (error) {
    console.error(`Error fetching data source stats: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch data source statistics',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;