/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/modules/auth/auth.service.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../../config";
import { User } from "../user/user.model";
import { ensureMembership } from "../../utils/membership";

// Store BD numbers in one canonical shape (+8801XXXXXXXXX) regardless of how the
// customer typed them, so lookups (POS, SSLCommerz cus_phone) stay consistent.
const normalizeBdPhone = (raw?: string): string => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^01[3-9]\d{8}$/.test(digits)) return `+88${digits}`;
  if (/^8801[3-9]\d{8}$/.test(digits)) return `+${digits}`;
  return String(raw || "").trim();
};

// Helper: access token তৈরি
const generateToken = (payload: {
  _id: string;
  role: string;
  email: string;
}) => {
  return jwt.sign(payload, config.jwt.access_secret, {
    expiresIn: config.jwt.access_expires_in as any,
  });
};

type RegisterPayload = {
  name: string;
  email?: string;
  password: string;
  phone?: string;
  pickArea?: string;
  address?: string;
};

type LoginPayload = {
  email?: string;
  phone?: string;
  password: string;
};

type ResetPasswordPayload = {
  email?: string;
  phone?: string;
  newPassword: string;
};

// রেজিস্টার + অটো-লগইন → { user, token }
const registerUser = async (payload: RegisterPayload) => {
  // 🛠️ ফাঁকা স্ট্রিং ("") আসলে undefined নিশ্চিত করা হচ্ছে যাতে Sparse Index এরর না দেয়
  const cleanEmail = payload.email?.trim() ? payload.email.trim().toLowerCase() : undefined;
  const cleanPhone = payload.phone?.trim() ? normalizeBdPhone(payload.phone) : undefined;

  // 🎯 ১. ফোন নম্বর ডুপ্লিকেট চেক (যদি ফোন নম্বর থাকে)
  if (cleanPhone) {
    const phoneExists = await User.findOne({
      phone: cleanPhone,
      isDeleted: false,
    });
    if (phoneExists) {
      const err: any = new Error(
        "An account with this phone number already exists.",
      );
      err.status = 409;
      throw err;
    }
  }

  // 🎯 ২. ইমেইল ডুপ্লিকেট চেক (যদি ইমেইল থাকে)
  if (cleanEmail) {
    const emailExists = await User.findOne({ email: cleanEmail, isDeleted: false });
    if (emailExists) {
      const err: any = new Error("An account with this email already exists.");
      err.status = 409;
      throw err;
    }
  }

  // 🎯 ৩. নতুন ইউজার তৈরি (খালি ফিল্ডের ক্ষেত্রে undefined পাঠানো হচ্ছে)
  const newUser = await User.create({
    name: payload.name.trim(),
    email: cleanEmail, // 👈 undefined পাঠালে MongoDB-তে email ফিল্ড সেভ হবে না
    password: payload.password,
    role: "user",
    phone: cleanPhone, // 👈 undefined পাঠালে MongoDB-তে phone ফিল্ড সেভ হবে না
    pickArea: payload.pickArea?.trim() || "",
    address: payload.address?.trim() || "",
  });

  // Loyalty Membership QR ও ID জেনারেট
  await ensureMembership(newUser);

  const token = generateToken({
    _id: String(newUser._id),
    role: newUser.role,
    email: newUser.email || "",
  });

  return { user: newUser, token };
};

// লগইন → { user, token } (Handles both Email and Phone Login Dynamically)
const loginUser = async (payload: LoginPayload) => {
  const { email, phone, password } = payload;

  // 🎯 ফ্রন্টএন্ড email বা phone যে নামেই ভ্যালু পাঠাক না কেন, তা রিসিভ করা
  const rawIdentifier = (phone || email || "").trim();

  if (!rawIdentifier || !password) {
    const err: any = new Error(
      "Please provide a mobile number/email and password.",
    );
    err.status = 400;
    throw err;
  }

  // 🎯 ইনপুটটিকে ফোন নম্বর (+8801...) এবং ইমেইল দুটো রূপেই প্রসেস করা
  const normalizedPhone = normalizeBdPhone(rawIdentifier);
  const normalizedEmail = rawIdentifier.toLowerCase();

  // 🎯 Smart Query: ডাটাবেজে ফোন (নরমাল বা +88 সহ) কিংবা ইমেইল—যেটির সাথেই মিলুক না কেন ইউজার পেয়ে যাবে
  const user = await User.findOne({
    isDeleted: false,
    $or: [
      { phone: normalizedPhone },
      { phone: rawIdentifier },
      { email: normalizedEmail },
    ],
  }).select("+password"); // 👈 password ফিল্ডটি স্পষ্টভাবে নিয়ে আসা হচ্ছে

  if (!user) {
    const err: any = new Error("Invalid mobile number/email or password.");
    err.status = 401;
    throw err;
  }

  // 🎯 পাসওয়ার্ড ভ্যালিডেশন
  const isMatch = await bcrypt.compare(password, user.password || "");
  if (!isMatch) {
    const err: any = new Error("Invalid mobile number/email or password.");
    err.status = 401;
    throw err;
  }

  const token = generateToken({
    _id: String(user._id),
    role: user.role,
    email: user.email || "",
  });

  // password যেন response-এ না যায়
  user.password = undefined as any;
  return { user, token };
};

// 🔑 রিসেট পাসওয়ার্ড সার্ভিস (Handles User/Rider/Admin Password Resets)
const resetPassword = async (payload: ResetPasswordPayload) => {
  const { email, phone, newPassword } = payload;
  const rawIdentifier = (phone || email || "").trim();

  if (!rawIdentifier || !newPassword) {
    const err: any = new Error("Please provide a phone number/email and a new password.");
    err.status = 400;
    throw err;
  }

  if (newPassword.length < 8) {
    const err: any = new Error("Password must be at least 8 characters long.");
    err.status = 400;
    throw err;
  }

  const normalizedPhone = normalizeBdPhone(rawIdentifier);
  const normalizedEmail = rawIdentifier.toLowerCase();

  // ডাটাবেজে ইউজার/রাইডার/এডমিন একাউন্ট খোঁজা
  const user = await User.findOne({
    isDeleted: false,
    $or: [
      { phone: normalizedPhone },
      { phone: rawIdentifier },
      { email: normalizedEmail },
    ],
  });

  if (!user) {
    const err: any = new Error("No account found with this phone number or email.");
    err.status = 404;
    throw err;
  }

  // 🎯 নতুন পাসওয়ার্ড আপডেট (User Model pre-save হুক পাসওয়ার্ড হ্যাশ করে নেবে, অথবা ম্যানুয়ালি Assign)
  user.password = newPassword;
  await user.save();

  return { message: "Password updated successfully." };
};

// সেশন হাইড্রেশন → GET /api/auth/me
const getMe = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) {
    const err: any = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return user;
};

export const AuthService = {
  registerUser,
  loginUser,
  resetPassword,
  getMe,
};