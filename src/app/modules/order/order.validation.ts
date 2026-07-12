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
    branchId: z.coerce.number().refine((n) => n > 0, 'A valid branchId is required'),
    couponCode: z.string().optional(),
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
