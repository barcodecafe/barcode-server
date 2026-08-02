/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/modules/auth/auth.service.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import config from "../../config";
import { User } from "../user/user.model";
import { ensureMembership } from "../../utils/membership";

// 📧 Nodemailer Transporter Config
// Ensure process.env.SMTP_USER and process.env.SMTP_PASS are configured in your .env file
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER, // e.g. yourrestaurant@gmail.com
    pass: process.env.SMTP_PASS, // App Password generated from Google Account
  },
});

// Helper: Mask email for privacy (e.g., j***n@gmail.com)
const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return "";
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
};

// Store BD numbers in one canonical shape (+8801XXXXXXXXX)
const normalizeBdPhone = (raw?: string): string => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^01[3-9]\d{8}$/.test(digits)) return `+88${digits}`;
  if (/^8801[3-9]\d{8}$/.test(digits)) return `+${digits}`;
  return String(raw || "").trim();
};

// Helper: access token জেনারেট
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

// রেজিস্টার + অটো-লগইন → { user, token }
const registerUser = async (payload: RegisterPayload) => {
  const cleanEmail = payload.email?.trim() ? payload.email.trim().toLowerCase() : undefined;
  const cleanPhone = payload.phone?.trim() ? normalizeBdPhone(payload.phone) : undefined;

  // 🎯 ১. ফোন নম্বর ডুপ্লিকেট চেক
  if (cleanPhone) {
    const phoneExists = await User.findOne({
      phone: cleanPhone,
      isDeleted: false,
    });
    if (phoneExists) {
      const err: any = new Error("An account with this phone number already exists.");
      err.status = 409;
      throw err;
    }
  }

  // 🎯 ২. ইমেইল ডুপ্লিকেট চেক
  if (cleanEmail) {
    const emailExists = await User.findOne({ email: cleanEmail, isDeleted: false });
    if (emailExists) {
      const err: any = new Error("An account with this email already exists.");
      err.status = 409;
      throw err;
    }
  }

  // 🎯 ৩. নতুন ইউজার তৈরি
  const newUser = await User.create({
    name: payload.name.trim(),
    email: cleanEmail,
    password: payload.password,
    role: "user",
    phone: cleanPhone,
    pickArea: payload.pickArea?.trim() || "",
    address: payload.address?.trim() || "",
  });

  await ensureMembership(newUser);

  const token = generateToken({
    _id: String(newUser._id),
    role: newUser.role,
    email: newUser.email || "",
  });

  return { user: newUser, token };
};

// লগইন → { user, token }
const loginUser = async (payload: LoginPayload) => {
  const { email, phone, password } = payload;
  const rawIdentifier = (phone || email || "").trim();

  if (!rawIdentifier || !password) {
    const err: any = new Error("Please provide a mobile number/email and password.");
    err.status = 400;
    throw err;
  }

  const normalizedPhone = normalizeBdPhone(rawIdentifier);
  const normalizedEmail = rawIdentifier.toLowerCase();

  const user = await User.findOne({
    isDeleted: false,
    $or: [
      { phone: normalizedPhone },
      { phone: rawIdentifier },
      { email: normalizedEmail },
    ],
  }).select("+password");

  if (!user) {
    const err: any = new Error("Invalid mobile number/email or password.");
    err.status = 401;
    throw err;
  }

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

  user.password = undefined as any;
  return { user, token };
};

// 📧 1. Request OTP to Linked Email
const requestEmailOtp = async (phone: string) => {
  if (!phone) {
    const err: any = new Error("Please provide a mobile number.");
    err.status = 400;
    throw err;
  }

  const normalizedPhone = normalizeBdPhone(phone);
  const user = await User.findOne({
    isDeleted: false,
    $or: [{ phone: normalizedPhone }, { phone: phone.trim() }],
  });

  if (!user) {
    const err: any = new Error("No account found with this phone number.");
    err.status = 404;
    throw err;
  }

  if (!user.email) {
    const err: any = new Error("No email linked with this account. Please contact Customer Support.");
    err.status = 400;
    throw err;
  }

  // 6-digit OTP জেনারেট
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

  // MongoDB User ডকুমেন্টে OTP ও মেয়াদ সেভ করা
  (user as any).resetOtp = otp;
  (user as any).resetOtpExpires = otpExpires;
  await user.save();

  // ইমেইল সেন্ড করা
  await transporter.sendMail({
    from: '"Barcode Restaurant" <no-reply@barcoderestaurant.com>',
    to: user.email,
    subject: "Your Password Reset OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #f97316;">Barcode Password Reset</h2>
        <p>Your 6-digit OTP code to reset your password is:</p>
        <h1 style="background: #f3f4f6; padding: 10px 20px; display: inline-block; border-radius: 8px; color: #111; letter-spacing: 4px;">${otp}</h1>
        <p>This OTP will expire in <strong>10 minutes</strong>.</p>
        <p style="font-size: 12px; color: #777;">If you did not request this password reset, please ignore this email.</p>
      </div>
    `,
  });

  return { maskedEmail: maskEmail(user.email) };
};

// 🔑 2. Verify OTP & Reset Password
const resetPasswordWithOtp = async (payload: { phone: string; otp: string; newPassword: string }) => {
  const { phone, otp, newPassword } = payload;

  if (!phone || !otp || !newPassword) {
    const err: any = new Error("Phone number, OTP, and new password are required.");
    err.status = 400;
    throw err;
  }

  if (newPassword.length < 8) {
    const err: any = new Error("Password must be at least 8 characters long.");
    err.status = 400;
    throw err;
  }

  const normalizedPhone = normalizeBdPhone(phone);
  const user = await User.findOne({
    isDeleted: false,
    $or: [{ phone: normalizedPhone }, { phone: phone.trim() }],
  });

  if (!user) {
    const err: any = new Error("Invalid request.");
    err.status = 400;
    throw err;
  }

  const storedOtp = (user as any).resetOtp;
  const otpExpires = (user as any).resetOtpExpires;

  if (!storedOtp || storedOtp !== otp.trim() || new Date() > new Date(otpExpires)) {
    const err: any = new Error("Invalid or expired OTP code.");
    err.status = 400;
    throw err;
  }

  // পাসওয়ার্ড আপডেট ও OTP ক্লিয়ার করা
  user.password = newPassword;
  (user as any).resetOtp = undefined;
  (user as any).resetOtpExpires = undefined;
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
  requestEmailOtp,
  resetPasswordWithOtp,
  getMe,
};