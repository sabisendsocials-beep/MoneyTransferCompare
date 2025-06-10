#!/usr/bin/env tsx

/**
 * Test Rate Alert System
 * Manual test to verify alert monitoring and triggering functionality
 */

import { getPendingAlerts, checkAlertTrigger } from './server/services/rateAlertService';
import { db } from './server/db';
import { rateAlerts } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testAlerts() {
  console.log('=== Testing Rate Alert System ===\n');
  
  try {
    // First, show current pending alerts
    console.log('1. Checking current pending alerts...');
    const pendingAlerts = await db
      .select()
      .from(rateAlerts)
      .where(eq(rateAlerts.alert_status, 'pending'));
    
    console.log(`Found ${pendingAlerts.length} pending alerts:`);
    pendingAlerts.forEach(alert => {
      console.log(`  - Alert ID ${alert.id}: ${alert.email} for ${alert.from_currency}/${alert.to_currency} at ${alert.target_value}`);
      console.log(`    Basis: ${alert.alert_basis}, Created: ${alert.created_at}`);
    });
    
    if (pendingAlerts.length === 0) {
      console.log('No pending alerts to test. Create some alerts first.\n');
      return;
    }
    
    console.log('\n2. Running rate alert monitoring check...');
    const result = await checkRateAlerts();
    
    console.log('\n3. Results:');
    console.log(`  - Alerts checked: ${result.alertsChecked}`);
    console.log(`  - Alerts triggered: ${result.alertsTriggered}`);
    console.log(`  - Notifications sent: ${result.notifications.length}`);
    
    if (result.notifications.length > 0) {
      console.log('\n4. Triggered notifications:');
      result.notifications.forEach((notification, index) => {
        console.log(`  Notification ${index + 1}:`);
        console.log(`    - Email: ${notification.email}`);
        console.log(`    - Currency: ${notification.fromCurrency}/${notification.toCurrency}`);
        console.log(`    - Target: ${notification.targetRate}`);
        console.log(`    - Current: ${notification.currentRate}`);
        console.log(`    - Basis: ${notification.alertBasis}`);
      });
    }
    
    console.log('\n5. Checking alert status after monitoring...');
    const alertsAfter = await db
      .select()
      .from(rateAlerts)
      .where(eq(rateAlerts.alert_status, 'triggered'));
    
    console.log(`Found ${alertsAfter.length} triggered alerts after check.`);
    
    console.log('\n=== Rate Alert Test Complete ===');
    
  } catch (error) {
    console.error('Error testing rate alerts:', error);
  }
  
  process.exit(0);
}

testAlerts();