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

// 👑 Staff & Role Management Routes (Super Admin / Admin)
// ⚠️ /:id এর আগে থাকতে হবে (route ordering)
router.get('/staff', ...adminOnly, UserController.getStaffUsersController);
router.post('/staff', ...adminOnly, UserController.createStaffUserController);
router.patch('/staff/:id', ...adminOnly, UserController.updateStaffUserController);
router.delete('/staff/:id', ...adminOnly, UserController.deleteStaffUserController);

// 🧹 Super Admin: Purge all non-admin users (Customers, Riders, Managers) — DELETE /api/users/cleanup-non-admin
router.delete('/cleanup-non-admin', authMiddleware, authorize('super_admin', 'superadmin'), UserController.cleanupNonAdminUsersController);

// সব ইউজার (Admin only) — GET /api/users
router.get('/', ...adminOnly, UserController.getAllUsersController);

// একজন ইউজার (Admin only) — GET /api/users/:id
router.get('/:id', ...adminOnly, UserController.getUserByIdController);

// একজন ইউজার আপডেট (Admin only) — PATCH /api/users/:id
router.patch('/:id', ...adminOnly, UserController.adminUpdateUserController);

// একজন ইউজার পার্মানেন্ট ডিলিট (Admin only) — DELETE /api/users/:id
router.delete('/:id', ...adminOnly, UserController.adminDeleteUserController);

export const UserRoutes = router;
