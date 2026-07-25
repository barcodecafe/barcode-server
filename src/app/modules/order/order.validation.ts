import { z } from 'zod';

// প্রয়োজন অনুযায়ী আপনার অ্যাপের Enum-গুলো নির্দিষ্ট করতে পারেন
export const PaymentMethodEnum = z.enum(['COD', 'BKASH', 'NAGAD', 'CARD']);
export const OrderStatusEnum = z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);

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
    deliveryPhone: z
      .string()
      .regex(/^01[3-9]\d{8}$/, 'Please provide a valid Bangladeshi phone number')
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