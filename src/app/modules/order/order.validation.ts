import { z } from 'zod';

export const PaymentMethodEnum = z.enum([
  'cod',
  'sslcommerz',
  'COD',
  'SSLCOMMERZ',
  'BKASH',
  'NAGAD',
  'CARD',
]);

// 🎯 FIX: 'Ready to Pick' সহ সমস্ত প্রয়োজনীয় ফরম্যাট এখানে যুক্ত করা হলো
export const OrderStatusEnum = z.enum([
  'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REJECTED', 'ACCEPTED', 'CONFIRMED', 'PREPARING', 'READY TO PICK', 'OUT FOR DELIVERY',
  'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected', 'accepted', 'confirmed', 'preparing', 'ready to pick', 'out for delivery',
  'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Rejected', 'Accepted', 'Confirmed', 'Preparing', 'Ready to Pick', 'Out for Delivery',
  'Awaiting Payment', 'awaiting payment', 'AWAITING PAYMENT', 'Placed', 'placed', 'PLACED'
]);

export const createOrderValidationSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.coerce.number({ invalid_type_error: 'Item ID must be a number' }),
          quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
          selectedSize: z.string().nullable().optional(),
          // 🎯 অফার ও অরিজিনাল প্রাইস ফিল্ডগুলো ভ্যালিডেশনে অপশনাল হিসেবে যুক্ত করা হলো
          offerType: z.string().nullable().optional(),
          originalPrice: z.coerce.number().optional(),
          price: z.coerce.number().optional(),     // 🎯 ভ্যালিডেশনে প্রাইস পাস করার জন্য
          branchId: z.coerce.number().optional(),  // 🎯 ব্রাঞ্চ আইডি পাস করার জন্য
        })
      )
      .min(1, 'Order must contain at least one item'),

    regionId: z.coerce.number().refine((n) => n > 0, 'Please select your delivery region'),
    branchId: z.coerce.number().optional(),
    couponCode: z.string().trim().optional(),
    pointsToRedeem: z.coerce.number().int().min(0).optional(),

    deliveryArea: z.string().optional(),
    deliveryAddress: z.string().min(1, 'Delivery address is required').optional(),

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
// back to previous