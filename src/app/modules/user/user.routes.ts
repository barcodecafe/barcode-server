import express from 'express';
import { UserController } from './user.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';

const router = express.Router();

const adminOnly = [authMiddleware, authorize('admin')];

// সব ইউজার (Admin only) — GET /api/users
router.get('/', ...adminOnly, UserController.getAllUsersController);

// একজন ইউজার (Admin only) — GET /api/users/:id
router.get('/:id', ...adminOnly, UserController.getUserByIdController);

export const UserRoutes = router;
