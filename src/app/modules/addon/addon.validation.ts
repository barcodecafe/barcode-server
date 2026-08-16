import { z } from 'zod';

const addonItemValidationSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  price: z.number().min(0, 'Price must be 0 or higher'),
  isAvailable: z.boolean().optional(),
});

export const createAddonGroupValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Group title is required'),
    items: z.array(addonItemValidationSchema).default([]),
    order: z.number().optional(),
  }),
});

export const updateAddonGroupValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Group title is required').optional(),
    items: z.array(addonItemValidationSchema).optional(),
    order: z.number().optional(),
  }),
});
