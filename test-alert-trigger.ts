#!/usr/bin/env tsx

/**
 * Test Alert Trigger System
 * Manually tests the alert monitoring and triggering functionality
 */

import { db } from './server/db';
import { rateAlerts } from './shared/schema';
import { eq } from 'drizzle-orm';
import { getPendingAlerts, checkAlertTrigger } from './server/services/rateAlertService';

async function testAlerts() {
  console.log('=== Testing Alert Trigger System ===\n');
  
  try {
    // Get all pending alerts
    const pendingAlerts = await getPendingAlerts();
    console.log(`Found ${pendingAlerts.length} pending alerts\n`);
    
    if (pendingAlerts.length === 0) {
      console.log('No pending alerts to test');
      return;
    }
    
    // Test each alert
    for (const alert of pendingAlerts) {
      console.log(`Testing Alert #${alert.id}:`);
      console.log(`  Email: ${alert.email}`);
      console.log(`  Pair: ${alert.from_currency}/${alert.to_currency}`);
      console.log(`  Target: ${alert.target_value}`);
      console.log(`  Basis: ${alert.alert_basis}`);
      
      // Check if alert should trigger
      const triggerResult = await checkAlertTrigger(alert);
      
      console.log(`  Current Rate: ${triggerResult.currentRate}`);
      console.log(`  Should Trigger: ${triggerResult.shouldTrigger}`);
      console.log(`  Provider: ${triggerResult.providerName || 'N/A'}`);
      
      if (triggerResult.shouldTrigger) {
        console.log(`  *** ALERT READY TO TRIGGER ***`);
      }
      
      console.log(''); // Empty line between alerts
    }
    
    console.log('=== Alert Test Complete ===');
    
  } catch (error) {
    console.error('Error testing alerts:', error);
  }
  
  process.exit(0);
}

testAlerts();