import { z } from 'zod';

export const createBrandValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Brand name is required' }).min(1),
    slug: z.string().optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    logoLight: z.string().optional(),
    logoDark: z.string().optional(),
    cover: z.string().optional(),
    website: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().optional(),
    contactAddress: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateBrandValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    logoLight: z.string().optional(),
    logoDark: z.string().optional(),
    cover: z.string().optional(),
    website: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().optional(),
    contactAddress: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const reorderBrandsValidationSchema = z.object({
  body: z.object({
    brandIds: z.array(z.union([z.string(), z.number()])).optional(),
    orderedIds: z.array(z.union([z.string(), z.number()])).optional(),
    ids: z.array(z.union([z.string(), z.number()])).optional(),
  }),
});