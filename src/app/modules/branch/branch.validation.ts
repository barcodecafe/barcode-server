import { z } from 'zod';

const features = z.union([z.array(z.string()), z.string()]).optional(); // array বা comma-string

export const createBranchValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
    contact: z.string().min(1, 'Contact is required'),
    hours: z.string().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    image: z.string().optional(),
    manager: z.string().optional(),
    capacity: z.coerce.number().optional(),
    features,
  }),
});

export const updateBranchValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    contact: z.string().min(1).optional(),
    hours: z.string().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    image: z.string().optional(),
    manager: z.string().optional(),
    capacity: z.coerce.number().optional(),
    features,
  }),
});
