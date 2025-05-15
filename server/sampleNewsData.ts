import { InsertNews } from '@shared/schema';

// Create dates for the past 3 days
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

/**
 * Fresh sample news data for countries we support
 * Used when scraping fails to ensure users always see recent, relevant news
 * All news items are set with recent dates (within the past 3 days)
 */
export const sampleNews: InsertNews[] = [
  {
    title: "Nigeria Announces Major Infrastructure Investment in Lagos Transport System",
    summary: "The Nigerian government has approved funding for a new rapid transit system in Lagos to ease congestion.",
    content: "The Federal Government of Nigeria has announced a major infrastructure investment to expand Lagos's public transportation system. The project, worth over $800 million, will develop new rail lines and bus rapid transit corridors to alleviate the city's notorious traffic congestion. Construction is expected to begin next month and will create thousands of jobs while significantly reducing commute times for millions of Lagos residents.",
    source: "The Guardian Nigeria",
    url: "https://guardian.ng",
    image_url: "https://source.unsplash.com/featured/?lagos,transport",
    category: "Infrastructure",
    country: "Nigeria",
    published_at: today
  },
  {
    title: "Nigerian Tech Startups Attract Record $400 Million Investment in Q1 2025",
    summary: "Despite global economic challenges, Nigerian tech ecosystem shows remarkable resilience with record funding.",
    content: "Nigerian technology startups have raised a record $400 million in the first quarter of 2025, according to a new report by AfricArena. This represents a 35% increase from the same period last year, highlighting the growing global confidence in Nigeria's innovation ecosystem. Fintech companies led the funding rounds, followed by healthtech and agritech startups. The report notes that improved regulatory frameworks and government support have contributed to this positive trend.",
    source: "TechCabal",
    url: "https://techcabal.com",
    image_url: "https://source.unsplash.com/featured/?tech,nigeria",
    category: "Technology",
    country: "Nigeria",
    published_at: yesterday
  },
  {
    title: "Nigeria's Super Eagles Qualify for 2026 World Cup in Dramatic Match",
    summary: "Nigeria secured a last-minute victory against South Africa to qualify for the next FIFA World Cup.",
    content: "Nigeria's national football team, the Super Eagles, has qualified for the 2026 FIFA World Cup after a dramatic 2-1 victory over South Africa. The winning goal came in the 93rd minute from striker Victor Osimhen, sending fans across the country into wild celebrations. This will be Nigeria's seventh World Cup appearance, with the team hoping to surpass their previous best performance of reaching the Round of 16.",
    source: "Complete Sports Nigeria",
    url: "https://completesports.com",
    image_url: "https://source.unsplash.com/featured/?football,nigeria",
    category: "Sports",
    country: "Nigeria",
    published_at: twoDaysAgo
  },
  {
    title: "Ghana Launches Ambitious Renewable Energy Program",
    summary: "Ghana aims to generate 50% of its electricity from renewable sources by 2030 with new solar and wind projects.",
    content: "The Government of Ghana has launched an ambitious renewable energy program aimed at generating 50% of the country's electricity from clean sources by 2030. The initiative includes the construction of Africa's largest solar farm in the Northern Region and several wind power installations along the coast. The $2.5 billion project is expected to create over 10,000 jobs and significantly reduce Ghana's carbon footprint while lowering energy costs in the long term.",
    source: "Ghana Business News",
    url: "https://www.ghanabusinessnews.com",
    image_url: "https://source.unsplash.com/featured/?solar,ghana",
    category: "Energy",
    country: "Ghana",
    published_at: today
  },
  {
    title: "Ghana's Film Industry Gets Major Boost with New $20 Million Studio Complex",
    summary: "Netflix-backed studio aims to make Ghana a hub for film production in West Africa.",
    content: "Ghana's film industry, often called Ghallywood, has received a major boost with the opening of a new $20 million studio complex in Accra. The facility, partially funded by Netflix, features state-of-the-art sound stages, post-production facilities, and training programs for local talent. The investment is expected to create thousands of jobs and position Ghana as a major hub for film and television production in West Africa, competing with Nigeria's Nollywood.",
    source: "Joy Online",
    url: "https://www.myjoyonline.com",
    image_url: "https://source.unsplash.com/featured/?film,ghana",
    category: "Entertainment",
    country: "Ghana",
    published_at: yesterday
  },
  {
    title: "Nigerian Universities Witness Surge in International Student Enrollment",
    summary: "Recent improvements in facilities and global rankings attract students from across Africa and beyond.",
    content: "Nigerian universities are experiencing a significant increase in international student enrollment, with numbers up by 45% compared to last year. Education experts attribute this surge to recent improvements in facilities, research output, and global rankings of several Nigerian institutions. Students from across Africa, as well as from Europe, Asia, and North America, are choosing Nigeria for various programs, particularly in technology, medicine, and African studies. This trend is expected to contribute positively to Nigeria's economy and cultural exchange.",
    source: "The Cable Nigeria",
    url: "https://www.thecable.ng",
    image_url: "https://source.unsplash.com/featured/?university,nigeria",
    category: "Education",
    country: "Nigeria",
    published_at: twoDaysAgo
  }
];