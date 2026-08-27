import { z } from 'zod';

export const createReviewValidationSchema = z.object({
  body: z.object({
    foodId: z.union([
      z.coerce.number().positive(),
      z.string().min(1, 'Valid foodId is required'),
    ]),
    rating: z.coerce
      .number()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional().default(''),
  }),
});
