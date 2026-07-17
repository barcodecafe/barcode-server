import { z } from 'zod';

// Bangladeshi mobile number: 01[3-9] + 8 digits, optionally with +880 / 880.
// Accepts "01712345678", "+8801712345678", "8801712345678".
const BD_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;

// A stricter email shape than the default: exactly one @, a dotted domain, no
// consecutive dots, no leading/trailing dot in the local part. Catches typos
// that z.string().email() lets through (e.g. "a@b", "a@@b.com", "a@b..com").
const STRICT_EMAIL = /^[^\s@.][^\s@]*@[^\s@.]+(?:\.[^\s@.]+)+$/;

// রেজিস্টার — role ইচ্ছাকৃতভাবে গ্রহণ করা হয় না (সার্ভারই role ঠিক করে)
export const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z
      .string()
      .email('Valid email is required')
      .regex(STRICT_EMAIL, 'Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    phone: z
      .string()
      .trim()
      .regex(BD_PHONE, 'Enter a valid Bangladeshi mobile number (e.g. 01712345678)'),
    pickArea: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const loginValidationSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});
