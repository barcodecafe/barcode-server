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
    const isDup = error?.code === 11000;
    const status = error.status || (isDup ? 409 : 500);

    let dupMessage = 'An account with this phone number already exists.';
    if (error?.keyPattern?.email || error?.message?.includes('email')) {
      dupMessage = 'An account with this email already exists.';
    } else if (error?.keyPattern?.phone || error?.message?.includes('phone')) {
      dupMessage = 'An account with this phone number already exists.';
    }

    const message = isDup ? dupMessage : error.message;
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

// 📧 1. POST /api/auth/forgot-password/request-otp → Send OTP to linked email
const requestOtpController = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.requestEmailOtp(req.body.phone);
    res.status(200).json({
      success: true,
      message: 'OTP sent to your registered email address.',
      data: result,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 🔑 2. POST /api/auth/forgot-password/reset → Verify OTP & Reset Password
const resetPasswordOtpController = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.resetPasswordWithOtp(req.body);
    res.status(200).json({
      success: true,
      message: result.message || 'Password reset successful',
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

// POST /api/auth/logout — JWT stateless
const logoutController = async (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const AuthController = {
  registerController,
  loginController,
  requestOtpController,
  resetPasswordOtpController,
  getMeController,
  logoutController,
};