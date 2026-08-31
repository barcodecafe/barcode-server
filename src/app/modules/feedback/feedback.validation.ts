import { z } from 'zod';

export const createFeedbackValidationSchema = z.object({
  body: z.object({
    userName: z.string().min(1, 'Customer name is required'),
    phone: z
      .string()
      .min(10, 'Valid phone number is required')
      .regex(
        /^(?:\+88|88)?01[3-9]\d{8}$/,
        'Phone number must be a valid Bangladeshi mobile number (e.g. +8801XXXXXXXXX or 01XXXXXXXXX)'
      ),
    email: z.string().email().optional().or(z.literal('')),
    orderId: z.string().optional().nullable(),
    branchId: z.union([z.string(), z.number()]).optional().nullable(),
    branchName: z.string().optional(),
    foodQuality: z.number().min(1).max(5),
    serviceSpeed: z.number().min(1).max(5),
    staffBehavior: z.number().min(1).max(5),
    riderId: z.string().optional().nullable(),
    riderName: z.string().optional().nullable(),
    riderRating: z.number().min(0).max(5).optional().nullable(),
    riderFeedback: z.string().optional().nullable(),
    likedMost: z.string().optional(),
    improvements: z.string().optional(),
    comments: z.string().optional(),
    heardFrom: z.string().min(1, 'Marketing source is required'),
    visitAgain: z.string().min(1, 'Retention answer is required'),
  }),
});
