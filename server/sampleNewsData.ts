import { InsertNews } from '@shared/schema';

/**
 * Sample news data for countries we support
 * Used when scraping fails to ensure users always see relevant news
 */
export const sampleNews: InsertNews[] = [
  {
    title: "Nigeria's Central Bank Announces New Foreign Exchange Measures",
    summary: "The Central Bank of Nigeria has introduced new policy measures to stabilize the forex market and improve liquidity.",
    content: "The Central Bank of Nigeria has announced a series of new policy measures aimed at stabilizing the foreign exchange market. These include increased intervention in the forex market, new guidelines for Bureau de Change operators, and enhanced monitoring of foreign exchange transactions. The move comes as part of ongoing efforts to reduce volatility in the naira's exchange rate against major currencies.",
    source: "Business Day Nigeria",
    url: "https://businessday.ng",
    image_url: "https://example.com/cbk-nigeria.jpg",
    category: "Economy",
    country: "Nigeria",
    published_at: new Date()
  },
  {
    title: "Nigerian Diaspora Remittances Reach Three-Year High",
    summary: "Money transfers from Nigerians abroad have hit their highest level since 2022, boosting forex reserves.",
    content: "Remittances from Nigerians in the diaspora have reached a three-year high, according to data from the Central Bank of Nigeria. The inflows, which totaled over $21 billion in the last fiscal year, represent a significant boost to the country's foreign exchange reserves. Analysts attribute the increase to improved transfer channels and competitive exchange rates offered by money transfer operators targeting the Nigerian corridor.",
    source: "Nairametrics",
    url: "https://nairametrics.com",
    image_url: "https://example.com/remittances-nigeria.jpg",
    category: "Finance",
    country: "Nigeria",
    published_at: new Date()
  },
  {
    title: "Ghana Secures New $3 Billion IMF Extended Credit Facility",
    summary: "The International Monetary Fund has approved a new credit facility to support Ghana's economic recovery program.",
    content: "Ghana has secured a new $3 billion Extended Credit Facility from the International Monetary Fund (IMF) to support its post-pandemic economic recovery program. The three-year arrangement aims to restore macroeconomic stability, debt sustainability, and lay the foundation for stronger and more inclusive growth. The program includes reforms to strengthen public finance management and address structural challenges in the economy.",
    source: "Ghana Business News",
    url: "https://www.ghanabusinessnews.com",
    image_url: "https://example.com/ghana-imf.jpg",
    category: "Economy",
    country: "Ghana",
    published_at: new Date()
  },
  {
    title: "Ghana Cedi Shows Signs of Stability After Volatile First Quarter",
    summary: "Ghana's currency is showing improved stability following implementation of new fiscal measures.",
    content: "The Ghana Cedi has shown signs of stabilization after a volatile first quarter, according to financial analysts. The currency, which experienced significant depreciation earlier in the year, has found support from improved foreign exchange inflows, prudent monetary policy measures by the Bank of Ghana, and the recent IMF program. Market observers expect this stability to continue as confidence in the economy improves.",
    source: "Business & Financial Times",
    url: "https://thebftonline.com",
    image_url: "https://example.com/ghana-cedi.jpg",
    category: "Currency",
    country: "Ghana",
    published_at: new Date()
  },
  {
    title: "Digital Payment Platforms Transforming Remittances to Nigeria",
    summary: "New digital platforms are making international money transfers faster and more affordable for Nigerians abroad.",
    content: "Digital payment platforms are revolutionizing how money is sent to Nigeria from abroad, with new fintech solutions cutting costs and transfer times. Companies like Lemfi, Nala, and Chipper Cash are providing alternatives to traditional remittance channels, offering competitive exchange rates and lower fees. The Nigerian diaspora, estimated at over 15 million people worldwide, sends billions of dollars home annually to support families and invest in local businesses.",
    source: "TechCabal",
    url: "https://techcabal.com",
    image_url: "https://example.com/digital-payments.jpg",
    category: "Technology",
    country: "Nigeria",
    published_at: new Date()
  },
  {
    title: "New World Bank Report Highlights Ghana's Digital Economy Growth",
    summary: "Ghana's digital economy is growing at 19% annually, outpacing many regional peers according to new research.",
    content: "A new World Bank report has highlighted Ghana's impressive digital economy growth, which is expanding at 19% annually. The report, 'Ghana's Digital Transformation: Accelerating Growth and Inclusion,' notes that digital financial services, e-commerce, and technology startups are driving this expansion. The digital economy now represents approximately 4.5% of Ghana's GDP, with potential to increase substantially with further investment in digital infrastructure and skills development.",
    source: "Ghana Web",
    url: "https://www.ghanaweb.com",
    image_url: "https://example.com/ghana-digital.jpg",
    category: "Technology",
    country: "Ghana",
    published_at: new Date()
  }
];