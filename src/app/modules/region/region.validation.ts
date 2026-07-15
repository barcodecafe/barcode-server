import { z } from 'zod';

const deliveryZoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required'),
  charge: z.coerce.number().min(0),
});

export const createRegionValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    image: z.string().optional(),
    description: z.string().optional(),
    deliveryZones: z.array(deliveryZoneSchema).optional(),
    defaultDeliveryCharge: z.coerce.number().min(0).optional(),
  }),
});

export const updateRegionValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    image: z.string().optional(),
    description: z.string().optional(),
    deliveryZones: z.array(deliveryZoneSchema).optional(),
    defaultDeliveryCharge: z.coerce.number().min(0).optional(),
  }),
});
