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

  // Check if any user needs membership ID update or QR code refresh
  const needsBackfill = users.filter((u) => {
    if (u.role !== 'user') return false;
    if (!u.membershipId || !u.membershipQr) return true;
    const cleanPhone = cleanPhoneForMembership(u.phone);
    if (cleanPhone && cleanPhone.length >= 6) {
      const expectedId = `BRG-${cleanPhone}`;
      if (u.membershipId !== expectedId) return true;
    }
    return false;
  });

  if (needsBackfill.length) {
    await Promise.all(needsBackfill.map((u) => ensureMembership(u)));
  }

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
  const possibleMembershipId = clean.startsWith('BRG-') ? clean : `BRG-${cleanPhone}`;

  const queryConditions: any[] = [
    { membershipId: clean },
    { membershipId: possibleMembershipId },
    { phone: clean },
    { email: clean.toLowerCase() },
  ];

  if (cleanPhone) {
    queryConditions.push({ phone: `0${cleanPhone}` });
    queryConditions.push({ phone: `+880${cleanPhone}` });
    queryConditions.push({ phone: cleanPhone });
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
  const possibleMembershipId = clean.startsWith('BRG-') ? clean : `BRG-${cleanPhone}`;

  const queryConditions: any[] = [
    { membershipId: clean },
    { membershipId: possibleMembershipId },
    { phone: clean },
  ];

  if (cleanPhone) {
    queryConditions.push({ phone: `0${cleanPhone}` });
    queryConditions.push({ phone: `+880${cleanPhone}` });
    queryConditions.push({ phone: cleanPhone });
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

// self profile update — only these fields; never role/email/password here
const updateMeService = async (userId: string, payload: any) => {
  if (!isValidObjectId(userId)) return null;
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) return null;
  if (payload.name !== undefined && String(payload.name).trim()) user.name = String(payload.name).trim();
  if (payload.phone !== undefined) user.phone = String(payload.phone).trim();
  if (payload.pickArea !== undefined) user.pickArea = String(payload.pickArea).trim();
  if (payload.address !== undefined) user.address = String(payload.address).trim();
  await user.save();
  await ensureMembership(user);
  return user;
};

export const UserService = {
  getAllUsersService,
  getUserByIdService,
  posLookupService,
  getPublicMembershipService,
  updateMeService,
};
