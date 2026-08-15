/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { UserService } from './user.service';

// GET All Users (Admin)
const getAllUsersController = async (req: Request, res: Response) => {
  try {
    const users = await UserService.getAllUsersService();
    res.status(200).json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET Single User by id
const getUserByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await UserService.getUserByIdService(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🎯 POS Scanner / Customer Search Lookup (Admin / Staff / POS)
const posLookupController = async (req: Request, res: Response) => {
  try {
    const query = req.params.query || (req.query.q as string) || '';
    const result = await UserService.posLookupService(query);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🎯 Public Customer Membership Verification (For mobile QR scanner / web verification)
const getPublicMembershipController = async (req: Request, res: Response) => {
  try {
    const query = req.params.query || (req.query.q as string) || '';
    const result = await UserService.getPublicMembershipService(query);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Membership not found or invalid ID' });
    }
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/users/me — update own profile (name, phone, pickArea, address)
// PATCH /api/users/me — update own profile
const updateMeController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    const user = await UserService.updateMeService(userId, req.body);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.status(200).json({ success: true, message: 'Profile updated', data: user });
  } catch (error: any) {
    // 🎯 ফোন নম্বর বা ইমেল ডুপ্লিকেট চেকিং (প্রোফাইল আপডেটের সময়)
    const isDup = error?.code === 11000;
    const status = error.status || (isDup ? 409 : 500);
    const message = isDup
      ? 'An account with this phone number or email already exists.'
      : error.message;

    res.status(status).json({ success: false, message });
  }
};

export const UserController = {
  getAllUsersController,
  getUserByIdController,
  posLookupController,
  getPublicMembershipController,
  updateMeController,
};
