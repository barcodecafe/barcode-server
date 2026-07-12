import { isValidObjectId } from 'mongoose';
import { User } from './user.model';

// সব ইউজার তালিকা (Admin) — BACKEND: GET /api/users
const getAllUsersService = async () => {
  const users = await User.find({ isDeleted: false }).sort({ createdAt: -1 });
  return users;
};

// একজন ইউজার (id দিয়ে)
const getUserByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  const user = await User.findOne({ _id: id, isDeleted: false });
  return user;
};

// self profile update — only these fields; never role/email/password here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateMeService = async (userId: string, payload: any) => {
  if (!isValidObjectId(userId)) return null;
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) return null;
  if (payload.name !== undefined && String(payload.name).trim()) user.name = String(payload.name).trim();
  if (payload.phone !== undefined) user.phone = String(payload.phone).trim();
  if (payload.pickArea !== undefined) user.pickArea = String(payload.pickArea).trim();
  if (payload.address !== undefined) user.address = String(payload.address).trim();
  await user.save();
  return user;
};

export const UserService = {
  getAllUsersService,
  getUserByIdService,
  updateMeService,
};
