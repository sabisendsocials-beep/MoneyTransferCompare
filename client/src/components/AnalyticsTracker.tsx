import { trackEvent } from "@/lib/analytics";

// Key user interaction events we want to track
type TrackableEvent = 
  | 'provider_click'           // When user clicks on a provider's website link
  | 'compare_search'           // When user performs a comparison search
  | 'currency_change'          // When user changes currency selection
  | 'amount_change'            // When user changes transfer amount
  | 'trend_period_change'      // When user changes the trend chart period
  | 'contact_form_submit'      // When user submits the contact form
  | 'news_article_click'       // When user clicks on a news article
  | 'feature_interaction';     // When user interacts with a feature card

interface TrackingInfo {
  category: string;
  label?: string;
  value?: number;
}

/**
 * Utility to track user interactions in a consistent way
 * 
 * @param action The type of event to track
 * @param info Additional tracking information 
 */
export const trackUserInteraction = (
  action: TrackableEvent, 
  info: TrackingInfo
) => {
  trackEvent(action, info.category, info.label, info.value);
};

// Track when a user selects a provider
export const trackProviderClick = (providerName: string, fromCurrency: string, toCurrency: string) => {
  trackUserInteraction('provider_click', {
    category: 'conversion',
    label: `${providerName}: ${fromCurrency} to ${toCurrency}`
  });
};

// Track when a user performs a comparison search
export const trackComparisonSearch = (fromCurrency: string, toCurrency: string, amount: number) => {
  trackUserInteraction('compare_search', {
    category: 'search',
    label: `${fromCurrency} to ${toCurrency}`,
    value: amount
  });
};

// Track when a user changes currency
export const trackCurrencyChange = (fromCurrency: string, toCurrency: string) => {
  trackUserInteraction('currency_change', {
    category: 'user_preference',
    label: `${fromCurrency} to ${toCurrency}`
  });
};

// Track when a user changes the amount
export const trackAmountChange = (amount: number, currency: string) => {
  trackUserInteraction('amount_change', {
    category: 'user_preference',
    label: currency,
    value: amount
  });
};

// Track when a user changes the time period on trend charts
export const trackTrendPeriodChange = (days: number) => {
  trackUserInteraction('trend_period_change', {
    category: 'chart_interaction',
    label: `${days} days`,
    value: days
  });
};

// Track when a user submits the contact form
export const trackContactFormSubmit = (topic: string) => {
  trackUserInteraction('contact_form_submit', {
    category: 'engagement',
    label: topic
  });
};

// Track when a user clicks on a news article
export const trackNewsArticleClick = (articleTitle: string) => {
  trackUserInteraction('news_article_click', {
    category: 'content',
    label: articleTitle
  });
};

// Track when a user interacts with a feature
export const trackFeatureInteraction = (featureName: string) => {
  trackUserInteraction('feature_interaction', {
    category: 'feature',
    label: featureName
  });
};