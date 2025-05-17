/**
 * TrustPilot Rating Scraper
 * Fetches accurate ratings directly from TrustPilot website
 */

import { log } from '../vite';

interface TrustpilotResult {
  providerName: string;
  rating: number;
  reviewCount: number;
  url: string;
  success: boolean;
}

/**
 * TrustPilot domain mappings for each provider
 * These are the correct domains used on TrustPilot for each provider
 */
const trustpilotDomains: Record<string, string> = {
  'Western Union': 'westernunion.com',
  'MoneyGram': 'moneygram.com',
  'Wise': 'wise.com',
  'WorldRemit': 'worldremit.com',
  'Remitly': 'remitly.com',
  'Sendwave': 'sendwave.com',
  'Lemfi': 'lemfi.com',
  'Nala': 'nala.money',
  'Taptap Send': 'taptapsend.com',
  'Small World': 'smallworldfs.com',
  'Azimo': 'azimo.com',
  'XE Money Transfer': 'xe.com',
  'TorFX': 'torfx.com',
  'Paysend': 'paysend.com'
};

/**
 * Fetches the TrustPilot rating for a provider
 * @param providerName The name of the provider
 * @returns The TrustPilot rating or null if not found
 */
export async function getTrustpilotRating(providerName: string): Promise<TrustpilotResult> {
  const domain = trustpilotDomains[providerName];
  
  if (!domain) {
    log(`No TrustPilot domain mapping found for ${providerName}`);
    return {
      providerName,
      rating: 0,
      reviewCount: 0,
      url: '',
      success: false
    };
  }
  
  try {
    const url = `https://www.trustpilot.com/review/${domain}`;
    log(`Fetching TrustPilot rating for ${providerName} from ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      log(`Failed to fetch TrustPilot page for ${providerName}: ${response.status} ${response.statusText}`);
      return {
        providerName,
        rating: 0,
        reviewCount: 0,
        url,
        success: false
      };
    }
    
    const html = await response.text();
    
    // Extract the TrustScore rating
    const ratingMatch = html.match(/TrustScore\s*([0-9.]+)/i) || 
                        html.match(/rating\s*[""'']([0-9.]+)[""'']/i) ||
                        html.match(/trustscore[^>]*>([0-9.]+)</i);
    
    if (ratingMatch && ratingMatch[1]) {
      const rating = parseFloat(ratingMatch[1]);
      
      // Extract the number of reviews if possible
      const reviewCountMatch = html.match(/reviews">([0-9,]+)</i) || 
                              html.match(/([0-9,]+)\s*reviews/i);
      const reviewCount = reviewCountMatch ? 
        parseInt(reviewCountMatch[1].replace(/,/g, '')) : 0;
      
      log(`Found TrustPilot rating for ${providerName}: ${rating} stars (${reviewCount} reviews)`);
      
      return {
        providerName,
        rating,
        reviewCount,
        url,
        success: true
      };
    }
    
    // If we can't find the rating, look for alternative patterns
    const alternativeRatingMatch = html.match(/stars">([0-9.]+)</i) || 
                                   html.match(/data-rating="([0-9.]+)"/i);
    
    if (alternativeRatingMatch && alternativeRatingMatch[1]) {
      const rating = parseFloat(alternativeRatingMatch[1]);
      log(`Found alternative TrustPilot rating for ${providerName}: ${rating} stars`);
      
      return {
        providerName,
        rating,
        reviewCount: 0,
        url,
        success: true
      };
    }
    
    log(`Could not extract TrustPilot rating for ${providerName}`);
    return {
      providerName,
      rating: 0,
      reviewCount: 0,
      url,
      success: false
    };
    
  } catch (error) {
    log(`Error fetching TrustPilot rating for ${providerName}: ${error}`);
    return {
      providerName,
      rating: 0,
      reviewCount: 0,
      url: `https://www.trustpilot.com/review/${domain}`,
      success: false
    };
  }
}

/**
 * Fetches TrustPilot ratings for all providers
 * @returns A record of provider names to ratings
 */
export async function getAllTrustpilotRatings(): Promise<Record<string, number>> {
  const ratings: Record<string, number> = {};
  
  for (const [providerName, domain] of Object.entries(trustpilotDomains)) {
    try {
      const result = await getTrustpilotRating(providerName);
      
      if (result.success && result.rating > 0) {
        ratings[providerName] = result.rating;
        log(`Successfully retrieved TrustPilot rating for ${providerName}: ${result.rating}`);
      } else {
        log(`Failed to retrieve TrustPilot rating for ${providerName}`);
      }
    } catch (error) {
      log(`Error fetching TrustPilot rating for ${providerName}: ${error}`);
    }
    
    // Wait a bit between requests to be polite to TrustPilot
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return ratings;
}