/**
 * Alert Notification Service
 * Handles email notifications for triggered rate alerts
 */

import type { RateAlert } from '../../shared/schema';

export interface AlertNotificationData {
  alert: RateAlert;
  currentRate: number;
  targetRate: number;
  providerName?: string;
}

/**
 * Format currency display with symbol
 */
function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    GBP: '£',
    EUR: '€',
    USD: '$',
    NGN: '₦',
    GHS: '₵',
    KES: 'KSh',
    INR: '₹',
    PKR: 'Rs',
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

/**
 * Generate email subject for rate alert
 */
function generateEmailSubject(alert: RateAlert): string {
  return `Your SabiSend Rate Alert Was Triggered - ${alert.from_currency}/${alert.to_currency}`;
}

/**
 * Generate email HTML content for rate alert
 */
function generateEmailContent(data: AlertNotificationData): string {
  const { alert, currentRate, targetRate, providerName } = data;
  
  const currencyPair = `${alert.from_currency} → ${alert.to_currency}`;
  const formattedCurrentRate = formatCurrency(currentRate, alert.to_currency);
  const formattedTargetRate = formatCurrency(targetRate, alert.to_currency);
  const formattedCreationRate = formatCurrency(alert.current_rate_at_creation, alert.to_currency);
  
  const rateChange = ((currentRate - alert.current_rate_at_creation) / alert.current_rate_at_creation) * 100;
  const changeText = rateChange > 0 ? `+${rateChange.toFixed(2)}%` : `${rateChange.toFixed(2)}%`;
  
  const basisText = alert.alert_basis === 'official' ? 'Official Rate' : 'Best Provider Rate';
  const providerText = providerName ? ` (${providerName})` : '';
  
  const triggerTypeText = alert.trigger_type === 'absolute' 
    ? `absolute target of ${formattedTargetRate}`
    : `${alert.target_value}% increase target`;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rate Alert Triggered</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .alert-details { background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .rate-box { background: white; border: 2px solid #28a745; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .rate-box .current-rate { font-size: 28px; font-weight: bold; color: #28a745; margin-bottom: 10px; }
        .rate-box .rate-change { font-size: 16px; color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .info-item { background: #f8f9fa; padding: 15px; border-radius: 4px; }
        .info-item .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .info-item .value { font-size: 16px; color: #333; }
        .cta-button { background: #007bff; color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        @media (max-width: 600px) {
            .info-grid { grid-template-columns: 1fr; }
            body { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Rate Alert Triggered!</h1>
        <p>Your target rate for ${currencyPair} has been reached</p>
    </div>
    
    <div class="alert-details">
        <h2>Alert Summary</h2>
        <p>Congratulations! The ${basisText} for <strong>${currencyPair}</strong> has reached your ${triggerTypeText}${providerText}.</p>
    </div>
    
    <div class="rate-box">
        <div class="current-rate">${formattedCurrentRate}</div>
        <div class="rate-change">Change since alert creation: ${changeText}</div>
    </div>
    
    <div class="info-grid">
        <div class="info-item">
            <div class="label">Currency Pair</div>
            <div class="value">${currencyPair}</div>
        </div>
        <div class="info-item">
            <div class="label">Rate Source</div>
            <div class="value">${basisText}${providerText}</div>
        </div>
        <div class="info-item">
            <div class="label">Target Rate</div>
            <div class="value">${formattedTargetRate}</div>
        </div>
        <div class="info-item">
            <div class="label">Rate at Creation</div>
            <div class="value">${formattedCreationRate}</div>
        </div>
        <div class="info-item">
            <div class="label">Trigger Type</div>
            <div class="value">${alert.trigger_type === 'absolute' ? 'Absolute Value' : `${alert.target_value}% Increase`}</div>
        </div>
        <div class="info-item">
            <div class="label">Alert Created</div>
            <div class="value">${new Date(alert.created_at).toLocaleDateString()}</div>
        </div>
    </div>
    
    <div style="text-align: center;">
        <a href="https://sabisend.com/compare?from=${alert.from_currency}&to=${alert.to_currency}" class="cta-button">
            View Live Comparison
        </a>
    </div>
    
    <div class="footer">
        <p><strong>What's next?</strong></p>
        <ul>
            <li>Check current provider rates and fees on SabiSend</li>
            <li>Compare transfer options to get the best deal</li>
            <li>This is a one-time alert - create a new one if you need continued monitoring</li>
        </ul>
        
        <p style="margin-top: 30px;">
            This alert was triggered at ${new Date().toLocaleString()} UTC.<br>
            You're receiving this because you created a rate alert on SabiSend.
        </p>
        
        <p style="color: #999; font-size: 12px;">
            SabiSend - Smart Money Transfers<br>
            Compare rates, save money, transfer with confidence
        </p>
    </div>
</body>
</html>`;
}

/**
 * Send rate alert email notification
 */
export async function sendRateAlertEmail(data: AlertNotificationData): Promise<{
  success: boolean;
  error?: string;
}> {
  const { alert } = data;
  
  try {
    // Check if Resend is configured
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured for rate alert emails');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    // Import Resend
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);

    const subject = generateEmailSubject(alert);
    const htmlContent = generateEmailContent(data);
    
    // Generate plain text version
    const textContent = `
Your SabiSend Rate Alert Was Triggered!

Currency Pair: ${alert.from_currency} → ${alert.to_currency}
Current Rate: ${formatCurrency(data.currentRate, alert.to_currency)}
Target Rate: ${formatCurrency(data.targetRate, alert.to_currency)}
Rate Source: ${alert.alert_basis === 'official' ? 'Official Rate' : 'Best Provider Rate'}${data.providerName ? ` (${data.providerName})` : ''}

The rate has reached your ${alert.trigger_type === 'absolute' ? 'absolute target' : `${alert.target_value}% increase target`}.

View live comparison: https://sabisend.com/compare?from=${alert.from_currency}&to=${alert.to_currency}

This is a one-time alert. Create a new one if you need continued monitoring.

SabiSend - Smart Money Transfers
`;

    const { data: emailData, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [alert.email],
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      throw error;
    }
    
    console.log(`Rate alert email sent to ${alert.email} for ${alert.from_currency}/${alert.to_currency} (ID: ${emailData?.id})`);
    
    return { success: true };

  } catch (error) {
    console.error(`Failed to send rate alert email to ${alert.email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send test alert email (for testing purposes)
 */
export async function sendTestAlertEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const testData: AlertNotificationData = {
    alert: {
      id: 999,
      email,
      from_currency: 'GBP',
      to_currency: 'NGN',
      alert_basis: 'official',
      trigger_type: 'percentage',
      target_value: 3,
      current_rate_at_creation: 2100,
      alert_status: 'triggered',
      triggered_at: new Date(),
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    },
    currentRate: 2163,
    targetRate: 2163,
  };

  return await sendRateAlertEmail(testData);
}