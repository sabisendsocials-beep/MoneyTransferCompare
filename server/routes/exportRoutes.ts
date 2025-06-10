import { Router, Request, Response } from 'express';
import { db } from '../db';
import { rateTrends } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const router = Router();

// Export rate history as CSV
router.get('/api/export/rate-history', async (req: Request, res: Response) => {
  try {
    const { fromCurrency, toCurrency, startDate, endDate, format = 'csv' } = req.query;

    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({ 
        success: false, 
        error: 'fromCurrency and toCurrency are required' 
      });
    }

    // Build query conditions
    let whereConditions = and(
      eq(rateTrends.fromCurrency, fromCurrency as string),
      eq(rateTrends.toCurrency, toCurrency as string)
    );

    if (startDate) {
      whereConditions = and(whereConditions, gte(rateTrends.date, startDate as string));
    }

    if (endDate) {
      whereConditions = and(whereConditions, lte(rateTrends.date, endDate as string));
    }

    // Fetch data from database
    const data = await db
      .select({
        date: rateTrends.date,
        rate: rateTrends.rate,
        fromCurrency: rateTrends.fromCurrency,
        toCurrency: rateTrends.toCurrency,
        source: rateTrends.source,
      })
      .from(rateTrends)
      .where(whereConditions)
      .orderBy(desc(rateTrends.date));

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found for the specified criteria'
      });
    }

    if (format === 'json') {
      return res.json({
        success: true,
        data,
        metadata: {
          total: data.length,
          fromCurrency,
          toCurrency,
          startDate: startDate || data[data.length - 1]?.date,
          endDate: endDate || data[0]?.date,
          exportedAt: new Date().toISOString()
        }
      });
    }

    // Generate CSV content
    const csvHeaders = 'Date,From Currency,To Currency,Exchange Rate,Data Source\n';
    const csvRows = data.map(row => 
      `${row.date},${row.fromCurrency},${row.toCurrency},${row.rate},${row.source || 'unknown'}`
    ).join('\n');
    
    const csvContent = csvHeaders + csvRows;

    // Set response headers for CSV download
    const filename = `rate-history-${fromCurrency}-${toCurrency}-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting rate history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export rate history' 
    });
  }
});

// Get available export data summary
router.get('/api/export/summary', async (req: Request, res: Response) => {
  try {
    // Get available currency pairs and date ranges
    const summary = await db
      .select({
        fromCurrency: rateTrends.fromCurrency,
        toCurrency: rateTrends.toCurrency,
      })
      .from(rateTrends)
      .groupBy(rateTrends.fromCurrency, rateTrends.toCurrency);

    // Get date ranges for each pair
    const pairSummaries = await Promise.all(
      summary.map(async (pair) => {
        const dateRange = await db
          .select({
            earliestDate: rateTrends.date,
            latestDate: rateTrends.date,
          })
          .from(rateTrends)
          .where(
            and(
              eq(rateTrends.fromCurrency, pair.fromCurrency),
              eq(rateTrends.toCurrency, pair.toCurrency)
            )
          )
          .orderBy(rateTrends.date)
          .limit(1);

        const latestRange = await db
          .select({
            latestDate: rateTrends.date,
          })
          .from(rateTrends)
          .where(
            and(
              eq(rateTrends.fromCurrency, pair.fromCurrency),
              eq(rateTrends.toCurrency, pair.toCurrency)
            )
          )
          .orderBy(desc(rateTrends.date))
          .limit(1);

        const count = await db
          .select()
          .from(rateTrends)
          .where(
            and(
              eq(rateTrends.fromCurrency, pair.fromCurrency),
              eq(rateTrends.toCurrency, pair.toCurrency)
            )
          );

        return {
          ...pair,
          earliestDate: dateRange[0]?.earliestDate,
          latestDate: latestRange[0]?.latestDate,
          totalRecords: count.length
        };
      })
    );

    res.json({
      success: true,
      data: pairSummaries.sort((a, b) => 
        `${a.fromCurrency}-${a.toCurrency}`.localeCompare(`${b.fromCurrency}-${b.toCurrency}`)
      )
    });

  } catch (error) {
    console.error('Error getting export summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get export summary' 
    });
  }
});

export default router;