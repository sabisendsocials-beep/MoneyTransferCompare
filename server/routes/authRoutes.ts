import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { setupAuth, isAuthenticated, optionalAuth } from '../replitAuth';
import { insertUserPreferencesSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// User profile and preferences routes
router.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get user preferences
    const preferences = await storage.getUserPreferences(userId);
    
    res.json({
      success: true,
      data: {
        ...user,
        preferences: preferences || {
          preferredCurrencyPairs: [],
          preferredProviders: []
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

// Update user preferences
const updatePreferencesSchema = z.object({
  preferredCurrencyPairs: z.array(z.string()).max(3, "Maximum 3 currency pairs allowed"),
  preferredProviders: z.array(z.string()).max(3, "Maximum 3 providers allowed")
});

router.put('/api/auth/preferences', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validation = updatePreferencesSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid preferences data',
        details: validation.error.issues
      });
    }

    const preferences = await storage.updateUserPreferences(userId, validation.data);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ success: false, error: "Failed to update preferences" });
  }
});

// Get user's rate alerts
router.get('/api/auth/rate-alerts', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const alerts = await storage.getUserRateAlerts(userId);
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error("Error fetching user rate alerts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch rate alerts" });
  }
});

// Cancel a rate alert
router.delete('/api/auth/rate-alerts/:alertId', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const alertId = parseInt(req.params.alertId);
    
    if (isNaN(alertId)) {
      return res.status(400).json({ success: false, error: 'Invalid alert ID' });
    }

    const success = await storage.deleteRateAlert(alertId, userId);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Alert not found or access denied' });
    }
    
    res.json({
      success: true,
      message: 'Rate alert cancelled successfully'
    });
  } catch (error) {
    console.error("Error deleting rate alert:", error);
    res.status(500).json({ success: false, error: "Failed to cancel rate alert" });
  }
});

// Check authentication status (for frontend)
router.get('/api/auth/status', optionalAuth, async (req: any, res) => {
  try {
    const isLoggedIn = req.isAuthenticated() && req.user?.claims?.sub;
    
    if (isLoggedIn) {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      res.json({
        success: true,
        isAuthenticated: true,
        user: user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl
        } : null
      });
    } else {
      res.json({
        success: true,
        isAuthenticated: false,
        user: null
      });
    }
  } catch (error) {
    console.error("Error checking auth status:", error);
    res.json({
      success: true,
      isAuthenticated: false,
      user: null
    });
  }
});

export default router;