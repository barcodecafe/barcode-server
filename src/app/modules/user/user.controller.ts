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

// PATCH /api/users/me — update own profile (name, phone, pickArea, address)
const updateMeController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const user = await UserService.updateMeService(userId, req.body);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'Profile updated', data: user });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const UserController = {
  getAllUsersController,
  getUserByIdController,
  updateMeController,
};
