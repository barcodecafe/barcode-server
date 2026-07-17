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

// Role-based Authorization middleware
// Usage: authorize('admin')  → only listed roles can pass
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.role) {
      return res.status(403).json({ success: false, message: 'Access denied: No role found' });
    }

    if (allowedRoles.includes(user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: '${user.role}' role is not authorized for this action`,
    });
  };
};
