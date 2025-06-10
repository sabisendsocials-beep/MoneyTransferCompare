/**
 * Rate Alert API Routes
 * Handles rate alert creation, management, and status endpoints
 */

import express from 'express';
import { z } from 'zod';
import { 
  createRateAlert, 
  validateAlert, 
  getCurrentRates, 
  getUserAlerts, 
  cancelAlert 
} from '../services/rateAlertService';
import { 
  triggerRateAlertCheck, 
  getRateAlertSchedulerStatus 
} from '../scheduler/rateAlertScheduler';
import { sendTestAlertEmail } from '../services/alertNotificationService';

const router = express.Router();

// Validation schemas
const createAlertSchema = z.object({
  email: z.string().email('Valid email address required'),
  fromCurrency: z.string().min(3).max(3).toUpperCase(),
  toCurrency: z.string().min(3).max(3).toUpperCase(),
  alertBasis: z.enum(['official', 'best_provider']),
  triggerType: z.enum(['absolute', 'percentage']),
  targetValue: z.number().positive('Target value must be positive'),
});

const getCurrentRatesSchema = z.object({
  fromCurrency: z.string().min(3).max(3).toUpperCase(),
  toCurrency: z.string().min(3).max(3).toUpperCase(),
});

const getUserAlertsSchema = z.object({
  email: z.string().email('Valid email address required'),
});

// Create a new rate alert
router.post('/rate-alerts', async (req, res) => {
  try {
    const validatedData = createAlertSchema.parse(req.body);
    
    console.log(`Creating rate alert for ${validatedData.email}: ${validatedData.fromCurrency}/${validatedData.toCurrency}`);
    
    const result = await createRateAlert({
      email: validatedData.email,
      fromCurrency: validatedData.fromCurrency,
      toCurrency: validatedData.toCurrency,
      alertBasis: validatedData.alertBasis,
      triggerType: validatedData.triggerType,
      targetValue: validatedData.targetValue,
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Rate alert created successfully',
        alertId: result.alertId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors,
      });
    } else {
      console.error('Error creating rate alert:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
});

// Get current rates for a currency pair (for form hints)
router.get('/rate-alerts/current-rates', async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = getCurrentRatesSchema.parse(req.query);
    
    const currentRates = await getCurrentRates(fromCurrency, toCurrency);
    
    res.json({
      success: true,
      data: {
        fromCurrency,
        toCurrency,
        officialRate: currentRates.officialRate,
        bestProviderRate: currentRates.bestProviderRate,
        bestProviderName: currentRates.bestProviderName,
      },
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid currency parameters',
        details: error.errors,
      });
    } else {
      console.error('Error getting current rates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch current rates',
      });
    }
  }
});

// Validate alert parameters (for real-time form validation)
router.post('/rate-alerts/validate', async (req, res) => {
  try {
    const { fromCurrency, toCurrency, alertBasis, triggerType, targetValue } = createAlertSchema
      .pick({ fromCurrency: true, toCurrency: true, alertBasis: true, triggerType: true, targetValue: true })
      .parse(req.body);
    
    const validation = await validateAlert(
      fromCurrency,
      toCurrency,
      alertBasis,
      triggerType,
      targetValue
    );
    
    res.json({
      success: true,
      isValid: validation.isValid,
      error: validation.error,
      currentRates: validation.currentRates,
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid validation parameters',
        details: error.errors,
      });
    } else {
      console.error('Error validating alert:', error);
      res.status(500).json({
        success: false,
        error: 'Validation failed',
      });
    }
  }
});

// Get user's alerts
router.get('/rate-alerts/user/:email', async (req, res) => {
  try {
    const { email } = getUserAlertsSchema.parse({ email: req.params.email });
    
    const alerts = await getUserAlerts(email);
    
    res.json({
      success: true,
      data: alerts,
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid email address',
        details: error.errors,
      });
    } else {
      console.error('Error getting user alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user alerts',
      });
    }
  }
});

// Manual alert check endpoint for testing
router.get('/rate-alerts/check', async (req, res) => {
  try {
    const { checkRateAlerts } = await import('../scheduler/rateAlertScheduler');
    
    console.log('Manual rate alert check triggered');
    const result = await checkRateAlerts();
    
    res.json({
      success: true,
      message: 'Rate alert check completed',
      alertsChecked: result.alertsChecked,
      alertsTriggered: result.alertsTriggered,
      notifications: result.notifications,
    });
    
  } catch (error) {
    console.error('Error running manual alert check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check rate alerts',
    });
  }
});

// Cancel an alert
router.delete('/rate-alerts/:id', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    
    if (isNaN(alertId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert ID',
      });
    }
    
    const result = await cancelAlert(alertId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Alert cancelled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
    
  } catch (error) {
    console.error('Error cancelling alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel alert',
    });
  }
});

// Admin: Get scheduler status
router.get('/admin/rate-alerts/scheduler-status', async (req, res) => {
  try {
    const status = getRateAlertSchedulerStatus();
    
    res.json({
      success: true,
      data: status,
    });
    
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status',
    });
  }
});

// Admin: Manually trigger alert check
router.post('/admin/rate-alerts/trigger-check', async (req, res) => {
  try {
    console.log('Admin request: Manual rate alert check trigger');
    
    const result = await triggerRateAlertCheck();
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        pendingCount: result.pendingCount,
        triggeredCount: result.triggeredCount,
        errorCount: result.errorCount,
      },
    });
    
  } catch (error) {
    console.error('Error triggering alert check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger alert check',
    });
  }
});

// Admin: Send test alert email
router.post('/admin/rate-alerts/test-email', async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    
    console.log(`Admin request: Sending test alert email to ${email}`);
    
    const result = await sendTestAlertEmail(email);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test alert email sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Valid email address required',
        details: error.errors,
      });
    } else {
      console.error('Error sending test email:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test email',
      });
    }
  }
});

export default router;