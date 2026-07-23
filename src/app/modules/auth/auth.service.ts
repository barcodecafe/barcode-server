/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/modules/auth/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../../config';
import { User } from '../user/user.model';
import { ensureMembership } from '../../utils/membership';

// Store BD numbers in one canonical shape (+8801XXXXXXXXX) regardless of how the
// customer typed them, so lookups (POS, SSLCommerz cus_phone) stay consistent.
const normalizeBdPhone = (raw?: string): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (/^01[3-9]\d{8}$/.test(digits)) return `+88${digits}`;
  if (/^8801[3-9]\d{8}$/.test(digits)) return `+${digits}`;
  return String(raw || '').trim();
};

// Helper: access token তৈরি
const generateToken = (payload: { _id: string; role: string; email: string }) => {
  return jwt.sign(payload, config.jwt.access_secret, {
    expiresIn: config.jwt.access_expires_in as any,
  });
};

type RegisterPayload = {
  name: string;
  email?: string; // 👈 email এখন Optional
  password: string;
  phone?: string;
  pickArea?: string;
  address?: string;
  // NOTE: client পাঠালেও `role` ইচ্ছাকৃতভাবে এখানে নেওয়া হয় না — security fix #5
};

// রেজিস্টার + অটো-লগইন → { user, token }
const registerUser = async (payload: RegisterPayload) => {
  const email = payload.email.trim().toLowerCase();

  const exists = await User.findOne({ email });
  if (exists) {
    const err: any = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  // 🔒 role সবসময় সার্ভারে 'user' — client কখনো admin/rider হতে পারবে না
  const newUser = await User.create({
    name: payload.name.trim(),
    email,
    password: payload.password,
    role: 'user',
    phone: normalizeBdPhone(payload.phone),
    pickArea: payload.pickArea?.trim() || '',
    address: payload.address?.trim() || '',
  });

  // Issue a loyalty membership id + QR up front so the customer has it immediately.
  await ensureMembership(newUser);

  const token = generateToken({
    _id: String(newUser._id),
    role: newUser.role,
    email: newUser.email || '', // 👈 undefined থাকলে খালি স্ট্রিং পাস হবে
  });

  return { user: newUser, token };
};

// লগইন → { user, token }
const loginUser = async (payload: { email: string; password: string }) => {
  const email = payload.email.trim().toLowerCase();

  // password field select:false → এখানে স্পষ্টভাবে আনতে হবে
  const user = await User.findOne({ email, isDeleted: false }).select('+password');

  if (!user) {
    const err: any = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(payload.password, user.password || '');
  if (!isMatch) {
    const err: any = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const token = generateToken({
    _id: String(user._id),
    role: user.role,
    email: user.email || '', // 👈 TS Error সামলাতে fallback দেওয়া হয়েছে
  });

  // password যেন response-এ না যায় (toJSON ও strip করে, তবু নিরাপত্তার জন্য)
  user.password = undefined as any;
  return { user, token };
};

// সেশন হাইড্রেশন → GET /api/auth/me
const getMe = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) {
    const err: any = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
};

export const AuthService = {
  registerUser,
  loginUser,
  getMe,
};
