import { scrapeWorldRemitRate } from './scrapers/worldRemitScraper';

async function testWorldRemitScraper() {
  console.log('Testing WorldRemit Scraper...');
  
  try {
    const rate = await scrapeWorldRemitRate();
    
    if (rate !== null) {
      console.log(`Successfully scraped WorldRemit rate: ${rate}`);
    } else {
      console.log('Failed to scrape WorldRemit rate');
    }
  } catch (error) {
    console.error('Error testing WorldRemit scraper:', error);
  }
}

// Run the test
testWorldRemitScraper().catch(console.error);