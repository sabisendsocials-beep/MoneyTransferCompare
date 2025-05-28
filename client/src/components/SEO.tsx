import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  structuredData?: object;
  noIndex?: boolean;
}

export function SEO({
  title = "SabiSend - Compare Best Money Transfer Rates to Nigeria & Ghana | Save Money on Remittances",
  description = "Compare live exchange rates from 15+ money transfer providers. Send money to Nigeria and Ghana with the best rates. Save up to £50 per transfer with SabiSend.",
  keywords = "money transfer, send money to Nigeria, GBP to NGN, remittance rates, transfer money Ghana, best exchange rates, international money transfer",
  canonicalUrl = "https://sabisend.com",
  ogImage = "https://sabisend.com/og-image.jpg",
  structuredData,
  noIndex = false
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

// Structured data schemas for different page types
export const createFinancialServiceSchema = () => ({
  "@context": "https://schema.org",
  "@type": "FinancialService",
  "name": "SabiSend",
  "description": "Money transfer comparison platform for sending money to Nigeria and Ghana",
  "url": "https://sabisend.com",
  "logo": "https://sabisend.com/logo.png",
  "sameAs": [
    "https://twitter.com/sabisend",
    "https://facebook.com/sabisend"
  ],
  "serviceType": "Money Transfer Comparison",
  "provider": {
    "@type": "Organization",
    "name": "SabiSend",
    "url": "https://sabisend.com"
  },
  "areaServed": [
    {
      "@type": "Country",
      "name": "United Kingdom"
    },
    {
      "@type": "Country", 
      "name": "European Union"
    }
  ],
  "serviceOutput": {
    "@type": "Service",
    "name": "Exchange Rate Comparison"
  }
});

export const createCurrencyExchangeSchema = (fromCurrency: string, toCurrency: string, rate: number) => ({
  "@context": "https://schema.org",
  "@type": "ExchangeRateSpecification",
  "currency": fromCurrency,
  "currentExchangeRate": {
    "@type": "UnitPriceSpecification",
    "price": rate,
    "priceCurrency": toCurrency
  },
  "exchangeRateSpread": {
    "@type": "QuantitativeValue",
    "value": "Competitive rates from multiple providers"
  }
});

export const createComparisonSchema = (providers: string[]) => ({
  "@context": "https://schema.org",
  "@type": "ComparisonShoppingService",
  "name": "SabiSend Money Transfer Comparison",
  "description": "Compare money transfer rates from multiple providers",
  "serviceType": "Financial Service Comparison",
  "provider": providers.map(provider => ({
    "@type": "Organization",
    "name": provider
  }))
});

export const createWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "SabiSend",
  "url": "https://sabisend.com",
  "description": "Compare the best money transfer rates to Nigeria and Ghana",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://sabisend.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  },
  "publisher": {
    "@type": "Organization",
    "name": "SabiSend",
    "logo": {
      "@type": "ImageObject",
      "url": "https://sabisend.com/logo.png"
    }
  }
});

export const createBreadcrumbSchema = (items: Array<{name: string, url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});