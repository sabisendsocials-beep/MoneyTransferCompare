#!/usr/bin/env tsx

/**
 * Test Complete Alert Flow
 * Tests the full alert workflow including email notifications
 */

import { getPendingAlerts, checkAlertTrigger, markAlertTriggered } from './server/services/rateAlertService';
import { sendRateAlertEmail } from './server/services/alertNotificationService';

async function testCompleteFlow() {
  console.log('=== Testing Complete Alert Flow ===\n');
  
  try {
    // Get pending alerts
    const pendingAlerts = await getPendingAlerts();
    console.log(`Found ${pendingAlerts.length} pending alerts`);
    
    let triggeredCount = 0;
    
    // Process each alert
    for (const alert of pendingAlerts) {
      console.log(`\nProcessing alert #${alert.id} (${alert.email})`);
      
      // Check if should trigger
      const triggerCheck = await checkAlertTrigger(alert);
      
      if (triggerCheck.shouldTrigger && triggerCheck.currentRate !== null) {
        console.log(`  ✓ Alert triggers: ${triggerCheck.currentRate} >= ${triggerCheck.targetRate}`);
        
        // Test email notification
        console.log(`  → Sending email notification...`);
        const emailResult = await sendRateAlertEmail({
          alert,
          currentRate: triggerCheck.currentRate,
          targetRate: triggerCheck.targetRate,
          providerName: triggerCheck.providerName,
        });
        
        if (emailResult.success) {
          console.log(`  ✓ Email sent successfully`);
          
          // Mark as triggered
          await markAlertTriggered(alert.id);
          console.log(`  ✓ Alert marked as triggered`);
          triggeredCount++;
        } else {
          console.log(`  ✗ Email failed: ${emailResult.error}`);
        }
      } else {
        console.log(`  - Not triggered (${triggerCheck.currentRate} < ${triggerCheck.targetRate})`);
      }
    }
    
    console.log(`\n=== Flow Complete: ${triggeredCount} alerts triggered ===`);
    
  } catch (error) {
    console.error('Error in complete flow test:', error);
  }
  
  process.exit(0);
}

testCompleteFlow();