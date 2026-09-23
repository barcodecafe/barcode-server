"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("./user.controller");
const auth_1 = require("../../middlewares/auth");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
// নিজের প্রোফাইল আপডেট (যেকোনো লগইন করা ইউজার) — PATCH /api/users/me
// ⚠️ /:id এর আগে থাকতে হবে (route ordering)
router.patch('/me', auth_1.authMiddleware, user_controller_1.UserController.updateMeController);
// 🎯 POS Scanner / Customer Search Lookup (Admin / Staff / POS) — GET /api/users/pos-lookup/:query
// ⚠️ /:id এর আগে থাকতে হবে (route ordering)
router.get('/pos-lookup/:query', ...adminOnly, user_controller_1.UserController.posLookupController);
router.get('/pos-lookup', ...adminOnly, user_controller_1.UserController.posLookupController);
// 🎯 Public Customer Membership Verification (For QR scan / web verification)
// ⚠️ /:id এর আগে থাকতে হবে (route ordering)
router.get('/public-membership/:query', user_controller_1.UserController.getPublicMembershipController);
router.get('/public-membership', user_controller_1.UserController.getPublicMembershipController);
router.get('/membership-verify/:query', user_controller_1.UserController.getPublicMembershipController);
// 👑 Staff & Role Management Routes (Super Admin / Admin)
// ⚠️ /:id এর আগে থাকতে হবে (route ordering)
router.get('/staff', ...adminOnly, user_controller_1.UserController.getStaffUsersController);
router.post('/staff', ...adminOnly, user_controller_1.UserController.createStaffUserController);
router.patch('/staff/:id', ...adminOnly, user_controller_1.UserController.updateStaffUserController);
router.delete('/staff/:id', ...adminOnly, user_controller_1.UserController.deleteStaffUserController);
// 🧹 Super Admin: Purge all non-admin users (Customers, Riders, Managers) — DELETE /api/users/cleanup-non-admin
router.delete('/cleanup-non-admin', auth_1.authMiddleware, (0, auth_1.authorize)('super_admin', 'superadmin'), user_controller_1.UserController.cleanupNonAdminUsersController);
// সব ইউজার (Admin only) — GET /api/users
router.get('/', ...adminOnly, user_controller_1.UserController.getAllUsersController);
// একজন ইউজার (Admin only) — GET /api/users/:id
router.get('/:id', ...adminOnly, user_controller_1.UserController.getUserByIdController);
// একজন ইউজার আপডেট (Admin only) — PATCH /api/users/:id
router.patch('/:id', ...adminOnly, user_controller_1.UserController.adminUpdateUserController);
// একজন ইউজার পার্মানেন্ট ডিলিট (Admin only) — DELETE /api/users/:id
router.delete('/:id', ...adminOnly, user_controller_1.UserController.adminDeleteUserController);
exports.UserRoutes = router;
