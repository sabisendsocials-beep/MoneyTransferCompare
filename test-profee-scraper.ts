/**
 * Test script for Profee scraper with the new CSS selector from the HTML screenshot
 */

import puppeteer from 'puppeteer';

async function testProfeeScraper() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('Testing Profee scraper with new CSS selector...');
    console.log('Navigating to Profee website...');
    
    await page.goto('https://profee.com/send-money/from-gbp-to-ngn', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for JavaScript to load
    await page.waitForTimeout(5000);
    
    // Test multiple potential CSS selectors based on the HTML structure
    const selectors = [
      'span:contains("NGN")',  // Target span containing NGN
      'span[class*="PromoText"]',  // Target spans with PromoText class
      'div[class*="PromoCurrency"] span',  // Target spans within PromoCurrency div
      '.PromoCurrencyRateMessage_badge__content span',  // Full class path
      'span b',  // Target bold text within spans
      'span:contains("2,172")',  // Direct search for rate pattern
    ];
    
    console.log('\nTesting different CSS selectors:');
    
    for (const selector of selectors) {
      try {
        const elements = await page.$$eval(selector, (els) => 
          els.map(el => el.textContent?.trim()).filter(text => text && text.length > 0)
        );
        
        console.log(`\nSelector: ${selector}`);
        console.log(`Found ${elements.length} elements`);
        elements.forEach((text, index) => {
          console.log(`  Element ${index + 1}: "${text}"`);
        });
        
        // Look for rate patterns in the text
        elements.forEach((text, index) => {
          const rateMatch = text?.match(/(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/);
          if (rateMatch && text.includes('NGN')) {
            console.log(`  *** POTENTIAL RATE FOUND in element ${index + 1}: ${rateMatch[1]} ***`);
          }
        });
        
      } catch (error) {
        console.log(`Selector ${selector} failed: ${error}`);
      }
    }
    
    // Also get the full page content to analyze
    console.log('\nSearching page content for rate patterns...');
    const pageContent = await page.content();
    
    // Look for rate patterns in the full content
    const ratePatterns = [
      /GBP.*?NGN.*?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /NGN.*?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(\d{1,4}(?:,\d{3})*(?:\.\d{2})?).*?NGN/gi
    ];
    
    ratePatterns.forEach((pattern, index) => {
      const matches = pageContent.match(pattern);
      if (matches) {
        console.log(`\nPattern ${index + 1} matches:`);
        matches.slice(0, 5).forEach(match => console.log(`  "${match}"`));
      }
    });
    
  } catch (error) {
    console.error('Error testing Profee scraper:', error);
  } finally {
    await browser.close();
  }
}

testProfeeScraper();