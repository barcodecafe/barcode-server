"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordOtpValidationSchema = exports.requestOtpValidationSchema = exports.loginValidationSchema = exports.registerValidationSchema = void 0;
const zod_1 = require("zod");
// Bangladeshi mobile number validation regex
const BD_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;
// Strict Email Regex
const STRICT_EMAIL = /^[^\s@.][^\s@]*@[^\s@.]+(?:\.[^\s@.]+)+$/;
// 🎯 ইমেইল অপশনাল ও ফাঁকা স্ট্রিং "" হলেও যেন Zod এরর না দেয়
const optionalEmailSchema = zod_1.z
    .string()
    .trim()
    .optional()
    .or(zod_1.z.literal(""))
    .refine((val) => !val || val === "" || (STRICT_EMAIL.test(val) && zod_1.z.string().email().safeParse(val).success), { message: "Please enter a valid email address" });
// 🎯 ফোন নম্বর অপশনাল ও ফাঁকা স্ট্রিং "" হ্যান্ডলিং
const optionalPhoneSchema = zod_1.z
    .string()
    .trim()
    .optional()
    .or(zod_1.z.literal(""))
    .refine((val) => !val || val === "" || BD_PHONE.test(val), { message: "Enter a valid Bangladeshi mobile number (e.g. 01712345678)" });
// 🎯 বাধ্যতামূলক ফোন নম্বর স্কিমা
const requiredPhoneSchema = zod_1.z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .refine((val) => BD_PHONE.test(val), {
    message: "Enter a valid Bangladeshi mobile number (e.g. 01712345678)",
});
// 🎯 ১. সাইনআপ ভ্যালিডেশন
exports.registerValidationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string().min(1, "Name is required"),
        email: optionalEmailSchema,
        password: zod_1.z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[a-z]/, "Password must contain a lowercase letter")
            .regex(/[A-Z]/, "Password must contain an uppercase letter")
            .regex(/[0-9]/, "Password must contain a number"),
        phone: optionalPhoneSchema,
        mobile: optionalPhoneSchema, // ফ্রন্টএন্ড mobile পাঠালেও সাপোর্ট করবে
        role: zod_1.z.string().optional(),
        pickArea: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
    })
        .refine((data) => !!(data.phone || data.mobile || (data.email && data.email !== "")), {
        message: "Please provide a valid mobile number or email address for registration",
        path: ["phone"],
    }),
});
// 🎯 ২. লগইন ভ্যালিডেশন (Phone অথবা Email যেকোনো একটি বাধ্যতামূলক)
exports.loginValidationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        email: optionalEmailSchema,
        phone: optionalPhoneSchema,
        mobile: optionalPhoneSchema,
        password: zod_1.z.string().min(1, "Password is required"),
    })
        .refine((data) => !!(data.phone || data.mobile || (data.email && data.email !== "")), {
        message: "Please provide a valid mobile number or email address",
        path: ["phone"], // এরর মেসেজ দেখানোর জন্য
    }),
});
// 📧 ৩. Email OTP রিকোয়েস্ট ভ্যালিডেশন
exports.requestOtpValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        phone: requiredPhoneSchema,
    }),
});
// 🔑 ৪. OTP দিয়ে পাসওয়ার্ড রিসেট ভ্যালিডেশন
exports.resetPasswordOtpValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        phone: requiredPhoneSchema,
        otp: zod_1.z
            .string()
            .trim()
            .length(6, "OTP must be exactly 6 digits")
            .regex(/^\d+$/, "OTP must contain numbers only"),
        newPassword: zod_1.z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[a-z]/, "Password must contain a lowercase letter")
            .regex(/[A-Z]/, "Password must contain an uppercase letter")
            .regex(/[0-9]/, "Password must contain a number"),
    }),
});
