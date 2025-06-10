#!/usr/bin/env tsx

/**
 * Direct Email Test
 * Tests the Resend email integration directly
 */

import { sendTestAlertEmail } from './server/services/alertNotificationService';

async function testEmail() {
  console.log('Testing Resend email integration...\n');
  
  const testEmail = 'seyi.kusa@highcityconsulting.com';
  console.log(`Sending test email to: ${testEmail}`);
  
  try {
    const result = await sendTestAlertEmail(testEmail);
    
    if (result.success) {
      console.log('✓ Email sent successfully!');
      console.log('Check your inbox for the test rate alert email.');
    } else {
      console.log('✗ Email failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testEmail();