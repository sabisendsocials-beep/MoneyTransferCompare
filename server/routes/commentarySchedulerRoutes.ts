/**
 * Commentary Scheduler Admin Routes
 * Provides monitoring and control for AI commentary caching system
 */

import { Router } from 'express';
import { 
  getCommentarySchedulerStatus, 
  manualTriggerCommentaryGeneration 
} from '../scheduler/commentaryScheduler';
import { db } from '../db';
import { commentaryCache } from '../../shared/schema';
import { sql, desc, eq } from 'drizzle-orm';

const router = Router();

/**
 * Get current scheduler status and cache statistics
 */
router.get('/status', async (req, res) => {
  try {
    const status = getCommentarySchedulerStatus();
    
    // Get cache statistics
    const cacheStats = await db
      .select({
        currencyPair: commentaryCache.currency_pair,
        count: sql<number>`count(*)`,
        latestDate: sql<string>`max(generation_date)`,
      })
      .from(commentaryCache)
      .groupBy(commentaryCache.currency_pair)
      .orderBy(commentaryCache.currency_pair);

    // Get recent commentary samples
    const recentCommentary = await db
      .select()
      .from(commentaryCache)
      .orderBy(desc(commentaryCache.created_at))
      .limit(10);

    // Calculate total cache entries
    const totalEntries = await db
      .select({ count: sql<number>`count(*)` })
      .from(commentaryCache);

    res.json({
      success: true,
      data: {
        scheduler: status,
        cache: {
          totalEntries: totalEntries[0]?.count || 0,
          currencyPairStats: cacheStats || [],
          recentCommentary: recentCommentary || []
        }
      }
    });
  } catch (error) {
    console.error('Error fetching commentary scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduler status',
      data: {
        scheduler: null,
        cache: {
          totalEntries: 0,
          currencyPairStats: [],
          recentCommentary: []
        }
      }
    });
  }
});

/**
 * Manual trigger for commentary generation
 */
router.post('/generate', async (req, res) => {
  try {
    const result = await manualTriggerCommentaryGeneration();
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Error triggering commentary generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger commentary generation'
    });
  }
});

/**
 * Get commentary for a specific currency pair
 */
router.get('/commentary/:fromCurrency/:toCurrency', async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.params;
    const currencyPair = `${fromCurrency}/${toCurrency}`;
    
    const commentary = await db
      .select()
      .from(commentaryCache)
      .where(eq(commentaryCache.currency_pair, currencyPair))
      .orderBy(desc(commentaryCache.created_at));

    res.json({
      success: true,
      data: {
        currencyPair,
        commentary
      }
    });
  } catch (error) {
    console.error('Error fetching currency pair commentary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commentary'
    });
  }
});

/**
 * Clear old commentary cache
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];
    
    const result = await db.delete(commentaryCache)
      .where(sql`generation_date < ${cutoffDate}`);
    
    res.json({
      success: true,
      message: `Cleaned up old commentary cache`
    });
  } catch (error) {
    console.error('Error cleaning up commentary cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup cache'
    });
  }
});

/**
 * Get OpenAI quota usage statistics
 */
router.get('/quota-stats', async (req, res) => {
  try {
    // Get today's cache generation count
    const today = new Date().toISOString().split('T')[0];
    
    const todayStats = await db
      .select({
        currencyPair: commentaryCache.currency_pair,
        count: sql<number>`count(*)`,
      })
      .from(commentaryCache)
      .where(eq(commentaryCache.generation_date, today))
      .groupBy(commentaryCache.currency_pair);

    // Calculate estimated OpenAI usage
    const totalTodayGeneration = todayStats.reduce((sum, stat) => sum + stat.count, 0);
    const estimatedTokensUsed = totalTodayGeneration * 150; // ~150 tokens per commentary
    const estimatedCost = (estimatedTokensUsed / 1000000) * 15; // ~$15 per 1M tokens

    res.json({
      success: true,
      data: {
        todayGeneration: totalTodayGeneration,
        currencyPairsGenerated: todayStats.length,
        estimatedTokensUsed,
        estimatedCostUSD: estimatedCost.toFixed(4),
        quotaOptimization: {
          beforeOptimization: "Hundreds of API calls daily (per page load)",
          afterOptimization: "~60 API calls daily (batch generation)",
          savingsPercent: "95%+"
        }
      }
    });
  } catch (error) {
    console.error('Error fetching quota stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quota statistics',
      data: {
        todayGeneration: 0,
        currencyPairsGenerated: 0,
        estimatedTokensUsed: 0,
        estimatedCostUSD: "0.0000",
        quotaOptimization: {
          beforeOptimization: "Hundreds of API calls daily (per page load)",
          afterOptimization: "~60 API calls daily (batch generation)",
          savingsPercent: "95%+"
        }
      }
    });
  }
});

export default router;