import express from 'express';
import { UserController } from './user.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';

const router = express.Router();

const adminOnly = [authMiddleware, authorize('admin')];

// নিজের প্রোফাইল আপডেট (যেকোনো লগইন করা ইউজার) — PATCH /api/users/me
// ⚠️ /:id এর আগে থাকতে হবে (route ordering)
router.patch('/me', authMiddleware, UserController.updateMeController);

// 🎯 POS Scanner / Customer Search Lookup (Admin / Staff / POS) — GET /api/users/pos-lookup/:query
// ⚠️ /:id এর আগে থাকতে হবে (route ordering)
router.get('/pos-lookup/:query', ...adminOnly, UserController.posLookupController);
router.get('/pos-lookup', ...adminOnly, UserController.posLookupController);

// 🎯 Public Customer Membership Verification (For QR scan / web verification)
// ⚠️ /:id এর আগে থাকতে হবে (route ordering)
router.get('/public-membership/:query', UserController.getPublicMembershipController);
router.get('/public-membership', UserController.getPublicMembershipController);
router.get('/membership-verify/:query', UserController.getPublicMembershipController);

// সব ইউজার (Admin only) — GET /api/users
router.get('/', ...adminOnly, UserController.getAllUsersController);

// একজন ইউজার (Admin only) — GET /api/users/:id
router.get('/:id', ...adminOnly, UserController.getUserByIdController);

export const UserRoutes = router;
