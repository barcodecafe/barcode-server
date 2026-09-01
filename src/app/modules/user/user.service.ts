/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import { User } from './user.model';
import { Order } from '../order/order.model';
import {
  ensureMembership,
  getTierFromSpend,
  cleanPhoneForMembership,
} from '../../utils/membership';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Extracts clean membership ID or raw query from full URL or scanned payload
 * e.g. "https://example.com/membership/BRG-1712345678" -> "BRG-1712345678"
 */
const extractCleanQuery = (rawQuery: string): string => {
  if (!rawQuery) return '';
  let clean = rawQuery.trim();
  const urlMatch = clean.match(/\/membership\/([^/?#]+)/i);
  if (urlMatch && urlMatch[1]) {
    clean = decodeURIComponent(urlMatch[1]).trim();
  }
  return clean;
};

// সব ইউজার তালিকা (Admin) — BACKEND: GET /api/users
const getAllUsersService = async () => {
  const users = await User.find({ isDeleted: false }).sort({ createdAt: -1 });

  // Refresh all user membership IDs & ensure QR codes have the latest live URL
  await Promise.all(
    users
      .filter((u) => u.role === 'user')
      .map((u) => ensureMembership(u))
  );

  return users;
};

// একজন ইউজার (id দিয়ে)
const getUserByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  const user = await User.findOne({ _id: id, isDeleted: false });
  return user;
};

// 🎯 POS Scanner / Customer Search Service (Scans QR / Membership ID / Phone / Email)
const posLookupService = async (rawQuery: string) => {
  if (!rawQuery) return null;
  const clean = extractCleanQuery(rawQuery);
  if (!clean) return null;

  const cleanPhone = cleanPhoneForMembership(clean);
  const possibleMembershipId = clean.toUpperCase().startsWith('BRG-') ? clean.toUpperCase() : `BRG-${cleanPhone}`;

  const queryConditions: any[] = [
    { membershipId: clean },
    { membershipId: clean.toUpperCase() },
    { membershipId: possibleMembershipId },
    { phone: clean },
    { email: clean.toLowerCase() },
  ];

  if (cleanPhone) {
    queryConditions.push({ phone: `0${cleanPhone}` });
    queryConditions.push({ phone: `+880${cleanPhone}` });
    queryConditions.push({ phone: cleanPhone });
    queryConditions.push({ membershipId: `BRG-${cleanPhone}` });
  }

  if (isValidObjectId(clean)) {
    queryConditions.push({ _id: clean });
  }

  let user = await User.findOne({
    isDeleted: false,
    $or: queryConditions,
  });

  if (!user) return null;

  const validUser = await ensureMembership(user);
  if (!validUser) return null;

  // Lifetime spend calculation from completed orders
  const [spendAgg] = await Order.aggregate([
    {
      $match: {
        'user.id': String(validUser._id),
        status: { $nin: ['Rejected', 'Awaiting Payment'] },
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$total' },
        orderCount: { $sum: 1 },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
  ]);

  const totalSpent = round2(spendAgg?.totalSpent || 0);
  const orderCount = spendAgg?.orderCount || 0;
  const tierInfo = getTierFromSpend(totalSpent);

  return {
    user: {
      id: String(validUser._id),
      name: validUser.name,
      email: validUser.email,
      phone: validUser.phone,
      pickArea: validUser.pickArea || '',
      address: validUser.address || '',
      points: validUser.points || 0,
      membershipId: validUser.membershipId,
      membershipQr: validUser.membershipQr,
      createdAt: validUser.createdAt,
    },
    totalSpent,
    orderCount,
    lastOrderAt: spendAgg?.lastOrderAt || null,
    tier: tierInfo.tier,
    badge: tierInfo.badge,
    tierDetails: tierInfo,
  };
};

// 🎯 Public Customer Membership Verification (Safe data for QR scanner & public verification page)
const getPublicMembershipService = async (rawQuery: string) => {
  if (!rawQuery) return null;
  const clean = extractCleanQuery(rawQuery);
  if (!clean) return null;

  const cleanPhone = cleanPhoneForMembership(clean);
  const possibleMembershipId = clean.toUpperCase().startsWith('BRG-') ? clean.toUpperCase() : `BRG-${cleanPhone}`;

  const queryConditions: any[] = [
    { membershipId: clean },
    { membershipId: clean.toUpperCase() },
    { membershipId: possibleMembershipId },
    { phone: clean },
  ];

  if (cleanPhone) {
    queryConditions.push({ phone: `0${cleanPhone}` });
    queryConditions.push({ phone: `+880${cleanPhone}` });
    queryConditions.push({ phone: cleanPhone });
    queryConditions.push({ membershipId: `BRG-${cleanPhone}` });
  }

  if (isValidObjectId(clean)) {
    queryConditions.push({ _id: clean });
  }

  let user = await User.findOne({
    isDeleted: false,
    $or: queryConditions,
  });

  if (!user) return null;

  const validUser = await ensureMembership(user);
  if (!validUser) return null;

  // Lifetime spend calculation from completed orders
  const [spendAgg] = await Order.aggregate([
    {
      $match: {
        'user.id': String(validUser._id),
        status: { $nin: ['Rejected', 'Awaiting Payment'] },
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$total' },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const totalSpent = round2(spendAgg?.totalSpent || 0);
  const orderCount = spendAgg?.orderCount || 0;
  const tierInfo = getTierFromSpend(totalSpent);

  return {
    name: validUser.name,
    membershipId: validUser.membershipId,
    membershipQr: validUser.membershipQr,
    tier: tierInfo.tier,
    badge: tierInfo.badge,
    icon: tierInfo.icon,
    color: tierInfo.color,
    discountPct: tierInfo.discountPct,
    points: validUser.points || 0,
    orderCount,
    totalSpent,
    pickArea: validUser.pickArea || '',
    memberSince: validUser.createdAt,
    status: 'Active',
    verified: true,
  };
};

// self profile update — customer can update name, email, pickArea, address; phone & role are locked to loyalty ID
const updateMeService = async (userId: string, payload: any) => {
  if (!isValidObjectId(userId)) return null;
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) return null;

  if (payload.name !== undefined && String(payload.name).trim()) {
    user.name = String(payload.name).trim();
  }

  if (payload.email !== undefined) {
    const trimmedEmail = String(payload.email).trim().toLowerCase();
    if (trimmedEmail && trimmedEmail !== user.email) {
      // Check if email already exists for another active account
      const existingUser = await User.findOne({
        email: trimmedEmail,
        _id: { $ne: userId },
        isDeleted: false,
      });
      if (existingUser) {
        const error: any = new Error('This email address is already registered to another account.');
        error.status = 409;
        throw error;
      }
      user.email = trimmedEmail;
    }
  }

  if (payload.pickArea !== undefined) user.pickArea = String(payload.pickArea).trim();
  if (payload.address !== undefined) user.address = String(payload.address).trim();

  await user.save();
  await ensureMembership(user);
  return user;
};

// admin update user profile, email, phone, password, address, points
const adminUpdateUserService = async (userId: string, payload: any) => {
  if (!isValidObjectId(userId)) return null;
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) return null;

  if (payload.name !== undefined && String(payload.name).trim()) {
    user.name = String(payload.name).trim();
  }

  if (payload.email !== undefined) {
    const trimmedEmail = String(payload.email).trim().toLowerCase();
    user.email = trimmedEmail === '' ? undefined : trimmedEmail;
  }

  if (user.role !== 'user' && payload.phone !== undefined && String(payload.phone).trim()) {
    const rawDigits = String(payload.phone).replace(/\D/g, "");
    user.phone = /^01[3-9]\d{8}$/.test(rawDigits) ? `+88${rawDigits}` : String(payload.phone).trim();
  }

  if (payload.password !== undefined && String(payload.password).trim()) {
    user.password = String(payload.password).trim();
  }

  if (payload.pickArea !== undefined) {
    user.pickArea = String(payload.pickArea).trim();
  }

  if (payload.address !== undefined) {
    user.address = String(payload.address).trim();
  }

  if (payload.points !== undefined && !isNaN(Number(payload.points))) {
    user.points = Math.max(0, Number(payload.points));
  }

  await user.save();
  await ensureMembership(user);
  return user;
};

// 👑 Staff & Role Management Services (Super Admin / Admin)
const getStaffUsersService = async () => {
  const staffRoles = ['super_admin', 'superadmin', 'admin', 'manager', 'restaurant_manager'];
  const staff = await User.find({
    role: { $in: staffRoles },
    isDeleted: false,
  }).sort({ createdAt: -1 });
  return staff;
};

const createStaffUserService = async (payload: any) => {
  const { name, email, phone, password, role, permissions, assignedBranches } = payload;
  if (!name || !password || (!email && !phone)) {
    const err: any = new Error('Name, Password, and Mobile number or Email are required.');
    err.status = 400;
    throw err;
  }

  const cleanEmail = email ? String(email).trim().toLowerCase() : undefined;
  let cleanPhone: string | undefined = undefined;
  if (phone && String(phone).trim()) {
    const rawDigits = String(phone).replace(/\D/g, '');
    cleanPhone = /^01[3-9]\d{8}$/.test(rawDigits) ? `+88${rawDigits}` : String(phone).trim();
  }

  // Check duplicate
  const existing = await User.findOne({
    isDeleted: false,
    $or: [
      ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ...(cleanPhone ? [{ phone: cleanPhone }] : []),
    ],
  });
  if (existing) {
    const err: any = new Error('An account with this email or phone number already exists.');
    err.status = 409;
    throw err;
  }

  const validRole = ['super_admin', 'superadmin', 'admin', 'manager', 'restaurant_manager'].includes(role)
    ? role
    : 'admin';

  const cleanAssignedBranches = Array.isArray(assignedBranches)
    ? assignedBranches.map(Number).filter((n) => Number.isFinite(n))
    : [];

  const newStaff = await User.create({
    name: String(name).trim(),
    email: cleanEmail,
    phone: cleanPhone,
    password: String(password).trim(),
    role: validRole,
    permissions: Array.isArray(permissions) ? permissions : [],
    assignedBranches: cleanAssignedBranches,
  });

  return newStaff;
};

const updateStaffUserService = async (id: string, payload: any) => {
  if (!isValidObjectId(id)) return null;
  const user = await User.findOne({ _id: id, isDeleted: false });
  if (!user) return null;

  if (payload.name !== undefined && String(payload.name).trim()) {
    user.name = String(payload.name).trim();
  }
  if (payload.email !== undefined) {
    const trimmed = String(payload.email).trim().toLowerCase();
    user.email = trimmed === '' ? undefined : trimmed;
  }
  if (payload.phone !== undefined && String(payload.phone).trim()) {
    const rawDigits = String(payload.phone).replace(/\D/g, '');
    user.phone = /^01[3-9]\d{8}$/.test(rawDigits) ? `+88${rawDigits}` : String(payload.phone).trim();
  }
  if (payload.password !== undefined && String(payload.password).trim()) {
    user.password = String(payload.password).trim();
  }
  if (payload.role !== undefined) {
    const validRole = ['super_admin', 'superadmin', 'admin', 'manager', 'restaurant_manager'].includes(payload.role)
      ? payload.role
      : user.role;
    user.role = validRole;
  }
  if (payload.permissions !== undefined && Array.isArray(payload.permissions)) {
    user.permissions = payload.permissions;
  }
  if (payload.assignedBranches !== undefined && Array.isArray(payload.assignedBranches)) {
    user.assignedBranches = payload.assignedBranches
      .map(Number)
      .filter((n: number) => Number.isFinite(n));
  }

  await user.save();
  return user;
};

const deleteStaffUserService = async (id: string, actorId: string) => {
  if (!isValidObjectId(id)) return null;
  if (String(id) === String(actorId)) {
    const err: any = new Error('You cannot delete your own account.');
    err.status = 400;
    throw err;
  }
  const staff = await User.findById(id);
  if (!staff) return null;

  if (['super_admin', 'superadmin'].includes(staff.role) && staff.email === 'admin@barcode.com') {
    const err: any = new Error('The primary Super Admin account cannot be deleted.');
    err.status = 403;
    throw err;
  }

  // 🎯 HARD DELETE permanently from MongoDB
  await User.findByIdAndDelete(id);
  return staff;
};

// 🎯 Hard delete customer / general user permanently from MongoDB
const adminDeleteUserService = async (id: string, actor: any) => {
  if (!isValidObjectId(id)) return null;
  const user = await User.findById(id);
  if (!user) return null;

  if (['super_admin', 'superadmin'].includes(user.role)) {
    const err: any = new Error('Super Admin accounts cannot be deleted.');
    err.status = 403;
    throw err;
  }

  if (user.role === 'admin' && !['super_admin', 'superadmin'].includes(actor?.role)) {
    const err: any = new Error('Only Super Admin can delete a Sub-Admin account.');
    err.status = 403;
    throw err;
  }

  // 🎯 HARD DELETE permanently from MongoDB
  await User.findByIdAndDelete(id);
  return user;
};

// 🧹 Super Admin: Purge all non-admin users (customers, riders, managers) keeping only super_admin and admin
const cleanupNonAdminUsersService = async () => {
  const preservedRoles = ['super_admin', 'superadmin', 'admin'];
  const preservedUsers = await User.find({ role: { $in: preservedRoles } }).lean();

  if (preservedUsers.length === 0) {
    const err: any = new Error('No Super Admin or Admin accounts found. Action aborted for safety.');
    err.status = 400;
    throw err;
  }

  // Permanently delete all users whose role is not super_admin, superadmin, or admin
  const result = await User.deleteMany({ role: { $nin: preservedRoles } });

  return {
    deletedCount: result.deletedCount,
    preservedCount: preservedUsers.length,
    preservedUsers: preservedUsers.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
    })),
  };
};

export const UserService = {
  getAllUsersService,
  getUserByIdService,
  posLookupService,
  getPublicMembershipService,
  updateMeService,
  adminUpdateUserService,
  adminDeleteUserService,
  getStaffUsersService,
  createStaffUserService,
  updateStaffUserService,
  deleteStaffUserService,
  cleanupNonAdminUsersService,
};
