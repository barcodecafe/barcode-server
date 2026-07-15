import { z } from 'zod';

export const createOrderValidationSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.coerce.number(),
          quantity: z.coerce.number().int().min(1),
          selectedSize: z.string().nullable().optional(),
        })
      )
      .min(1, 'Order must contain at least one item'),
    // Ordering is region-based now: a valid regionId is required, branchId optional.
    regionId: z.coerce.number().refine((n) => n > 0, 'Please select your delivery region'),
    branchId: z.coerce.number().optional(),
    couponCode: z.string().optional(),
    pointsToRedeem: z.coerce.number().int().min(0).optional(), // loyalty redeem (1 pt = ৳1)
    deliveryArea: z.string().optional(), // checkout-এ বাছা ডেলিভারি অঞ্চল (charge এর ভিত্তি)
    deliveryAddress: z.string().optional(), // per-order ডেলিভারি ঠিকানা
    deliveryPhone: z.string().optional(), // per-order ফোন
    paymentMethod: z.string().optional(),
  }),
});

export const updateStatusValidationSchema = z.object({
  body: z.object({
    status: z.string().min(1, 'status is required'),
  }),
});

export const addMessageValidationSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Message text is required'),
    senderName: z.string().optional(),
  }),
});
