import { z } from 'zod';

const features = z.union([z.array(z.string()), z.string()]).optional(); // array বা comma-string
const deliveryZone = z.object({ name: z.string().min(1), charge: z.coerce.number().nonnegative() });

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
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    brandId: z.number().int().nullable().optional(),
    regionId: z.number().int().nullable().optional(),
    deliveryZones: z.array(deliveryZone).optional(),
    defaultDeliveryCharge: z.coerce.number().nonnegative().optional(),
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
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    brandId: z.number().int().nullable().optional(),
    regionId: z.number().int().nullable().optional(),
    deliveryZones: z.array(deliveryZone).optional(),
    defaultDeliveryCharge: z.coerce.number().nonnegative().optional(),
  }),
});
