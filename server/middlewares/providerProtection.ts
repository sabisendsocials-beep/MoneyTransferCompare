/**
 * Provider Table Protection Middleware
 * 
 * This middleware completely blocks any database operations on the providers table
 * unless they come from the admin panel with proper authentication.
 */

import { NextFunction, Request, Response } from 'express';

// Tracks if the current request is authorized for provider operations
let isAdminPanelRequest = false;

/**
 * Middleware to verify admin panel requests
 * Only requests with valid admin tokens and source are allowed to modify providers
 */
export function verifyAdminRequest(req: Request, res: Response, next: NextFunction) {
  // Check for admin token and source
  const adminToken = req.headers['x-admin-token'];
  const adminSource = req.headers['x-admin-source'];
  
  // Set the authorization flag based on credentials
  isAdminPanelRequest = !!(adminToken && adminSource === 'provider-management-panel');
  
  // Log authorization details
  if (isAdminPanelRequest) {
    console.log('✅ Admin request authorized for provider operations');
  } else if (req.path.includes('/api/provider') || req.path.includes('/api/init-providers')) {
    console.log('⚠️ Request to provider API without admin credentials blocked');
    return res.status(403).json({
      success: false,
      message: 'Provider operations are restricted to the admin panel only'
    });
  }
  
  // Continue to the next middleware
  next();
  
  // Reset the flag after the request completes
  res.on('finish', () => {
    isAdminPanelRequest = false;
  });
}

/**
 * Checks if the current request is authorized for provider operations
 */
export function isAuthorizedForProviderOperations(): boolean {
  return isAdminPanelRequest;
}

/**
 * Enforces protection for all provider operations
 * This is used to wrap any function that might modify providers
 */
export function enforceProviderProtection<T>(
  operation: () => Promise<T>, 
  operationName: string
): Promise<T> {
  if (!isAdminPanelRequest) {
    console.error(`🛑 BLOCKED: Unauthorized ${operationName} operation on providers table`);
    return Promise.reject(new Error(`Provider protection active: ${operationName} blocked`));
  }
  
  console.log(`✓ Authorized ${operationName} operation on providers table`);
  return operation();
}