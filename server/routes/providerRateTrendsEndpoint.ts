/**
 * Provider Rate Trends API Endpoint
 * Returns historical rate data from specific providers for enhanced trend analysis
 */

import type { Request, Response } from 'express';
import { db } from '../db';
import { exchangeRates, providers } from '@shared/schema';
import { eq, and, gte, desc, sql, inArray } from 'drizzle-orm';

interface ProviderRatePoint {
  date: string;
  rate: number;
  provider_name: string;
  provider_id: number;
  verification_status: boolean;
}

export async function getProviderRateTrends(req: Request, res: Response): Promise<Response> {
  try {
    const { fromCurrency, toCurrency, days, providers: requestedProviders } = req.query;
    
    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({ 
        error: 'fromCurrency and toCurrency parameters are required' 
      });
    }

    const daysNum = parseInt(days as string) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);
    
    // Parse requested providers
    const providerNames = requestedProviders ? 
      (requestedProviders as string).split(',').map(p => p.trim()).filter(p => p.length > 0) : 
      [];

    console.log(`[Provider Trends API] Fetching ${fromCurrency}/${toCurrency} trends for ${daysNum} days`);
    console.log(`[Provider Trends API] Requested providers: ${providerNames.join(', ')}`);

    // Get provider rate trends with provider information
    const providerTrends = await db
      .select({
        date: sql<string>`DATE(${exchangeRates.timestamp})`,
        rate: exchangeRates.rate,
        provider_name: providers.name,
        provider_id: exchangeRates.provider_id,
        verification_status: exchangeRates.verified
      })
      .from(exchangeRates)
      .innerJoin(providers, eq(exchangeRates.provider_id, providers.id))
      .where(
        and(
          eq(exchangeRates.from_currency, fromCurrency as string),
          eq(exchangeRates.to_currency, toCurrency as string),
          gte(exchangeRates.timestamp, cutoffDate),
          // Filter by requested providers if specified
          providerNames.length > 0 ? 
            sql`${providers.name} IN (${sql.join(providerNames.map(name => sql`${name}`), sql`, `)})` : 
            sql`1=1`
        )
      )
      .orderBy(desc(exchangeRates.timestamp));

    console.log(`[Provider Trends API] Found ${providerTrends.length} provider rate points`);

    // Group by date and provider, keeping the latest rate per day per provider
    const groupedTrends = new Map<string, Map<string, ProviderRatePoint>>();
    
    providerTrends.forEach(trend => {
      const dateKey = trend.date;
      const providerKey = trend.provider_name;
      
      if (!groupedTrends.has(dateKey)) {
        groupedTrends.set(dateKey, new Map());
      }
      
      const dayData = groupedTrends.get(dateKey)!;
      
      // Keep the first (most recent) rate for each provider on each day
      if (!dayData.has(providerKey)) {
        dayData.set(providerKey, {
          date: dateKey,
          rate: trend.rate,
          provider_name: trend.provider_name,
          provider_id: trend.provider_id,
          verification_status: Boolean(trend.verification_status)
        });
      }
    });

    // Flatten the grouped data
    const processedTrends: ProviderRatePoint[] = [];
    groupedTrends.forEach(dayData => {
      dayData.forEach(trend => {
        processedTrends.push(trend);
      });
    });

    // Sort by date ascending
    processedTrends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`[Provider Trends API] Returning ${processedTrends.length} processed provider rate points`);
    
    if (processedTrends.length > 0) {
      console.log(`[Provider Trends API] Date range: ${processedTrends[0].date} to ${processedTrends[processedTrends.length - 1].date}`);
      
      // Log provider coverage
      const providerCoverage = new Map<string, number>();
      processedTrends.forEach(trend => {
        const count = providerCoverage.get(trend.provider_name) || 0;
        providerCoverage.set(trend.provider_name, count + 1);
      });
      
      console.log(`[Provider Trends API] Provider coverage:`, 
        Array.from(providerCoverage.entries()).map(([name, count]) => `${name}: ${count} points`).join(', ')
      );
    }

    return res.json(processedTrends);
  } catch (error) {
    console.error(`[Provider Trends API] Error fetching provider rate trends: ${error}`);
    return res.status(500).json({ error: 'Failed to fetch provider rate trends' });
  }
}