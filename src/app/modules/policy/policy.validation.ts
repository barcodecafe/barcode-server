import { z } from 'zod';

export const updatePolicyHeaderValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    lastUpdated: z.string().optional(),
  }),
});

export const addPolicySectionValidationSchema = z.object({
  body: z.object({
    icon: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    order: z.number().optional(),
  }),
});

export const updatePolicySectionValidationSchema = z.object({
  body: z.object({
    icon: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    order: z.number().optional(),
  }),
});

export const reorderPolicySectionsValidationSchema = z.object({
  body: z.object({
    sectionIds: z.array(z.string()).min(1, 'sectionIds array is required'),
  }),
});
