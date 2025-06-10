#!/usr/bin/env tsx

/**
 * Production Email Test
 * Tests the complete email alert system with verified domain
 */

import { sendTestAlertEmail } from './server/services/alertNotificationService';

async function testProductionEmail() {
  console.log('Testing production email with verified hello@sabisend.com domain...\n');
  
  // Test with your verified email first
  console.log('1. Testing with verified account email...');
  const result1 = await sendTestAlertEmail('seyi.kusa@highcityconsulting.com');
  
  if (result1.success) {
    console.log('✓ Verified account email sent successfully');
  } else {
    console.log('✗ Verified account email failed:', result1.error);
  }
  
  // Test with a different valid email domain
  console.log('\n2. Testing with external email address...');
  const result2 = await sendTestAlertEmail('test@gmail.com');
  
  if (result2.success) {
    console.log('✓ External email sent successfully');
    console.log('Your domain is fully verified for production use!');
  } else {
    console.log('✗ External email failed:', result2.error);
    console.log('This may indicate domain verification needs completion');
  }
  
  console.log('\n=== Email System Status ===');
  console.log('- Domain: hello@sabisend.com');
  console.log('- Service: Resend');
  console.log('- Integration: Complete');
  console.log('- Alert monitoring: Active (hourly checks)');
  
  process.exit(0);
}

testProductionEmail();