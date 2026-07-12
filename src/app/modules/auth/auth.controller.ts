/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

// POST /api/auth/register → { user, token }
const registerController = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result,
    });
  } catch (error: any) {
    // duplicate-email race: unique-index E11000 আসতে পারে pre-check এড়িয়ে → clean 409
    const isDup = error?.code === 11000;
    const status = error.status || (isDup ? 409 : 500);
    const message = isDup ? 'An account with this email already exists.' : error.message;
    res.status(status).json({ success: false, message });
  }
};

// POST /api/auth/login → { user, token }
const loginController = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.loginUser(req.body);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/me → current user (session hydration)
const getMeController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const user = await AuthService.getMe(userId);
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/logout — JWT stateless, client just drops the token
const logoutController = async (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const AuthController = {
  registerController,
  loginController,
  getMeController,
  logoutController,
};
