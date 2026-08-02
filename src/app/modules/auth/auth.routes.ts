import express from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../middlewares/validateRequest';
import { authMiddleware } from '../../middlewares/auth';
import { registerValidationSchema, loginValidationSchema } from './auth.validation';

const router = express.Router();

// POST /api/auth/register
router.post('/register', validateRequest(registerValidationSchema), AuthController.registerController);

// POST /api/auth/login
router.post('/login', validateRequest(loginValidationSchema), AuthController.loginController);

// 🔑 POST /api/auth/reset-password (All User/Rider/Admin Roles)
router.post('/reset-password', AuthController.resetPasswordController);

// GET /api/auth/me  (session check on app load)
router.get('/me', authMiddleware, AuthController.getMeController);

// POST /api/auth/logout
router.post('/logout', authMiddleware, AuthController.logoutController);

export const AuthRoutes = router;