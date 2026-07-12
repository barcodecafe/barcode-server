import { z } from 'zod';

export const createRegionValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    image: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const updateRegionValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    image: z.string().optional(),
    description: z.string().optional(),
  }),
});
