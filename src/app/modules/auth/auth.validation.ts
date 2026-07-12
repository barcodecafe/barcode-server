import { z } from 'zod';

// রেজিস্টার — role ইচ্ছাকৃতভাবে গ্রহণ করা হয় না (সার্ভারই role ঠিক করে)
export const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    phone: z.string().optional(),
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
