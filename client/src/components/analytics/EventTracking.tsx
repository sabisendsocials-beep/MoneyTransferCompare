import { trackEvent } from "../../lib/analytics";

// Track currency selection events
export const trackCurrencySelection = (
  fromCurrency: string,
  toCurrency: string,
  location: string
) => {
  trackEvent(
    'currency_selection',
    'currency',
    `${fromCurrency}_to_${toCurrency}`,
    0
  );
  
  // Additional details for location of selection
  trackEvent(
    'selection_location',
    'interface',
    location, // e.g., 'homepage', 'calculator', 'header'
    0
  );
};

// Track provider interactions
export const trackProviderClick = (
  providerName: string, 
  fromCurrency: string,
  toCurrency: string,
  amount: number
) => {
  trackEvent(
    'provider_selected',
    'provider',
    providerName,
    0
  );
  
  // Track complete transfer details
  trackEvent(
    'transfer_details',
    'transfer',
    `${fromCurrency}_to_${toCurrency}_via_${providerName}`,
    amount
  );
};

// Track comparison flow completion
export const trackComparisonComplete = (
  fromCurrency: string,
  toCurrency: string,
  providersCount: number
) => {
  trackEvent(
    'comparison_complete',
    'user_journey',
    `${fromCurrency}_to_${toCurrency}`,
    providersCount
  );
};

// Track form submissions
export const trackFormSubmission = (
  formType: string,
  success: boolean
) => {
  trackEvent(
    'form_submission',
    'engagement',
    `${formType}_${success ? 'success' : 'failure'}`,
    0
  );
};

// Track feature usage
export const trackFeatureUsage = (
  featureName: string,
  details?: string
) => {
  trackEvent(
    'feature_usage',
    'engagement',
    `${featureName}${details ? '_' + details : ''}`,
    0
  );
};

// Track calculator usage
export const trackCalculatorUsage = (
  fromCurrency: string,
  toCurrency: string,
  amount: number
) => {
  trackEvent(
    'calculator_usage',
    'tool',
    `${fromCurrency}_to_${toCurrency}`,
    amount
  );
};

// Track chart interactions
export const trackChartInteraction = (
  chartType: string, 
  timeRange: string,
  currencyPair: string
) => {
  trackEvent(
    'chart_interaction',
    'data_visualization',
    `${chartType}_${timeRange}_${currencyPair}`,
    0
  );
};

// Track search behavior
export const trackSearch = (
  searchTerm: string,
  resultsCount: number
) => {
  trackEvent(
    'search',
    'engagement',
    searchTerm,
    resultsCount
  );
};

// Track time spent on page
export const trackTimeOnPage = (
  pageName: string,
  timeInSeconds: number
) => {
  trackEvent(
    'time_on_page',
    'engagement',
    pageName,
    timeInSeconds
  );
};

// Track errors encountered
export const trackError = (
  errorType: string,
  errorMessage: string
) => {
  trackEvent(
    'error',
    'error',
    `${errorType}: ${errorMessage}`,
    0
  );
};