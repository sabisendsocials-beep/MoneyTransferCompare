/**
 * ACE Money Transfer scraper updater script
 * 
 * This file adds the ACE Money Transfer scraper to our provider handling logic
 */
import { updateAceMoneyTransferRate } from './aceMoneyTransferScraper';
import { storage } from '../storage';

export async function integrateAceMoneyTransfer() {
  try {
    // Get ACE Money Transfer provider from database
    const providers = await storage.getAllProviders();
    const aceProvider = providers.find(p => p.name === 'ACE Money Transfer');
    
    if (!aceProvider) {
      console.log('❌ ACE Money Transfer provider not found in database');
      return false;
    }
    
    // Get URL and selector from provider config
    const aceUrl = aceProvider.scraping_url;
    // Use the selector from the screenshot or admin config if available
    const aceSelector = aceProvider.scraping_selector || 'span.color-000.lt-61C';
    
    if (!aceUrl) {
      console.log('❌ Missing URL for ACE Money Transfer in admin config. Cannot continue.');
      return false;
    }
    
    console.log(`=== Using dedicated ACE Money Transfer scraper with admin-configured URL and selectors ONLY... ===`);
    console.log(`Using admin-configured URL for ACE Money Transfer: ${aceUrl}`);
    console.log(`Using CSS selector: ${aceSelector}`);
    
    // Use the dedicated scraper
    let success = await updateAceMoneyTransferRate(aceUrl, aceSelector, aceProvider.id, 'GBP', 'NGN');
    
    if (success) {
      console.log('=== Successfully updated ACE Money Transfer rate with dedicated scraper ===');
      return true;
    } else {
      console.log('=== Dedicated ACE Money Transfer scraper failed ===');
      return false;
    }
  } catch (error) {
    console.error('Error with ACE Money Transfer integration:', error);
    return false;
  }
}

// Function to initialize and run the ACE Money Transfer update
export async function runAceMoneyTransferUpdate() {
  console.log('Starting ACE Money Transfer rate update...');
  const success = await integrateAceMoneyTransfer();
  
  if (success) {
    console.log('ACE Money Transfer rate update completed successfully');
  } else {
    console.log('ACE Money Transfer rate update failed');
  }
  
  return success;
}