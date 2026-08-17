import { z } from 'zod';

export const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required').trim(),
    order: z.number().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name cannot be empty').trim().optional(),
    order: z.number().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const reorderCategoriesValidationSchema = z.object({
  body: z.object({
    categories: z
      .array(z.string())
      .min(1, 'categories must be an array with at least one item'),
  }),
});
