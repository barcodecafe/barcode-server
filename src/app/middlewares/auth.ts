/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

// JWT Authentication middleware — verifies the Bearer token and attaches req.user
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized access' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.access_secret);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Optional auth — attaches req.user when a valid Bearer token is present but
// never blocks the request. Lets a public endpoint quietly tailor its response
// for a logged-in admin (e.g. include hidden records) without gating the route.
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      (req as any).user = jwt.verify(authHeader.split(' ')[1], config.jwt.access_secret);
    } catch {
      // ignore an invalid/expired token on a public route
    }
  }
  next();
};

import { User } from '../modules/user/user.model';

export const SUPER_ADMIN_ROLES = ['super_admin', 'superadmin'];
export const ADMIN_ROLES = ['admin', 'super_admin', 'superadmin', 'manager', 'restaurant_manager'];

export const isSuperAdminRole = (role?: string): boolean =>
  SUPER_ADMIN_ROLES.includes(String(role || '').toLowerCase());

export const isAdminRole = (role?: string): boolean =>
  ADMIN_ROLES.includes(String(role || '').toLowerCase());

// Role-based Authorization middleware
// Usage: authorize('admin') → only listed roles or admin roles can pass
export const authorize = (...allowedRoles: string[]) => {
  const allowed = allowedRoles.map((r) => r.toLowerCase());
  const adminAllowed = allowed.some((r) => ADMIN_ROLES.includes(r));

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.role) {
      return res.status(403).json({ success: false, message: 'Access denied: No role found' });
    }

    const role = String(user.role).toLowerCase();

    if (allowed.includes(role) || (adminAllowed && isAdminRole(role))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: '${user.role}' role is not authorized for this action`,
    });
  };
};

// Fine-grained Permission Authorization middleware
// Usage: checkPermission('orders')
export const checkPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authUser = (req as any).user;

    if (!authUser || !authUser.role) {
      return res.status(403).json({ success: false, message: 'Access denied: No authenticated user' });
    }

    const role = String(authUser.role).toLowerCase();

    // 👑 Super Admin automatically has full permissions
    if (isSuperAdminRole(role)) {
      return next();
    }

    if (!isAdminRole(role)) {
      return res.status(403).json({ success: false, message: 'Access denied: Insufficient privileges' });
    }

    // Check permissions array from token or database
    let userPermissions: string[] = Array.isArray(authUser.permissions) ? authUser.permissions : [];
    if (!authUser.permissions && authUser._id) {
      const dbUser = await User.findById(authUser._id).select('permissions role');
      if (dbUser) {
        userPermissions = Array.isArray(dbUser.permissions) ? dbUser.permissions : [];
      }
    }

    if (userPermissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: Missing '${requiredPermission}' module permission`,
    });
  };
};
