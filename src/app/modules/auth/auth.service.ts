/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/modules/auth/auth.service.ts
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import config from "../../config";
import { User } from "../user/user.model";
import { ensureMembership } from "../../utils/membership";

// 📧 Nodemailer Transporter Config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER, // e.g. barcode.bd@gmail.com
    pass: process.env.SMTP_PASS, // App Password
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
  permissions?: string[];
  assignedBranches?: number[];
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

  const cleanDigits = rawIdentifier.replace(/\D/g, "");
  const normalizedPhone = normalizeBdPhone(rawIdentifier);
  const normalizedEmail = rawIdentifier.toLowerCase();

  const phoneVariants: string[] = [rawIdentifier, normalizedPhone];
  if (cleanDigits) {
    phoneVariants.push(cleanDigits);
    if (cleanDigits.startsWith("880")) {
      phoneVariants.push(`0${cleanDigits.slice(3)}`);
      phoneVariants.push(`+${cleanDigits}`);
    } else if (cleanDigits.startsWith("0")) {
      phoneVariants.push(`+88${cleanDigits}`);
      phoneVariants.push(`88${cleanDigits}`);
    } else if (cleanDigits.startsWith("1") && cleanDigits.length === 10) {
      phoneVariants.push(`0${cleanDigits}`);
      phoneVariants.push(`+880${cleanDigits}`);
      phoneVariants.push(`880${cleanDigits}`);
    }
  }

  const user = await User.findOne({
    isDeleted: { $ne: true },
    $or: [
      { phone: { $in: phoneVariants } },
      { email: normalizedEmail },
      { email: rawIdentifier },
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
    permissions: Array.isArray((user as any).permissions) ? (user as any).permissions : [],
    assignedBranches: Array.isArray((user as any).assignedBranches) ? (user as any).assignedBranches : [],
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

  // Cryptographically secure 6-digit OTP generation
  const otp = crypto.randomInt(100000, 1000000).toString();
  
  // 💡 20 Minutes Validity
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  // Reset OTP metadata
  (user as any).resetOtp = String(otp);
  (user as any).resetOtpExpires = expiresAt;
  (user as any).resetOtpAttempts = 0;
  await user.save();

  const senderEmail = process.env.SMTP_USER || "barcode.bd@gmail.com";

  await transporter.sendMail({
    from: `"Barcode Restaurant" <${senderEmail}>`,
    to: user.email,
    subject: "Your Password Reset OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; color: #333;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h2 style="color: #f97316; margin-top: 0;">Barcode Restaurant</h2>
          <p style="font-size: 15px; color: #4b5563;">Hello,</p>
          <p style="font-size: 15px; color: #4b5563;">Your 6-digit OTP code to reset your password is:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; background: #f3f4f6; padding: 12px 24px; border-radius: 8px; color: #111827; letter-spacing: 6px; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #6b7280;">This OTP code will expire in <strong>20 minutes</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">If you did not request a password reset, please ignore this email.</p>
        </div>
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
  }).select("+password");

  if (!user) {
    const err: any = new Error("Invalid request.");
    err.status = 400;
    throw err;
  }

  const storedOtp = (user as any).resetOtp ? String((user as any).resetOtp).trim() : null;
  const otpExpires = (user as any).resetOtpExpires;
  const attempts = Number((user as any).resetOtpAttempts || 0);

  // Maximum 5 failed attempts limit to prevent brute force
  if (attempts >= 5) {
    (user as any).resetOtp = null;
    (user as any).resetOtpExpires = null;
    (user as any).resetOtpAttempts = 0;
    await user.save();
    const err: any = new Error("Too many invalid OTP attempts. For your security, this OTP code has been invalidated. Please request a new OTP.");
    err.status = 429;
    throw err;
  }

  const inputOtp = String(otp).trim();
  const currentTime = Date.now();
  const expiryTime = otpExpires ? new Date(otpExpires).getTime() : 0;

  if (!storedOtp || storedOtp !== inputOtp) {
    (user as any).resetOtpAttempts = attempts + 1;
    await user.save();
    const err: any = new Error(`Invalid OTP code. (${4 - attempts} attempts remaining)`);
    err.status = 400;
    throw err;
  }

  if (currentTime > expiryTime) {
    (user as any).resetOtp = null;
    (user as any).resetOtpExpires = null;
    (user as any).resetOtpAttempts = 0;
    await user.save();
    const err: any = new Error("OTP code has expired. Please request a new one.");
    err.status = 400;
    throw err;
  }

  // Update password and clear OTP fields
  user.password = newPassword;
  (user as any).resetOtp = null;
  (user as any).resetOtpExpires = null;
  (user as any).resetOtpAttempts = 0;
  
  await user.save();

  return { message: "Password updated successfully." };
};

// সেশন হাইড্রেশন → GET /api/auth/me
const getMe = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
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