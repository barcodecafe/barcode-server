import { z } from "zod";

// Bangladeshi mobile number validation regex
const BD_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;

// Strict Email Regex
const STRICT_EMAIL = /^[^\s@.][^\s@]*@[^\s@.]+(?:\.[^\s@.]+)+$/;

// 🎯 ইমেইল অপশনাল ও ফাঁকা স্ট্রিং "" হলেও যেন Zod এরর না দেয়
const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => !val || val === "" || (STRICT_EMAIL.test(val) && z.string().email().safeParse(val).success),
    { message: "Please enter a valid email address" }
  );

// 🎯 ফোন নম্বর অপশনাল ও ফাঁকা স্ট্রিং "" হ্যান্ডলিং
const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => !val || val === "" || BD_PHONE.test(val),
    { message: "Enter a valid Bangladeshi mobile number (e.g. 01712345678)" }
  );

// 🎯 ১. সাইনআপ ভ্যালিডেশন
export const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: optionalEmailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    phone: optionalPhoneSchema,
    mobile: optionalPhoneSchema, // ফ্রন্টএন্ড mobile পাঠালেও সাপোর্ট করবে
    role: z.string().optional(),
    pickArea: z.string().optional(),
    address: z.string().optional(),
  }),
});

// 🎯 ২. লগইন ভ্যালিডেশন (Phone অথবা Email যেকোনো একটি বাধ্যতামূলক)
export const loginValidationSchema = z.object({
  body: z
    .object({
      email: optionalEmailSchema,
      phone: optionalPhoneSchema,
      mobile: optionalPhoneSchema,
      password: z.string().min(1, "Password is required"),
    })
    .refine(
      (data) => !!(data.phone || data.mobile || (data.email && data.email !== "")),
      {
        message: "Please provide a valid mobile number or email address",
        path: ["phone"], // এরর মেসেজ দেখানোর জন্য
      }
    ),
});