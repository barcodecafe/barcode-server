import { z } from 'zod';

// slug is optional on input — the service derives one from the name when absent.
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
  .optional();

export const createBrandValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    slug,
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
    order: z.coerce.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateBrandValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    slug,
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
    order: z.coerce.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

// 🎯 FIX: brandIds, orderedIds, বা ids—যে কোনো নামের অ্যারে সাপোর্ট করার জন্য আপডেট
export const reorderBrandsValidationSchema = z.object({
  body: z
    .object({
      brandIds: z.array(z.union([z.string(), z.number()])).optional(),
      orderedIds: z.array(z.union([z.string(), z.number()])).optional(),
      ids: z.array(z.union([z.string(), z.number()])).optional(),
    })
    .refine(
      (data) => (data.brandIds?.length || 0) > 0 || (data.orderedIds?.length || 0) > 0 || (data.ids?.length || 0) > 0,
      {
        message: 'At least one array of brand IDs (brandIds, orderedIds, or ids) must be provided',
      }
    ),
});