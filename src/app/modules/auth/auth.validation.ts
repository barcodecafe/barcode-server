import { z } from 'zod';

// রেজিস্টার — role ইচ্ছাকৃতভাবে গ্রহণ করা হয় না (সার্ভারই role ঠিক করে)
export const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
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
