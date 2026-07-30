import { z } from 'zod';

const variation = z.object({ 
  name: z.string(), 
  price: z.coerce.number(), 
  image: z.string().optional().nullable(), 
});

export const createFoodValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    price: z.coerce.number().nonnegative(),
    order: z.coerce.number().optional(),
    image: z.string().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    description: z.string().optional(),
    popular: z.boolean().optional(),
    isAdminFeatured: z.boolean().optional(),
    featuredOrder: z.coerce.number().nullable().optional(),
    discountType: z.enum(['percent', 'flat']).optional(),
    discountPct: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    
    // 🎯 ডিসকাউন্ট টাইমার ভ্যালিডেশন যুক্ত করা হলো:
    discountStartDate: z.string().nullable().optional(),
    discountEndDate: z.string().nullable().optional(),

    branchIds: z.array(z.coerce.number()).optional(),
    branches: z.array(z.coerce.number()).optional(), // frontend alias
    branchPrices: z.record(z.coerce.number()).optional(),
    variantLabel: z.string().optional(),
    variations: z.array(variation).optional(),
  }),
});

export const updateFoodValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    price: z.coerce.number().nonnegative().optional(),
    order: z.coerce.number().optional(),
    image: z.string().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    description: z.string().optional(),
    popular: z.boolean().optional(),
    isAdminFeatured: z.boolean().optional(),
    featuredOrder: z.coerce.number().nullable().optional(),
    discountType: z.enum(['percent', 'flat']).optional(),
    discountPct: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),

    // 🎯 ডিসকাউন্ট টাইমার ভ্যালিডেশন যুক্ত করা হলো:
    discountStartDate: z.string().nullable().optional(),
    discountEndDate: z.string().nullable().optional(),

    branchIds: z.array(z.coerce.number()).optional(),
    branches: z.array(z.coerce.number()).optional(),
    branchPrices: z.record(z.coerce.number()).optional(),
    variantLabel: z.string().optional(),
    variations: z.array(variation).optional(),
  }),
});

// 🎯 Drag & Drop Reorder Validation Schemas
export const reorderFoodsValidationSchema = z.object({
  body: z.object({
    foodIds: z.array(z.union([z.number(), z.string()])).min(1, 'foodIds must be an array with at least one item'),
  }),
});

export const reorderCategoriesValidationSchema = z.object({
  body: z.object({
    categories: z.array(z.string()).min(1, 'categories must be an array with at least one item'),
  }),
});