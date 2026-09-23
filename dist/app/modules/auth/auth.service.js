"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/modules/auth/auth.service.ts
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../../config"));
const user_model_1 = require("../user/user.model");
const membership_1 = require("../../utils/membership");
// 📧 Nodemailer Transporter Config
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER, // e.g. barcode.bd@gmail.com
        pass: process.env.SMTP_PASS, // App Password
    },
});
// Helper: Mask email for privacy (e.g., j***n@gmail.com)
const maskEmail = (email) => {
    if (!email || !email.includes("@"))
        return "";
    const [name, domain] = email.split("@");
    if (name.length <= 2)
        return `${name[0]}*@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
};
// Store BD numbers in one canonical shape (+8801XXXXXXXXX)
const normalizeBdPhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (/^01[3-9]\d{8}$/.test(digits))
        return `+88${digits}`;
    if (/^8801[3-9]\d{8}$/.test(digits))
        return `+${digits}`;
    return String(raw || "").trim();
};
// Helper: access token জেনারেট
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.access_secret, {
        expiresIn: config_1.default.jwt.access_expires_in,
    });
};
// রেজিস্টার + অটো-লগইন → { user, token }
const registerUser = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const cleanEmail = ((_a = payload.email) === null || _a === void 0 ? void 0 : _a.trim()) ? payload.email.trim().toLowerCase() : undefined;
    const cleanPhone = ((_b = payload.phone) === null || _b === void 0 ? void 0 : _b.trim()) ? normalizeBdPhone(payload.phone) : undefined;
    // 🎯 ১. ফোন নম্বর ডুপ্লিকেট চেক
    if (cleanPhone) {
        const phoneExists = yield user_model_1.User.findOne({
            phone: cleanPhone,
            isDeleted: false,
        });
        if (phoneExists) {
            const err = new Error("An account with this phone number already exists.");
            err.status = 409;
            throw err;
        }
    }
    // 🎯 ২. ইমেইল ডুপ্লিকেট চেক
    if (cleanEmail) {
        const emailExists = yield user_model_1.User.findOne({ email: cleanEmail, isDeleted: false });
        if (emailExists) {
            const err = new Error("An account with this email already exists.");
            err.status = 409;
            throw err;
        }
    }
    // 🎯 ৩. নতুন ইউজার তৈরি
    const newUser = yield user_model_1.User.create({
        name: payload.name.trim(),
        email: cleanEmail,
        password: payload.password,
        role: "user",
        phone: cleanPhone,
        pickArea: ((_c = payload.pickArea) === null || _c === void 0 ? void 0 : _c.trim()) || "",
        address: ((_d = payload.address) === null || _d === void 0 ? void 0 : _d.trim()) || "",
    });
    yield (0, membership_1.ensureMembership)(newUser);
    const token = generateToken({
        _id: String(newUser._id),
        role: newUser.role,
        email: newUser.email || "",
    });
    return { user: newUser, token };
});
// লগইন → { user, token }
const loginUser = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, phone, password } = payload;
    const rawIdentifier = (phone || email || "").trim();
    if (!rawIdentifier || !password) {
        const err = new Error("Please provide a mobile number/email and password.");
        err.status = 400;
        throw err;
    }
    const cleanDigits = rawIdentifier.replace(/\D/g, "");
    const normalizedPhone = normalizeBdPhone(rawIdentifier);
    const normalizedEmail = rawIdentifier.toLowerCase();
    const phoneVariants = [rawIdentifier, normalizedPhone];
    if (cleanDigits) {
        phoneVariants.push(cleanDigits);
        if (cleanDigits.startsWith("880")) {
            phoneVariants.push(`0${cleanDigits.slice(3)}`);
            phoneVariants.push(`+${cleanDigits}`);
        }
        else if (cleanDigits.startsWith("0")) {
            phoneVariants.push(`+88${cleanDigits}`);
            phoneVariants.push(`88${cleanDigits}`);
        }
        else if (cleanDigits.startsWith("1") && cleanDigits.length === 10) {
            phoneVariants.push(`0${cleanDigits}`);
            phoneVariants.push(`+880${cleanDigits}`);
            phoneVariants.push(`880${cleanDigits}`);
        }
    }
    const user = yield user_model_1.User.findOne({
        isDeleted: { $ne: true },
        $or: [
            { phone: { $in: phoneVariants } },
            { email: normalizedEmail },
            { email: rawIdentifier },
        ],
    }).select("+password");
    if (!user) {
        const err = new Error("Invalid mobile number/email or password.");
        err.status = 401;
        throw err;
    }
    const isMatch = yield bcryptjs_1.default.compare(password, user.password || "");
    if (!isMatch) {
        const err = new Error("Invalid mobile number/email or password.");
        err.status = 401;
        throw err;
    }
    const token = generateToken({
        _id: String(user._id),
        role: user.role,
        email: user.email || "",
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
        assignedBranches: Array.isArray(user.assignedBranches) ? user.assignedBranches : [],
    });
    user.password = undefined;
    return { user, token };
});
// 📧 1. Request OTP to Linked Email
const requestEmailOtp = (phone) => __awaiter(void 0, void 0, void 0, function* () {
    if (!phone) {
        const err = new Error("Please provide a mobile number.");
        err.status = 400;
        throw err;
    }
    const normalizedPhone = normalizeBdPhone(phone);
    const user = yield user_model_1.User.findOne({
        isDeleted: false,
        $or: [{ phone: normalizedPhone }, { phone: phone.trim() }],
    });
    if (!user) {
        const err = new Error("No account found with this phone number.");
        err.status = 404;
        throw err;
    }
    if (!user.email) {
        const err = new Error("No email linked with this account. Please contact Customer Support.");
        err.status = 400;
        throw err;
    }
    // Cryptographically secure 6-digit OTP generation
    const otp = crypto_1.default.randomInt(100000, 1000000).toString();
    // 💡 20 Minutes Validity
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
    // Reset OTP metadata
    user.resetOtp = String(otp);
    user.resetOtpExpires = expiresAt;
    user.resetOtpAttempts = 0;
    yield user.save();
    const senderEmail = process.env.SMTP_USER || "barcode.bd@gmail.com";
    yield transporter.sendMail({
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
});
// 🔑 2. Verify OTP & Reset Password
const resetPasswordWithOtp = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, otp, newPassword } = payload;
    if (!phone || !otp || !newPassword) {
        const err = new Error("Phone number, OTP, and new password are required.");
        err.status = 400;
        throw err;
    }
    if (newPassword.length < 8) {
        const err = new Error("Password must be at least 8 characters long.");
        err.status = 400;
        throw err;
    }
    const normalizedPhone = normalizeBdPhone(phone);
    const user = yield user_model_1.User.findOne({
        isDeleted: false,
        $or: [{ phone: normalizedPhone }, { phone: phone.trim() }],
    }).select("+password");
    if (!user) {
        const err = new Error("Invalid request.");
        err.status = 400;
        throw err;
    }
    const storedOtp = user.resetOtp ? String(user.resetOtp).trim() : null;
    const otpExpires = user.resetOtpExpires;
    const attempts = Number(user.resetOtpAttempts || 0);
    // Maximum 5 failed attempts limit to prevent brute force
    if (attempts >= 5) {
        user.resetOtp = null;
        user.resetOtpExpires = null;
        user.resetOtpAttempts = 0;
        yield user.save();
        const err = new Error("Too many invalid OTP attempts. For your security, this OTP code has been invalidated. Please request a new OTP.");
        err.status = 429;
        throw err;
    }
    const inputOtp = String(otp).trim();
    const currentTime = Date.now();
    const expiryTime = otpExpires ? new Date(otpExpires).getTime() : 0;
    if (!storedOtp || storedOtp !== inputOtp) {
        user.resetOtpAttempts = attempts + 1;
        yield user.save();
        const err = new Error(`Invalid OTP code. (${4 - attempts} attempts remaining)`);
        err.status = 400;
        throw err;
    }
    if (currentTime > expiryTime) {
        user.resetOtp = null;
        user.resetOtpExpires = null;
        user.resetOtpAttempts = 0;
        yield user.save();
        const err = new Error("OTP code has expired. Please request a new one.");
        err.status = 400;
        throw err;
    }
    // Update password and clear OTP fields
    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    yield user.save();
    return { message: "Password updated successfully." };
});
// সেশন হাইড্রেশন → GET /api/auth/me
const getMe = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
    }
    return user;
});
exports.AuthService = {
    registerUser,
    loginUser,
    requestEmailOtp,
    resetPasswordWithOtp,
    getMe,
};
