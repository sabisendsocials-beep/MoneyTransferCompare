/**
 * Admin Authentication Middleware
 * 
 * This middleware adds protection to admin-only operations
 * ensuring only authorized requests can modify sensitive data.
 */

import { NextFunction, Request, Response } from 'express';

// Track admin authentication status
let adminAuthenticated = false;

/**
 * Middleware to verify admin credentials
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check admin headers
  const adminToken = req.headers['x-admin-token'];
  const adminSource = req.headers['x-admin-source'];
  
  // Validate admin credentials
  adminAuthenticated = !!(adminToken && adminSource === 'provider-management-panel');
  
  if (adminAuthenticated) {
    console.log('✅ Admin authentication successful');
    // Set a flag on the request object for other middleware to use
    (req as any).isAdmin = true;
  } else if (
    req.path.includes('/api/providers') && 
    (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')
  ) {
    // Block write operations to provider endpoints without admin auth
    console.log('❌ Blocking unauthorized provider modification');
    return res.status(403).json({
      success: false,
      message: 'Provider modifications require admin authentication'
    });
  }
  
  // Continue processing the request
  next();
  
  // Reset admin status after the request completes
  res.on('finish', () => {
    adminAuthenticated = false;
    (req as any).isAdmin = false;
  });
}

/**
 * Check if the current request is admin authenticated
 */
export function isAdminAuthenticated(): boolean {
  return adminAuthenticated;
}