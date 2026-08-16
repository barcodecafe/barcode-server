import { z } from 'zod';

export const createAddonValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Addon name is required'),
    price: z.coerce.number().min(0, 'Price must be 0 or greater'),
    group: z.string().min(1, 'Group / category is required'),
    isAvailable: z.boolean().optional(),
    order: z.number().optional(),
  }),
});

export const updateAddonValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    price: z.coerce.number().min(0).optional(),
    group: z.string().min(1).optional(),
    isAvailable: z.boolean().optional(),
    order: z.number().optional(),
  }),
});
