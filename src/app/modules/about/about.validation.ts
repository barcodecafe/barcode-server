import { z } from 'zod';

export const updateCoreValidationSchema = z.object({
  body: z.object({
    mission: z.string().optional(),
    vision: z.string().optional(),
    stats: z
      .object({
        founded: z.string().optional(),
        branchesCount: z.string().optional(),
        standard: z.string().optional(),
      })
      .optional(),
  }),
});

export const addTimelineValidationSchema = z.object({
  body: z.object({
    year: z.string().min(1, 'Year is required'),
    title: z.string().min(1, 'Title is required'),
    desc: z.string().optional(),
  }),
});

export const updateTimelineValidationSchema = z.object({
  body: z.object({
    year: z.string().optional(),
    title: z.string().optional(),
    desc: z.string().optional(),
  }),
});

export const addLeadershipValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    role: z.string().optional(),
    image: z.string().optional(),
    bio: z.string().optional(),
  }),
});

export const updateLeadershipValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    image: z.string().optional(),
    bio: z.string().optional(),
  }),
});
