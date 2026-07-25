import { z } from 'zod';

// 🎯 FIX 1: ফ্রন্টএন্ড থেকে পাঠানো ছোট হাতের ('cod', 'sslcommerz') এবং বড় হাতের উভয় মানই সাপোর্ট করবে
export const PaymentMethodEnum = z.enum([
  'cod',
  'sslcommerz',
  'COD',
  'SSLCOMMERZ',
  'BKASH',
  'NAGAD',
  'CARD',
]);

export const OrderStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

export const createOrderValidationSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.coerce.number({ invalid_type_error: 'Item ID must be a number' }),
          quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
          selectedSize: z.string().nullable().optional(),
        })
      )
      .min(1, 'Order must contain at least one item'),

    regionId: z.coerce.number().refine((n) => n > 0, 'Please select your delivery region'),
    branchId: z.coerce.number().optional(),
    couponCode: z.string().trim().optional(),
    pointsToRedeem: z.coerce.number().int().min(0).optional(),

    deliveryArea: z.string().optional(),
    deliveryAddress: z.string().min(1, 'Delivery address is required').optional(),
    
    // 🎯 FIX 2: '+880' সহ কিংবা সরাসরি '01' দিয়ে শুরু হওয়া সব বিডি মোবাইল নম্বর এলাউ করবে
    deliveryPhone: z
      .string()
      .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, 'Please provide a valid Bangladeshi phone number')
      .optional(),

    paymentMethod: PaymentMethodEnum.optional(),
  }),
});

export const updateStatusValidationSchema = z.object({
  body: z.object({
    status: OrderStatusEnum,
  }),
});

export const addMessageValidationSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Message text is required'),
    senderName: z.string().optional(),
  }),
});

// Infer Types for use in Controllers / Services
export type CreateOrderInput = z.infer<typeof createOrderValidationSchema>['body'];
export type UpdateStatusInput = z.infer<typeof updateStatusValidationSchema>['body'];
export type AddMessageInput = z.infer<typeof addMessageValidationSchema>['body'];