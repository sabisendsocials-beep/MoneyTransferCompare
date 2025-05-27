/**
 * Provider Management API
 * Handles CRUD operations for provider management
 */
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { providers, InsertProvider } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all providers
router.get('/api/provider', async (_req: Request, res: Response) => {
  try {
    const allProviders = await db.select().from(providers);
    res.json(allProviders);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch providers',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get provider by ID
router.get('/api/provider/:id', async (req: Request, res: Response) => {
  try {
    const providerId = parseInt(req.params.id);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ success: false, message: 'Invalid provider ID' });
    }
    
    const [provider] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId));
    
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    res.json(provider);
  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch provider',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Create provider - Admin only operation
router.post('/api/provider', async (req: Request, res: Response) => {
  try {
    // Verify that the request is coming from the admin panel
    const adminToken = req.headers['x-admin-token'];
    const isAdminPanel = req.headers['x-admin-source'] === 'provider-management-panel';
    
    if (!adminToken || !isAdminPanel) {
      console.error('Unauthorized attempt to create provider outside admin panel');
      return res.status(403).json({
        success: false,
        message: 'Provider creation is restricted to the admin panel only'
      });
    }
    
    const providerData = req.body as InsertProvider;
    
    // Validate required fields
    if (!providerData.name) {
      return res.status(400).json({ success: false, message: 'Provider name is required' });
    }
    
    // Insert the provider
    const [createdProvider] = await db
      .insert(providers)
      .values(providerData)
      .returning();
    
    console.log(`Provider "${providerData.name}" created via admin panel`);
    
    res.status(201).json({ 
      success: true, 
      message: 'Provider created successfully',
      provider: createdProvider
    });
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create provider',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update provider - Admin only operation
router.patch('/api/provider/:id', async (req: Request, res: Response) => {
  try {
    // Verify that the request is coming from the admin panel
    const adminToken = req.headers['x-admin-token'];
    const isAdminPanel = req.headers['x-admin-source'] === 'provider-management-panel';
    
    if (!adminToken || !isAdminPanel) {
      console.error('Unauthorized attempt to update provider outside admin panel');
      return res.status(403).json({
        success: false,
        message: 'Provider updates are restricted to the admin panel only'
      });
    }
    
    const providerId = parseInt(req.params.id);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ success: false, message: 'Invalid provider ID' });
    }
    
    const providerData = req.body;
    
    // Check if provider exists
    const [existingProvider] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId));
    
    if (!existingProvider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    // DISABLED: Wise enforcement removed - admin panel has full control
    console.log('✓ Wise enforcement disabled - admin panel has full control');
    
    // Update the provider
    const [updatedProvider] = await db
      .update(providers)
      .set(providerData)
      .where(eq(providers.id, providerId))
      .returning();
    
    console.log(`Provider "${existingProvider.name}" (ID: ${providerId}) updated via admin panel`);
    
    res.json({ 
      success: true, 
      message: 'Provider updated successfully',
      provider: updatedProvider
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update provider',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Delete provider - Admin only operation
router.delete('/api/provider/:id', async (req: Request, res: Response) => {
  try {
    // Verify that the request is coming from the admin panel
    const adminToken = req.headers['x-admin-token'];
    const isAdminPanel = req.headers['x-admin-source'] === 'provider-management-panel';
    
    if (!adminToken || !isAdminPanel) {
      console.error('Unauthorized attempt to delete provider outside admin panel');
      return res.status(403).json({
        success: false,
        message: 'Provider deletion is restricted to the admin panel only'
      });
    }
    
    const providerId = parseInt(req.params.id);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ success: false, message: 'Invalid provider ID' });
    }
    
    // Check if provider exists
    const [existingProvider] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId));
    
    if (!existingProvider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    console.log(`Provider "${existingProvider.name}" (ID: ${providerId}) deleted via admin panel`);
    
    // Delete the provider
    await db
      .delete(providers)
      .where(eq(providers.id, providerId));
    
    res.json({ success: true, message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete provider',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Initialize providers endpoint - ADMIN-ONLY
router.post('/api/init-providers', async (req: Request, res: Response) => {
  try {
    const { reset = false } = req.body;
    
    // Only allow initialization from the admin panel - add a specific token/header
    // that is only generated in the frontend admin component
    const adminToken = req.headers['x-admin-token'];
    const isAdminPanel = req.headers['x-admin-source'] === 'provider-management-panel';
    
    if (!adminToken || !isAdminPanel) {
      console.error('Unauthorized attempt to initialize providers outside admin panel');
      return res.status(403).json({
        success: false,
        message: 'Provider initialization is restricted to the admin panel only'
      });
    }
    
    // Import the initialization script
    const { default: initializeProviders } = await import('../initialize-providers');
    const result = await initializeProviders(reset);
    
    console.log(`Provider initialization completed via admin panel. Reset: ${reset}`);
    
    res.json({
      success: true,
      message: reset 
        ? `Reset complete. Added standard providers.` 
        : `Added missing providers.`,
      result
    });
  } catch (error) {
    console.error('Error initializing providers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize providers',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;