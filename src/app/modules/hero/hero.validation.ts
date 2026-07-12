import { z } from 'zod';

const featuredFoodId = z.union([z.coerce.number(), z.null()]).optional();

export const createHeroValidationSchema = z.object({
  body: z.object({
    type: z.enum(['promo', 'ambient']).optional(),
    title: z.string().min(1, 'Title is required'),
    subtitle: z.string().optional(),
    image: z.string().optional(),
    cta: z.string().nullable().optional(),
    featuredFoodId,
    offerText: z.string().nullable().optional(),
  }),
});

export const updateHeroValidationSchema = z.object({
  body: z.object({
    type: z.enum(['promo', 'ambient']).optional(),
    title: z.string().min(1).optional(),
    subtitle: z.string().optional(),
    image: z.string().optional(),
    cta: z.string().nullable().optional(),
    featuredFoodId,
    offerText: z.string().nullable().optional(),
  }),
});
